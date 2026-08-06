import { useRef, useState } from 'react';
import type { AnalysisReport } from '../../lib/analysis';
import { PRODUCT_METADATA, type ProductMeta } from '../../lib/productMetadata';
import { isEncryptedWorkbookError, readAnalysisWorkbook } from '../../lib/workbook';
import type { MasterSummaryRow } from '../../types/analysis';
import type { WorkerResponse } from '../../workers/protocol';

type JobStatus = 'idle' | 'processing' | 'cancelled' | 'completed' | 'failed';

type ProgressPhase = Extract<WorkerResponse, { type: 'progress' }>['phase'];
type ProgressInfo = { phase: ProgressPhase; completed: number; total: number; fileName?: string };
type ProductStationGroup = { key: string; product: string; station: string };
type AnalysisImportCollision = { product: string; station: string; fileNames: string[] };

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
  // ponytail: 最後的 14 碼時間戳前一段就是 Station，支援 S1P1、DS00 等命名
  const base = file.name.replace(/\.(tgz|tar\.gz|tar)$/i, '');
  const parts = base.split('_');
  if (parts[0]?.toUpperCase() === 'RW' && /^\d{14}$/.test(parts[parts.length - 1] ?? '')) {
    const candidate = parts[parts.length - 2];
    if (candidate) return candidate.toUpperCase();
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

function blankProductMeta(): ProductMeta {
  return { Process: '', Size: '', Voltage: '' };
}

function buildProductMetadataList(files: File[], metadataByProduct: Record<string, ProductMeta>) {
  return files.map((file) => {
    const product = detectProductForFile(file);
    const metadata = metadataByProduct[product] ?? PRODUCT_METADATA[product] ?? blankProductMeta();
    return { product, process: metadata.Process, size: metadata.Size, voltage: metadata.Voltage };
  });
}

function hasCompleteMetadata(metadata: ProductMeta | undefined) {
  return Boolean(metadata?.Process.trim() && metadata.Size.trim() && metadata.Voltage.trim());
}

function productStationKey(product: string, station: string) {
  return `${product}\u0000${station}`;
}

function findAnalysisImportCollisions(imports: { fileName: string; rows: MasterSummaryRow[] }[]) {
  const filesByKey = new Map<string, { collision: AnalysisImportCollision; importIndexes: Set<number> }>();
  for (const [importIndex, { fileName, rows }] of imports.entries()) {
    for (const { Product: product, Station: station } of rows) {
      const key = productStationKey(product, station);
      const entry = filesByKey.get(key) ?? {
        collision: { product, station, fileNames: [] },
        importIndexes: new Set<number>()
      };
      if (!entry.importIndexes.has(importIndex)) {
        entry.importIndexes.add(importIndex);
        entry.collision.fileNames.push(fileName);
      }
      filesByKey.set(key, entry);
    }
  }
  return [...filesByKey.values()]
    .map(({ collision }) => collision)
    .filter(({ fileNames }) => fileNames.length > 1)
    .sort((left, right) => left.product.localeCompare(right.product) || left.station.localeCompare(right.station));
}

function buildProductStationGroups(files: File[]): ProductStationGroup[] {
  const groups = new Map<string, ProductStationGroup>();
  for (const file of files) {
    const product = detectProductForFile(file);
    const station = detectStationForFile(file);
    const key = productStationKey(product, station);
    groups.set(key, { key, product, station });
  }
  return [...groups.values()].sort(
    (left, right) => left.product.localeCompare(right.product) || left.station.localeCompare(right.station)
  );
}

function createWorker() {
  return new Worker(new URL('../../workers/tarAnalysis.worker.ts', import.meta.url), { type: 'module' });
}

export function PipelinePage({ workerFactory = createWorker, onComplete, onAnalysisLoaded, onProcessing }: PipelinePageProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<JobStatus>('idle');
  const [error, setError] = useState('');
  const [showEncryptedDialog, setShowEncryptedDialog] = useState(false);
  const [analysisImportCollisions, setAnalysisImportCollisions] = useState<AnalysisImportCollision[]>([]);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [groups, setGroups] = useState<ProductStationGroup[]>([]);
  const [metadataByProduct, setMetadataByProduct] = useState<Record<string, ProductMeta>>({});
  const [pendingGroupKeys, setPendingGroupKeys] = useState<string[]>([]);
  const [selectedGroupKeys, setSelectedGroupKeys] = useState<string[]>([]);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [isParsingSelection, setIsParsingSelection] = useState(false);
  const [analyzeAllTouchdowns, setAnalyzeAllTouchdowns] = useState(false);
  const workerRef = useRef<Worker>();
  const analysisInputRef = useRef<HTMLInputElement>(null);
  const selectedFiles = files.filter((file) => selectedGroupKeys.includes(
    productStationKey(detectProductForFile(file), detectStationForFile(file))
  ));

  function selectFolder(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    const tarFiles = selected.filter((f) => /\.(tar|tgz|tar\.gz)$/i.test(f.name));
    if (tarFiles.length === 0) {
      setFiles([]);
      setGroups([]);
      setPendingGroupKeys([]);
      setSelectedGroupKeys([]);
      setShowProductDialog(false);
      setIsParsingSelection(false);
      setError('找不到 .tgz / .tar 檔案。請上傳包含 rawdata 壓縮檔的產品資料夾。');
      return;
    }
    setError('');
    setFiles(tarFiles);
    setStatus('idle');
    setProgress(null);
    setIsParsingSelection(true);
    setSelectedGroupKeys([]);
    setShowProductDialog(false);
    window.setTimeout(() => {
      const detectedGroups = buildProductStationGroups(tarFiles);
      setGroups(detectedGroups);
      setMetadataByProduct(Object.fromEntries(
        [...new Set(detectedGroups.map((group) => group.product))].map((product) => [
          product,
          PRODUCT_METADATA[product] ?? blankProductMeta()
        ])
      ));
      setPendingGroupKeys(detectedGroups.map((group) => group.key));
      setIsParsingSelection(false);
      setShowProductDialog(true);
    }, 0);
  }

  async function start() {
    const worker = workerFactory();
    const jobId = crypto.randomUUID();
    workerRef.current = worker;
    setStatus('processing');
    onProcessing?.(true);
    setProgress({ phase: 'extracting', completed: 0, total: selectedFiles.length });

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
    worker.postMessage({
      type: 'start',
      jobId,
      files: selectedFiles,
      products: buildProductList(selectedFiles),
      stations: buildStationList(selectedFiles),
      metadata: buildProductMetadataList(selectedFiles, metadataByProduct),
      analyzeAllTouchdowns
    });
  }

  function cancel() {
    workerRef.current?.terminate();
    workerRef.current = undefined;
    setStatus('cancelled');
    setProgress(null);
    onProcessing?.(false);
  }

  async function handleAnalysisImport(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;
    setError('');
    setAnalysisImportCollisions([]);
    try {
      const imports: { fileName: string; rows: MasterSummaryRow[] }[] = [];
      for (const file of files) {
        const rows = await readAnalysisWorkbook(file);
        if (rows.length === 0) throw new Error(`${file.name} 沒有分析資料`);
        imports.push({ fileName: file.name, rows });
      }
      const collisions = findAnalysisImportCollisions(imports);
      if (collisions.length > 0) {
        setAnalysisImportCollisions(collisions);
        return;
      }
      onAnalysisLoaded?.(imports.flatMap(({ rows }) => rows));
    } catch (error) {
      if (isEncryptedWorkbookError(error)) {
        setShowEncryptedDialog(true);
        return;
      }
      setError(error instanceof Error ? error.message : '無法讀取分析結構 Excel');
    }
  }

  const hasIncompleteSelectedMetadata = groups.some((group) =>
    pendingGroupKeys.includes(group.key) &&
    !PRODUCT_METADATA[group.product] &&
    !hasCompleteMetadata(metadataByProduct[group.product])
  );

  function updateProductMetadata(product: string, field: keyof ProductMeta, value: string) {
    setMetadataByProduct((current) => ({
      ...current,
      [product]: { ...(current[product] ?? blankProductMeta()), [field]: value }
    }));
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
            ? `已選擇 ${selectedFiles.length}/${files.length} 個壓縮檔`
            : '上傳請選擇根目錄，根目錄資料夾包含你要分析的所有產品資料夾。\n範例: 選擇根目錄 ABC；ABC 底下包含 產品1, 產品2，各產品資料夾下包含一份 .TGZ 壓縮檔'}
          {groups.length > 0 && ` — 偵測到 ${groups.length} 組產品／站點`}
        </p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={analyzeAllTouchdowns}
            onChange={(event) => setAnalyzeAllTouchdowns(event.target.checked)}
          />
          分析所有TD
        </label>
        <p className="file-hint">分析所有TD可能造成分析時間過長造成Timeout問題，預設只分析TD1</p>
        {isParsingSelection && <p className="status-text" role="status">正在解析產品名稱與站點…</p>}
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
        <button className="primary-action" type="button" disabled={selectedFiles.length === 0 || isParsingSelection || showProductDialog || status === 'processing'} onClick={start}>
          開始分析
        </button>
        {status === 'processing' && <button className="secondary-action" type="button" onClick={cancel}>取消分析</button>}
        {status === 'cancelled' && <p className="status-text">已取消</p>}
        {status === 'completed' && <p className="status-text">分析完成</p>}
        <button className="secondary-action" type="button" onClick={() => analysisInputRef.current?.click()}>
          📥 上傳已分析的資料 (.xlsx，可多選)
        </button>
        <input ref={analysisInputRef} aria-label="上傳已分析的資料" type="file" accept=".xlsx" multiple style={{ display: 'none' }} onChange={handleAnalysisImport} />

      </div>
      <dialog className="encrypted-dialog" open={showEncryptedDialog} aria-labelledby="encrypted-dialog-title">
        <p id="encrypted-dialog-title">⚠️ 系統無法分析受保護的 Excel 檔案，請解除加密設定後重新上傳。</p>
        <img src="unlock_irm.jpg" alt="解除保護說明" />
        <div className="encrypted-dialog-actions">
          <button className="primary-action" type="button" onClick={() => setShowEncryptedDialog(false)}>關閉</button>
        </div>
      </dialog>
      {analysisImportCollisions.length > 0 && (
        <dialog
          className="encrypted-dialog"
          open
          aria-label="分析結構重複"
          onCancel={(event) => {
            event.preventDefault();
            setAnalysisImportCollisions([]);
          }}
        >
          <h2 style={{ marginTop: 0 }}>偵測到重複產品／站點</h2>
          <p>請移除重複的分析檔案後重新上傳，儀表板資料尚未更新。</p>
          <ul>
            {analysisImportCollisions.map(({ product, station, fileNames }) => (
              <li key={productStationKey(product, station)}>
                {product}／{station}：{fileNames.join('、')}
              </li>
            ))}
          </ul>
          <div className="encrypted-dialog-actions">
            <button className="secondary-action" type="button" onClick={() => setAnalysisImportCollisions([])}>關閉</button>
          </div>
        </dialog>
      )}
      <dialog className="product-selection-dialog" open={showProductDialog} aria-label="選擇要分析的產品、站點">
        <h2 style={{ marginTop: 0 }}>請選擇要分析的產品、站點</h2>
        <div className="encrypted-dialog-actions">
          <button className="secondary-action" type="button" onClick={() => setPendingGroupKeys(groups.map((group) => group.key))}>全選</button>
          <button className="secondary-action" type="button" onClick={() => setPendingGroupKeys([])}>全不選</button>
        </div>
        <div className="product-selection-table-scroll">
          <table>
            <thead>
              <tr>
                {['選擇', '產品', '站點', 'Process', 'Size', 'Voltage'].map((label) => (
                  <th key={label} scope="col">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group.key}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`${group.product} · ${group.station}`}
                      checked={pendingGroupKeys.includes(group.key)}
                      onChange={() => setPendingGroupKeys((current) =>
                        current.includes(group.key)
                          ? current.filter((key) => key !== group.key)
                          : [...current, group.key]
                      )}
                    />
                  </td>
                  <td>{group.product}</td>
                  <td>{group.station}</td>
                  {(['Process', 'Size', 'Voltage'] as const).map((field) => {
                    const metadata = metadataByProduct[group.product] ?? blankProductMeta();
                    const isKnownProduct = Boolean(PRODUCT_METADATA[group.product]);
                    return (
                      <td key={field}>
                        <input
                          aria-label={`${group.product} · ${group.station} ${field}`}
                          value={metadata[field]}
                          disabled={isKnownProduct}
                          onChange={(event) => updateProductMetadata(group.product, field, event.target.value)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="encrypted-dialog-actions">
          <button
            className="primary-action"
            type="button"
            disabled={pendingGroupKeys.length === 0 || hasIncompleteSelectedMetadata}
            onClick={() => {
              setSelectedGroupKeys(pendingGroupKeys);
              setShowProductDialog(false);
            }}
          >
            確認選擇
          </button>
        </div>
      </dialog>
      <div className="pipeline-stages" aria-label="分析流程">
        <span><b>01</b> Extract</span><span><b>02</b> Analyze</span><span><b>03</b> Monitor</span>
      </div>
    </section>
  );
}
