import { openDB, type DBSchema } from 'idb';
import type { MasterSummaryRow } from '../types/analysis';

export type CachedSummary = {
  key: string;
  createdAt: string;
  masterSummary: MasterSummaryRow[];
};

interface AteInsightCache extends DBSchema {
  summaries: {
    key: string;
    value: CachedSummary;
  };
}

const database = openDB<AteInsightCache>('ate-insight', 1, {
  upgrade(db) {
    db.createObjectStore('summaries', { keyPath: 'key' });
  }
});

export async function saveSummary(key: string, value: CachedSummary) {
  await (await database).put('summaries', { ...value, key });
}

export async function listSummaries() {
  return (await database).getAll('summaries');
}

export async function clearSummaries() {
  await (await database).clear('summaries');
}
