import { describe, expect, it } from 'vitest';
import { processWorkerRequest, type WorkerResponse } from './tarAnalysis.worker';
import { makeTar } from '../test/makeTar';

const validTarFile = makeTar([
  ['home/winbond/rawdata/log_S0001.txt', ':001: <<< Test Time >>>, phase, READ, 0.1']
]);

describe('processWorkerRequest', () => {
  it('emits progress before the completed report', async () => {
    const messages: WorkerResponse[] = [];

    await processWorkerRequest(
      { type: 'start', jobId: 'job-1', files: [validTarFile], products: ['EAG119'], stations: ['S1P1'] },
      (message) => messages.push(message),
      () => false
    );

    expect(messages.some((message) => message.type === 'progress')).toBe(true);
    expect(messages[messages.length - 1]?.type).toBe('completed');
  });

  it('emits cancelled instead of completed when cancellation is requested', async () => {
    const messages: WorkerResponse[] = [];

    await processWorkerRequest(
      { type: 'start', jobId: 'job-1', files: [validTarFile], products: ['EAG119'], stations: ['S1P1'] },
      (message) => messages.push(message),
      () => true
    );

    expect(messages).toContainEqual({ type: 'cancelled', jobId: 'job-1' });
    expect(messages.some((message) => message.type === 'completed')).toBe(false);
  });
});
