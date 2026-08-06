import type { AnalysisReport, ProductMetadata } from '../lib/analysis';

export type WorkerRequest =
  | { type: 'start'; jobId: string; files: File[]; products: string[]; stations: string[]; metadata?: ProductMetadata[]; analyzeAllTouchdowns?: boolean }
  | { type: 'cancel'; jobId: string };

export type WorkerResponse =
  | {
      type: 'progress';
      jobId: string;
      phase: 'extracting' | 'parsing' | 'analyzing';
      completed: number;
      total: number;
      fileName?: string;
    }
  | { type: 'completed'; jobId: string; report: AnalysisReport }
  | { type: 'cancelled'; jobId: string }
  | { type: 'failed'; jobId: string; error: { code: string; message: string; fileName?: string } };
