import { useRef, useState } from 'react';
import type { AnalysisReport } from '../../lib/analysis';
import { PRODUCT_METADATA, exportProductMetadata, mergeProductMetadata, type ProductMeta } from '../../lib/productMetadata';
import type { WorkerResponse } from '../../workers/protocol';

type JobStatus = 'idle' | 'processing' | 'cancelled' | 'completed' | 'failed';

type ProgressInfo = { phase: string; completed: number; total: number; fileName?: string };

type PipelinePageProps = {
  workerFactory?: () => Worker;
  onComplete?: (report: AnalysisReport) => void;
  onProcessing?: (active: boolean) => void;
};

const knownProducts = Object.keys(PRODUCT_METADATA);

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
  const base = file.name.replace(/\.tar$/i, '');
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

export function PipelinePage({ workerFactory = createWorker, onComplete, onProcessing }: PipelinePageProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<JobStatus>('idle');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [detectedProducts, setDetectedProducts] = useState<string[]>([]);
  const workerRef = useRef<Worker>();
  const metaInputRef = useRef<HTMLInputElement>(null);

  function selectFolder(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    const tarFiles = selected.filter((f) => f.name.toLowerCase().endsWith('.tar'));
    if (tarFiles.length === 0) {
      setFiles([]);
      setDetectedProducts([]);
      setError('找不到 .tar 檔案。只支援未壓縮的 .tar rawdata 封包。');
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

  function start() {
    const worker = workerFactory();
    const jobId = crypto.randomUUID();
    workerRef.current = worker;
    setStatus('processing');
    onProcessing?.(true);
    setProgress({ phase: 'scanning', completed: 0, total: files.length });
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
  const phaseLabel = progress?.phase === 'scanning' ? '解析中' : progress?.phase === 'aggregating' ? '彙整中' : '處理中';

  return (
    <section className="pipeline-page" aria-labelledby="pipeline-title">
      <div className="hero-copy">
        <p className="eyebrow">ON-DEVICE TEST TIME INTELLIGENCE</p>
        <p className="privacy-notice">本機模式 · 資料不會上傳至雲端</p>
        <h1 id="pipeline-title">測試程式優化<br />分析入口網站</h1>
        <p className="hero-description">解析T5830 RAWDATA (.TAR 壓縮格式)，提供TE工程單位自動解析Pre SITE/1TD中，測試次數、時間分析</p>
      </div>
      <div className="upload-card">
        <span className="upload-step">01 / INGEST</span>

        <label htmlFor="tar-folder">選擇產品資料夾（自動偵測產品名稱）</label>
        {/* @ts-expect-error webkitdirectory is non-standard but widely supported */}
        <input id="tar-folder" type="file" webkitdirectory="" onChange={selectFolder} />

        <p className="file-hint">
          {files.length
            ? `已選擇 ${files.length} 個 .tar 檔案`
            : '請選擇包含 .tar rawdata 的產品資料夾'}
          {detectedProducts.length > 0 && ` — 偵測到: ${detectedProducts.join(', ')}`}
        </p>
        {error && <p role="alert">{error}</p>}
        {status === 'processing' && progress && (
          <div className="progress-area" aria-live="polite">
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
      <div className="pipeline-stages" aria-label="分析流程">
        <span><b>01</b> Extract</span><span><b>02</b> Analyze</span><span><b>03</b> Monitor</span>
      </div>
    </section>
  );
}
