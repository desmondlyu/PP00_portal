import { createAnalysisAccumulator, mergeAnalysisReports, type AnalysisAccumulator, type AnalysisReport } from '../lib/analysis';
import { forEachRawdataTextMember } from '../lib/tar';
import { parseTestTimeText } from '../lib/testTimeParser';
import type { WorkerRequest, WorkerResponse } from './protocol';

export type { WorkerResponse } from './protocol';

export async function processWorkerRequest(
  request: Extract<WorkerRequest, { type: 'start' }>,
  post: (message: WorkerResponse) => void,
  isCancelled: () => boolean
): Promise<void> {
  const accumulators = new Map<string, AnalysisAccumulator>();

  for (let index = 0; index < request.files.length; index += 1) {
    const file = request.files[index];
    if (isCancelled()) {
      post({ type: 'cancelled', jobId: request.jobId });
      return;
    }

    post({
      type: 'progress',
      jobId: request.jobId,
      phase: 'extracting',
      completed: index,
      total: request.files.length,
      fileName: file.name
    });

    post({
      type: 'progress',
      jobId: request.jobId,
      phase: 'parsing',
      completed: index,
      total: request.files.length,
      fileName: file.name
    });

    const product = request.products[index] || 'Unknown';
    const station = request.stations[index] || 'Unknown';
    const key = `${product}\x00${station}`;
    const accumulator = accumulators.get(key) ?? createAnalysisAccumulator(
      request.metadata?.[index] ?? { product, process: 'N/A', size: 'N/A', voltage: 'N/A' },
      station
    );
    accumulators.set(key, accumulator);

    try {
      await forEachRawdataTextMember(file, (member) => {
        if (isCancelled()) {
          throw new DOMException('Analysis cancelled', 'AbortError');
        }
        const parsed = parseTestTimeText(member.text, member.name);
        accumulator.add(request.analyzeAllTouchdowns ? parsed : parsed.filter((row) => row.touchdown === 'TD_1'));
      });
    } catch (error) {
      if (isCancelled()) {
        post({ type: 'cancelled', jobId: request.jobId });
        return;
      }
      post({
        type: 'failed',
        jobId: request.jobId,
        error: {
          code: 'ANALYSIS_FAILED',
          message: error instanceof Error ? error.message : '無法解析 TAR 檔案',
          fileName: file.name
        }
      });
      return;
    }
  }

  post({
    type: 'progress',
    jobId: request.jobId,
    phase: 'analyzing',
    completed: request.files.length,
    total: request.files.length
  });

  // ponytail: only compact summary data crosses the Worker boundary
  const reports: AnalysisReport[] = [];
  for (const [key, accumulator] of accumulators) {
    reports.push(accumulator.build());
  }

  const report = reports.length === 1 ? reports[0] : mergeAnalysisReports(reports);
  post({ type: 'completed', jobId: request.jobId, report });
}

type WorkerScope = {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage(message: WorkerResponse): void;
  importScripts?: unknown;
};

const workerScope = globalThis as unknown as WorkerScope;
const hasWorkerScope = typeof workerScope.importScripts === 'function';
const cancelledJobs = new Set<string>();

if (hasWorkerScope) {
  workerScope.onmessage = ({ data }: MessageEvent<WorkerRequest>) => {
    if (data.type === 'cancel') {
      cancelledJobs.add(data.jobId);
      return;
    }

    void processWorkerRequest(
      data,
      (message) => workerScope.postMessage(message),
      () => cancelledJobs.has(data.jobId)
    ).finally(() => cancelledJobs.delete(data.jobId));
  };
}
