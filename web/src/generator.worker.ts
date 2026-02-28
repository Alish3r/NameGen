import { generateNames } from '@/generator';
import { createBlacklistFromText } from '@/blacklist-browser';
import englishBlacklistRaw from '../../wordlist/english-blacklist.txt?raw';
import cryptoBlacklistRaw from '../../wordlist/crypto-blacklist.txt?raw';

const isBlacklisted = createBlacklistFromText(englishBlacklistRaw, cryptoBlacklistRaw);

export type WorkerParams = {
  batchIndex: number;
  batchSize: number;
  baseSeed?: number;
  length: 4 | 5 | 'both';
  minScore: number;
  cryptoBias: number;
  includeY: boolean;
};

export type WorkerResult = {
  batchIndex: number;
  names: { name: string; score: number; reasons: string[]; patternUsed: string }[];
};

self.onmessage = (e: MessageEvent<WorkerParams>) => {
  const { batchIndex, batchSize, baseSeed, length, minScore, cryptoBias, includeY } = e.data;
  const seed = baseSeed !== undefined ? baseSeed + batchIndex * 10000 : undefined;
  const { names } = generateNames({
    count: batchSize,
    length,
    seed,
    minScore,
    cryptoBias,
    includeY,
    blacklist: isBlacklisted,
  });
  self.postMessage({ batchIndex, names } satisfies WorkerResult);
};
