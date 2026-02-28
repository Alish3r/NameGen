#!/usr/bin/env node
/**
 * CLI for brandable name generator.
 * Usage: namegen [generate] | namegen probe ...
 */

import { generateNames } from '../generator.js';
import { probeDomains } from '../domain-probe/index.js';
import { Category } from '../domain-probe/types.js';

const args = process.argv.slice(2);
const command = args[0] === 'probe' ? 'probe' : 'generate';

if (command === 'probe') {
  runProbe(args.slice(1));
} else {
  runGenerate(args);
}

function parseGenerateArgs(argv: string[]): {
  count: number;
  length: 4 | 5 | 'both';
  seed?: number;
  minScore: number;
  cryptoBias: number;
  format: 'table' | 'json' | 'csv';
  includeY: boolean;
} {
  const result = {
    count: 50,
    length: 'both' as 4 | 5 | 'both',
    seed: undefined as number | undefined,
    minScore: 60,
    cryptoBias: 0.5,
    format: 'table' as 'table' | 'json' | 'csv',
    includeY: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--count' && argv[i + 1]) {
      result.count = parseInt(argv[++i], 10) || 50;
    } else if (arg === '--length' && argv[i + 1]) {
      const val = argv[++i];
      if (val === '4' || val === '5') result.length = parseInt(val, 10) as 4 | 5;
      if (val === 'both') result.length = 'both';
    } else if (arg === '--seed' && argv[i + 1]) {
      result.seed = parseInt(argv[++i], 10);
    } else if (arg === '--minScore' && argv[i + 1]) {
      result.minScore = parseInt(argv[++i], 10) || 60;
    } else if (arg === '--cryptoBias' && argv[i + 1]) {
      result.cryptoBias = Math.max(0, Math.min(1, parseFloat(argv[++i]) || 0.5));
    } else if (arg === '--csv') {
      result.format = 'csv';
    } else if (arg === '--json') {
      result.format = 'json';
    } else if (arg === '--includeY') {
      result.includeY = true;
    } else if (arg === '--help' || arg === '-h') {
      printGenerateHelp();
      process.exit(0);
    }
  }
  return result;
}

function printGenerateHelp() {
  console.log(`
namegen - Brandable name generator (crypto/fintech vibe)

Usage: namegen [options]

Options:
  --count <n>       Number of names to generate (default: 50)
  --length <4|5|both>  Name length (default: both)
  --seed <n>        Random seed for deterministic output
  --minScore <n>    Minimum pronounceability score 0-100 (default: 60)
  --cryptoBias <0-1>  Crypto letter weight 0-1 (default: 0.5)
  --includeY        Include 'y' as vowel
  --json            Output as JSON
  --csv             Output as CSV
  --help, -h        Show this help

Probe domains: namegen probe --count 100 --length 4 --tlds com,net,io --concurrency 30 --json
`);
}

function formatGenerateTable(names: { name: string; score: number; patternUsed: string; reasons: string[] }[]): string {
  if (names.length === 0) return '';
  const maxName = Math.max(6, ...names.map((n) => n.name.length));
  const header = `${'Name'.padEnd(maxName)}  Score  Pattern  Reasons`;
  const separator = '-'.repeat(header.length);
  const rows = names.map(
    (n) =>
      `${n.name.padEnd(maxName)}  ${String(n.score).padStart(2)}    ${n.patternUsed.padEnd(6)}  ${(n.reasons[0] || '').slice(0, 50)}`
  );
  return [header, separator, ...rows].join('\n');
}

function formatGenerateCsv(names: { name: string; score: number; patternUsed: string; reasons: string[] }[]): string {
  const header = 'name,score,pattern,reasons';
  const rows = names.map(
    (n) => `"${n.name}",${n.score},"${n.patternUsed}","${n.reasons.join('; ').replace(/"/g, '""')}"`
  );
  return [header, ...rows].join('\n');
}

function runGenerate(argv: string[]) {
  const opts = parseGenerateArgs(argv);
  const { names, warning } = generateNames({
    count: opts.count,
    length: opts.length,
    seed: opts.seed,
    minScore: opts.minScore,
    includeY: opts.includeY,
    cryptoBias: opts.cryptoBias,
  });

  if (warning) {
    console.error('Warning:', warning);
  }

  if (opts.format === 'json') {
    console.log(JSON.stringify({ names, warning }, null, 2));
  } else if (opts.format === 'csv') {
    console.log(formatGenerateCsv(names));
  } else {
    console.log(formatGenerateTable(names));
  }
}

