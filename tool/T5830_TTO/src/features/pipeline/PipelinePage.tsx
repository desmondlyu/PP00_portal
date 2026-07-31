import { useRef, useState } from 'react';
import type { AnalysisReport } from '../../lib/analysis';
import { PRODUCT_METADATA, exportProductMetadata, mergeProductMetadata, type ProductMeta } from '../../lib/productMetadata';
import { isEncryptedWorkbookError, readAnalysisWorkbook } from '../../lib/workbook';
import type { MasterSummaryRow } from '../../types/analysis';
import type { WorkerResponse } from '../../workers/protocol';

type JobStatus = 'idle' | 'processing' | 'cancelled' | 'completed' | 'failed';

type ProgressPhase = Extract<WorkerResponse, { type: 'progress' }>['phase'];
type ProgressInfo = { phase: ProgressPhase; completed: number; total: number; fileName?: string };

type PipelinePageProps = {
  workerFactory?: () => Worker;
  onComplete?: (report: AnalysisReport) => void;
  onAnalysisLoaded?: (rows: MasterSummaryRow[]) => void;
  onProcessing?: (active: boolean) => void;
};

const knownProducts = Object.keys(PRODUCT_METADATA);
const progressSteps = [
  { phase: 'extracting', active: '.tgz 解壓中', done: '.tgz 解壓成功' },
  { phase: 'parsing', active: '.tar 內容解析中', done: '.tar 內容解析成功' },
  { phase: 'analyzing', active: '開始分析', done: '分析完成' }
] as const;

/** 從單一檔案的 webkitRelativePath 偵測產品名（取 .tar 的直屬父資料夾） */
function detectProductForFile(file: File): string {
  const relPath = (file as { webkitRelativePath?: string }).webkitRelativePath ?? '';
  const parts = relPath.split('/').filter(Boolean);
  // 路徑: "DATA/EAG119/xxx.tar" → parts[parts.length-2] = "EAG119"
  if (parts.length >= 2) {
    const parentFolder = parts[parts.length - 2];
    const upper = parentFolder.toUpperCase();
    const match = knownProducts.find((p) => upper.includes(p));
    return match ?? parentFolder;
  }
  // fallback: 從檔名猜
  const upper = file.name.toUpperCase();
  return knownProducts.find((p) => upper.includes(p)) ?? 'Unknown';
}

/** 從 TAR 檔名解析站點 (RW_*_LOTNO_WAFERID_STATION_DATETIME.tar → STATION) */
function detectStationForFile(file: File): string {
  // 檔名格式: RW_P_D6505985AF08_20_S1P1_20260523093451.tar
  const base = file.name.replace(/\.(tgz|tar\.gz|tar)$/i, '');
  const parts = base.split('_');
  // Station 通常是倒數第二段（最後一段是日期時間）
  if (parts.length >= 3) {
    const candidate = parts[parts.length - 2];
    // Station 格式: S + 數字 + P + 數字 (如 S1P1, S2P1)
    if (/^S\d+P\d+$/i.test(candidate)) return candidate.toUpperCase();
  }
  return 'Unknown';
}

/** 建立與 files 同索引的 product 陣列 */
function buildProductList(files: File[]): string[] {
  return files.map((f) => detectProductForFile(f));
}

/** 建立與 files 同索引的 station 陣列 */
function buildStationList(files: File[]): string[] {
  return files.map((f) => detectStationForFile(f));
}

function createWorker() {
  return new Worker(new URL('../../workers/tarAnalysis.worker.ts', import.meta.url), { type: 'module' });
}

