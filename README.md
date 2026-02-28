# NameGen – Brandable Name Generator

A production-quality generator for 4–5 letter pronounceable, meaningless brand names with a slight crypto/fintech vibe. No external APIs, no LLM, no network required. Fully deterministic when a seed is provided.

## Quick Start

```bash
npm install
cd web && npm install && cd ..
npm test
npm run cli -- --count 100 --length 4 --seed 123 --minScore 70
npm run cli -- probe --count 20 --length 4 --tlds com,net,io   # Domain probe
npm run build:lib && npm run dev   # Web UI (build lib first for probe API)
```

## Project Structure

```
├── src/
│   ├── config.ts      # Letter pools, patterns, weights
│   ├── prng.ts        # Seeded PRNG (mulberry32)
│   ├── blacklist.ts   # Wordlist loading
│   ├── scorer.ts      # Pronounceability scoring
│   ├── generator.ts   # Core generateNames()
│   ├── domain-probe/  # Stage 1: Domain probe
│   │   ├── types.ts
│   │   ├── dnsProbe.ts
│   │   ├── httpProbe.ts
│   │   ├── fingerprint.ts
│   │   ├── classify.ts
│   │   └── index.ts
│   ├── index.ts       # Public API
│   └── cli/
│       └── index.ts   # CLI entry
├── wordlist/
│   ├── english-blacklist.txt   # Common words (swap for larger)
│   └── crypto-blacklist.txt   # Crypto brand terms
├── web/               # Vite + React UI
├── tests/
│   └── generator.test.ts
└── package.json
```

## CLI

```bash
npm run cli -- [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--count <n>` | 50 | Number of names |
| `--length <4\|5\|both>` | both | Name length |
| `--seed <n>` | (random) | Random seed for deterministic output |
| `--minScore <n>` | 60 | Minimum score 0–100 |
| `--cryptoBias <0-1>` | 0.5 | Weight for x/v/z/k/r/n/l |
| `--includeY` | false | Include 'y' as vowel |
| `--json` | | Output as JSON |
| `--csv` | | Output as CSV |

## Public API

```ts
import { generateNames } from 'namegen';

const { names, warning } = generateNames({
  count: 50,
  length: 4 | 5 | 'both',
  seed: 123,           // optional, deterministic
  minScore: 60,
  includeY: false,
  cryptoBias: 0.5,
  patterns: { 4: [...], 5: [...] },  // optional override
  blacklist: mySet,    // optional for browser
});

// names: { name, score, reasons, patternUsed }[]
```

## Scoring (0–100)

| Factor | Effect |
|--------|--------|
| **Vowel/consonant alternation** | +15 strong, +8 good, -10 weak |
| **Crypto vibe** | +4 per favored letter (x,v,z,k,r,n,l), up to +15 |
| **Cluster penalty** | -30 disallowed (xq, q*, vv, jj, hh, ww) |
| **Triple letter** | -20 |
| **Repeated bigram** | -12 |
| **Visually confusing** (ii, oo, lll) | -15 |
| **Ends with h/q** | -15 |
| **5-letter consonant diversity** | +5 if ≥2 distinct, -8 otherwise |

## Phonotactic Patterns

- **4 letters:** CVCV, CVVC, VCVC, VCCV  
- **5 letters:** CVCVC, CVCCV, VCCVC  

C = consonant, V = vowel. Letter pools are configurable.

## Wordlist / Blacklist

- Replace `wordlist/english-blacklist.txt` with a larger list (e.g. top 10k English words) for stronger filtering.
- Format: one word per line, case-insensitive.
- `wordlist/crypto-blacklist.txt` contains btc, eth, defi, etc.
- The web app bundles these at build time. The CLI uses file-based loading.

## Building

```bash
npm run build       # Compile library + web app
npm run build:lib   # Compile library only
```

## Versioning & Releases

This project uses [Semantic Versioning](https://semver.org/) (MAJOR.MINOR.PATCH). Release notes live in [CHANGELOG.md](CHANGELOG.md).

### Creating a release

1. Update `CHANGELOG.md`: move items from `[Unreleased]` into a new `[X.Y.Z]` section with today's date.
2. Bump version: `npm run version:patch` (or `version:minor` / `version:major`).
3. Commit and tag: `git add -A && git commit -m "chore: release vX.Y.Z" && git tag vX.Y.Z`
4. Push with tags: `git push origin main && git push origin vX.Y.Z`

If the repo is on GitHub, pushing a `v*` tag triggers the release workflow: it builds the project and creates a GitHub Release with notes from the changelog.

### Syncing with GitHub

1. Create a new repository on GitHub (do not initialize with README).
2. In this project: `git init && git add . && git commit -m "Initial commit"`
3. Add remote: `git remote add origin https://github.com/OWNER/REPO.git`
4. Update `CHANGELOG.md` links: replace `OWNER/REPO` with your GitHub username and repo name.
5. Push: `git branch -M main && git push -u origin main`

## Tests

```bash
npm test            # Vitest
npm run test:watch  # Watch mode
```

---

## Stage 1: Domain Probe

Probe generated names as FQDNs to classify DNS/HTTP status and detect parked/for-sale pages.

### What it does

- **DNS probe**: NXDOMAIN / NO_ANSWER / RESOLVES; captures A, AAAA, CNAME, NS, MX
- **HTTP probe**: Only when DNS resolves; tries HTTPS then HTTP; captures status, redirects, content-type
- **Fingerprint**: SHA256 hash of normalized HTML sample (first 64KB); no full HTML stored
- **Classifier**: NO_DOMAIN, PARKED_OR_FOR_SALE, ACTIVE_SITE, INCONCLUSIVE + confidence 0–1

### API

```ts
import { probeDomains } from 'namegen';

const results = await probeDomains(['example.com', 'test.net'], {
  concurrency: 25,
  dnsTimeoutMs: 1500,
  httpTimeoutMs: 2500,
  maxRedirects: 3,
  retries: 1,
  userAgent: 'NameGen-DomainProbe/1.0',
});
// results: { domain, dns, http, category, confidence, reasons }[]
```

### CLI

```bash
npm run cli -- probe --count 100 --length 4 --tlds com,net,io --concurrency 30 --json
```

### Web UI

Click **“Check website activity”** to probe the top 50 generated names × `.com` `.net` `.io`. Results show category, confidence, DNS/HTTP status with filter and sort.

---

## Extending

- **Registrar pricing:** Stage 2 (future); domain probe is prerequisite.
- **Patterns:** Override via `patterns: { 4: [...], 5: [...] }` in options.
- **Letter pools:** Modify `config.ts` or add options for custom vowels/consonants.