function parseProbeArgs(argv: string[]): {
  count: number;
  length: 4 | 5 | 'both';
  tlds: string[];
  concurrency: number;
  seed?: number;
  minScore: number;
  format: 'table' | 'json' | 'csv';
} {
  const result = {
    count: 100,
    length: 'both' as 4 | 5 | 'both',
    tlds: ['com', 'net', 'io'],
    concurrency: 30,
    seed: undefined as number | undefined,
    minScore: 60,
    format: 'table' as 'table' | 'json' | 'csv',
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--count' && argv[i + 1]) {
      result.count = parseInt(argv[++i], 10) || 100;
    } else if (arg === '--length' && argv[i + 1]) {
      const val = argv[++i];
      if (val === '4' || val === '5') result.length = parseInt(val, 10) as 4 | 5;
      if (val === 'both') result.length = 'both';
    } else if (arg === '--tlds' && argv[i + 1]) {
      result.tlds = argv[++i].split(',').map((t) => t.trim().replace(/^\./, ''));
    } else if (arg === '--concurrency' && argv[i + 1]) {
      result.concurrency = Math.max(1, parseInt(argv[++i], 10) || 25);
    } else if (arg === '--seed' && argv[i + 1]) {
      result.seed = parseInt(argv[++i], 10);
    } else if (arg === '--minScore' && argv[i + 1]) {
      result.minScore = parseInt(argv[++i], 10) || 60;
    } else if (arg === '--csv') {
      result.format = 'csv';
    } else if (arg === '--json') {
      result.format = 'json';
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
namegen probe - Generate names and probe domain availability

Usage: namegen probe [options]

Options:
  --count <n>       Number of names to generate (default: 100)
  --length <4|5|both>  Name length (default: both)
  --tlds <list>     TLDs to check, comma-separated (default: com,net,io)
  --concurrency <n> Concurrent probes (default: 30)
  --seed <n>        Random seed for name generation
  --minScore <n>    Min articulation score for names (default: 60)
  --json            Output as JSON
  --csv             Output as CSV
  --help, -h        Show this help
`);
      process.exit(0);
    }
  }
  return result;
}

async function runProbe(argv: string[]) {
  const opts = parseProbeArgs(argv);

  const { names } = generateNames({
    count: opts.count,
    length: opts.length,
    seed: opts.seed,
    minScore: opts.minScore,
    cryptoBias: 0.5,
    includeY: false,
  });

  const domains: string[] = [];
  for (const n of names) {
    for (const tld of opts.tlds) {
      domains.push(`${n.name}.${tld}`);
    }
  }

  console.error(`Probing ${domains.length} domains (${opts.concurrency} concurrent)...`);

  const results = await probeDomains(domains, {
    concurrency: opts.concurrency,
    dnsTimeoutMs: 1500,
    httpTimeoutMs: 2500,
    maxRedirects: 3,
    retries: 1,
  });

  const byCategory: Record<string, number> = {};
  for (const r of results) {
    byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
  }

  const summary = {
    total: results.length,
    byCategory: byCategory,
  };

  if (opts.format === 'json') {
    console.log(JSON.stringify({ summary, results }, null, 2));
  } else if (opts.format === 'csv') {
    const header = 'domain,category,confidence,dns_status,http_status,reasons';
    const rows = results.map(
      (r) =>
        `"${r.domain}",${r.category},${r.confidence.toFixed(2)},${r.dns.status},${r.http.status ?? ''},"${r.reasons.join('; ').replace(/"/g, '""')}"`
    );
    console.log([header, ...rows].join('\n'));
  } else {
    console.log('\nSummary:');
    for (const [cat, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${cat}: ${count}`);
    }
    console.log('\nResults:');
    const header = 'Domain'.padEnd(35) + 'Category'.padEnd(22) + 'Conf  DNS    HTTP   Reasons';
    const sep = '-'.repeat(100);
    const rows = results.map(
      (r) =>
        `${r.domain.padEnd(35)}${r.category.padEnd(22)}${r.confidence.toFixed(2)}  ${r.dns.status.padEnd(6)}${String(r.http.status ?? '-').padEnd(6)}${(r.reasons[0] || '').slice(0, 40)}`
    );
    console.log([header, sep, ...rows].join('\n'));
  }
}
