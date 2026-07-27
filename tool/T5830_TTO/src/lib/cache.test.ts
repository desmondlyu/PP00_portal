import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { clearSummaries, listSummaries, saveSummary } from './cache';

afterEach(async () => {
  await clearSummaries();
});

describe('summary cache', () => {
  it('removes every saved summary when cleared', async () => {
    await saveSummary('EAG119', {
      key: 'EAG119',
      createdAt: '2026-07-24T08:00:00.000Z',
      masterSummary: []
    });

    expect(await listSummaries()).toHaveLength(1);

    await clearSummaries();

    expect(await listSummaries()).toEqual([]);
  });
});