export function PipelinePage({ workerFactory = createWorker, onComplete, onAnalysisLoaded, onProcessing }: PipelinePageProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<JobStatus>('idle');
  const [error, setError] = useState('');
  const [showEncryptedDialog, setShowEncryptedDialog] = useState(false);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [detectedProducts, setDetectedProducts] = useState<string[]>([]);
  const workerRef = useRef<Worker>();
  const metaInputRef = useRef<HTMLInputElement>(null);
  const analysisInputRef = useRef<HTMLInputElement>(null);

  function selectFolder(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    const tarFiles = selected.filter((f) => /\.(tar|tgz|tar\.gz)$/i.test(f.name));
    if (tarFiles.length === 0) {
      setFiles([]);
      setDetectedProducts([]);
      setError('找不到 .tgz / .tar 檔案。請上傳包含 rawdata 壓縮檔的產品資料夾。');
      return;
    }
    setError('');
    setFiles(tarFiles);
    setStatus('idle');
    setProgress(null);
    // 偵測所有產品名
    const productList = buildProductList(tarFiles);
    const unique = [...new Set(productList)];
    setDetectedProducts(unique);
  }

  async function start() {
    const worker = workerFactory();
    const jobId = crypto.randomUUID();
    workerRef.current = worker;
    setStatus('processing');
    onProcessing?.(true);
    setProgress({ phase: 'extracting', completed: 0, total: files.length });

    worker.addEventListener('error', (event) => {
      worker.terminate();
      workerRef.current = undefined;
      setError(event instanceof ErrorEvent && event.message ? event.message : '分析 Worker 載入失敗，請重新整理頁面後再試');
      setStatus('failed');
      setProgress(null);
      onProcessing?.(false);
    });
    worker.addEventListener('messageerror', () => {
      worker.terminate();
      workerRef.current = undefined;
      setError('分析資料傳送失敗，請重新整理頁面後再試');
      setStatus('failed');
      setProgress(null);
      onProcessing?.(false);
    });
    worker.addEventListener('message', ({ data }: MessageEvent<WorkerResponse>) => {
      if (data.type === 'progress') {
        setProgress({ phase: data.phase, completed: data.completed, total: data.total, fileName: data.fileName });
      }
      if (data.type === 'completed') {
        setStatus('completed');
        setProgress(null);
        onProcessing?.(false);
        onComplete?.(data.report);
      }
      if (data.type === 'cancelled') { setStatus('cancelled'); setProgress(null); onProcessing?.(false); }
      if (data.type === 'failed') {
        setError(data.error.message);
        setStatus('failed');
        setProgress(null);
        onProcessing?.(false);
      }
    });
    worker.postMessage({ type: 'start', jobId, files, products: buildProductList(files), stations: buildStationList(files) });
  }

  function cancel() {
    workerRef.current?.terminate();
    workerRef.current = undefined;
    setStatus('cancelled');
    setProgress(null);
    onProcessing?.(false);
  }

  async function handleAnalysisImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const rows = await readAnalysisWorkbook(file);
      if (rows.length === 0) throw new Error('分析結構檔案沒有資料');
      onAnalysisLoaded?.(rows);
    } catch (error) {
      if (isEncryptedWorkbookError(error)) {
        setShowEncryptedDialog(true);
        return;
      }
      setError(error instanceof Error ? error.message : '無法讀取分析結構 Excel');
    }
  }

  const [metaStatus, setMetaStatus] = useState('');

  function handleExportMetadata() {
    const data = exportProductMetadata();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'PRODUCT_METADATA.json'; a.click();
    URL.revokeObjectURL(url);
    setMetaStatus(`已匯出 ${Object.keys(data).length} 個產品`);
  }

  function handleImportMetadata(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as Record<string, ProductMeta>;
        const count = Object.keys(parsed).length;
        if (count === 0) { setMetaStatus('檔案內無有效產品資料'); return; }
        mergeProductMetadata(parsed);
        setMetaStatus(`已匯入 ${count} 個產品（合併後共 ${Object.keys(PRODUCT_METADATA).length} 個）`);
      } catch {
        setMetaStatus('JSON 格式錯誤，請使用匯出格式');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  const pct = progress && progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
  const phaseLabel = progress?.phase === 'extracting'
    ? '解壓中'
    : progress?.phase === 'parsing'
      ? '解析中'
      : progress?.phase === 'analyzing'
        ? '分析中'
        : '處理中';
  const activeStep = progress ? progressSteps.findIndex((step) => step.phase === progress.phase) : -1;

  return (
    <section className="pipeline-page" aria-labelledby="pipeline-title">
      <div className="hero-copy">
        <p className="eyebrow">ON-DEVICE TEST TIME INTELLIGENCE</p>
        <p className="privacy-notice">本機模式 · 資料不會上傳至雲端</p>
        <h1 id="pipeline-title">測試程式優化<br />分析入口網站</h1>
        <p className="hero-description">解析T5830 RAWDATA (.TGZ 壓縮格式)，提供TE工程單位自動解析Pre SITE/1TD中，測試次數、時間分析</p>
      </div>
      <div className="upload-card">
        <span className="upload-step">01 / INGEST</span>

        <label htmlFor="tar-folder">選擇產品資料夾（自動偵測產品名稱）</label>
        {/* @ts-expect-error webkitdirectory is non-standard but widely supported */}
        <input id="tar-folder" type="file" webkitdirectory="" onChange={selectFolder} />

        <p className="file-hint">
          {files.length
            ? `已選擇 ${files.length} 個壓縮檔`
            : '上傳請選擇根目錄，根目錄資料夾包含你要分析的所有產品資料夾。\n範例: 選擇根目錄 ABC；ABC 底下包含 產品1, 產品2，各產品資料夾下包含一份 .TGZ 壓縮檔'}
          {detectedProducts.length > 0 && ` — 偵測到: ${detectedProducts.join(', ')}`}
        </p>
        {error && <p role="alert">{error}</p>}
        {status === 'processing' && progress && (
          <div className="progress-area" aria-live="polite">
            <div className="progress-steps">
              {progressSteps.map((step, index) => {
                const state = index < activeStep ? 'done' : index === activeStep ? 'active' : '';
                const label = index < activeStep ? step.done : index === activeStep ? step.active : step.done;
                return (
                  <div className={`progress-step ${state}`} key={step.phase}>
                    <span className="progress-step-icon">{index < activeStep ? '✓' : index === activeStep ? '●' : '○'}</span>
                    <span>{label}</span>
                  </div>
                );
              })}
            </div>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <p className="progress-label">{phaseLabel} {progress.completed}/{progress.total}{progress.fileName ? ` — ${progress.fileName}` : ''}</p>
          </div>
        )}
        <button className="primary-action" type="button" disabled={files.length === 0 || status === 'processing'} onClick={start}>
          開始分析
        </button>
        {status === 'processing' && <button className="secondary-action" type="button" onClick={cancel}>取消分析</button>}
        {status === 'cancelled' && <p className="status-text">已取消</p>}
        {status === 'completed' && <p className="status-text">分析完成</p>}
        <button className="secondary-action" type="button" onClick={() => analysisInputRef.current?.click()}>
          📥 上傳已分析的資料 (.xlsx)
        </button>
        <input ref={analysisInputRef} aria-label="上傳已分析的資料" type="file" accept=".xlsx" style={{ display: 'none' }} onChange={handleAnalysisImport} />

        {/* 產品屬性資料庫 */}
        <hr style={{ border: 'none', borderTop: '1px solid rgba(88,202,255,.2)', margin: '20px 0' }} />
        <span className="upload-step">PRODUCT DATABASE</span>
        <p className="file-hint">管理產品屬性資料庫（製程 / 容量 / 電壓），可匯出現有清單或匯入新產品。</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="secondary-action" type="button" onClick={handleExportMetadata}
            style={{ fontSize: '0.75em', padding: '8px 16px', fontWeight: 'normal' }}>
            📤 匯出產品清單 (.json)
          </button>
          <button className="secondary-action" type="button"
            style={{ fontSize: '0.75em', padding: '8px 16px', fontWeight: 'normal' }}
            onClick={() => metaInputRef.current?.click()}>
            📥 匯入產品清單 (.json)
          </button>
          <input ref={metaInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportMetadata} />
        </div>
        {metaStatus && <p role="status" style={{ marginTop: 8, fontSize: '0.85em' }}>{metaStatus}</p>}
      </div>
      <dialog className="encrypted-dialog" open={showEncryptedDialog} aria-labelledby="encrypted-dialog-title">
        <p id="encrypted-dialog-title">⚠️ 系統無法分析受保護的 Excel 檔案，請解除加密設定後重新上傳。</p>
        <img src="/unlock_irm.jpg" alt="解除保護說明" />
        <div className="encrypted-dialog-actions">
          <button className="primary-action" type="button" onClick={() => setShowEncryptedDialog(false)}>關閉</button>
        </div>
      </dialog>
      <div className="pipeline-stages" aria-label="分析流程">
        <span><b>01</b> Extract</span><span><b>02</b> Analyze</span><span><b>03</b> Monitor</span>
      </div>
    </section>
  );
}
