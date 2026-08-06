import { useEffect, useState } from 'react';
import { isEncryptedWorkbookError, readMappingWorkbook, writeAnalysisWorkbook, writeMasterSummaryWorkbook, writeSunburstWorkbook, type MappingRow } from '../../lib/workbook';
import { DEFAULT_MAPPING } from '../../lib/defaultMapping';
import type { MasterSummaryRow } from '../../types/analysis';
import { CountTab } from './CountTab';
import { DashboardFilters } from './DashboardFilters';
import { allFilters, filterRawSummary, filterSummary, productItemTimes, topStackedItems, type DashboardFilters as FilterValues } from './dashboardSelectors';
import { OverviewTab } from './OverviewTab';
import { SunburstTab } from './SunburstTab';
import { TdAnalysisTab } from './TdAnalysisTab';
import { TimeTab } from './TimeTab';
import { TtrCompareTab } from './TtrCompareTab';

const tabs = ['儀表板總覽', '總時間比較', '跨產品明細 (時間)', '跨產品明細 (次數)', '旭日圖/關聯樹', 'TTR前後分析', 'TD/SITE分析'] as const;
const downloadButtonStyle = {
  padding: '6px 12px',
  borderRadius: 6,
  border: '1px solid rgba(88,202,255,.4)',
  background: 'var(--surface)',
  color: 'var(--ink)',
  cursor: 'pointer'
} as const;

function mappingFromSummaries(summaries: MasterSummaryRow[]) {
  const imported = new Map<string, MappingRow>();
  for (const row of summaries) {
    if (row.Mode && row.Operation) {
      imported.set(row.Original_Item_Name, {
        Original_Item_Name: row.Original_Item_Name,
        Mode: row.Mode,
        Operation: row.Operation
      });
    }
  }
  return [...imported.values()];
}

function applyMapping(summaries: MasterSummaryRow[], mapping: MappingRow[]) {
  const mappingByOriginalName = new Map(mapping.map((row) => [row.Original_Item_Name, row]));
  return summaries.map((row) => {
    const mapped = mappingByOriginalName.get(row.Original_Item_Name);
    return mapped ? { ...row, Mode: row.Mode ?? mapped.Mode, Operation: row.Operation ?? mapped.Operation } : row;
  });
}

export function DashboardPage({ summaries }: { summaries: MasterSummaryRow[] }) {
  const [filters, setFilters] = useState<FilterValues>(allFilters);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>(tabs[0]);
  const [baseline, setBaseline] = useState<MasterSummaryRow[]>([]);
  const [optimized, setOptimized] = useState<MasterSummaryRow[]>([]);
  const [ttrError, setTtrError] = useState('');
  const [showEncryptedDialog, setShowEncryptedDialog] = useState(false);
  const [mappingStatus, setMappingStatus] = useState('預設分類已載入');
  // ponytail: 預設用內建規則，使用者上傳可覆蓋
  const [mapping, setMapping] = useState<MappingRow[]>(DEFAULT_MAPPING);
  useEffect(() => {
    const importedMapping = mappingFromSummaries(summaries);
    if (importedMapping.length > 0) {
      setMapping(importedMapping);
      setMappingStatus(`已從分析結構還原 Mapping：${importedMapping.length} 項`);
    }
  }, [summaries]);
  const classifiedSummaries = applyMapping(summaries, mapping);
  const filtered = filterSummary(classifiedSummaries, filters);
  // ponytail: Sunburst needs un-aggregated rows to join on Original_Item_Name
  const rawFiltered = filterRawSummary(classifiedSummaries, filters);

  async function updateMapping(file?: File) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setMappingStatus('Mapping 僅支援 .xlsx 檔案');
      return;
    }
    try {
      const loaded = await readMappingWorkbook(file);
      const mappedItems = new Set(loaded.map((row) => row.Original_Item_Name));
      const summaryItems = new Set(filtered.map((row) => row.Original_Item_Name));
      const matchedItems = [...summaryItems].filter((item) => mappedItems.has(item)).length;
      setMapping(loaded);
      setMappingStatus(`已套用 Mapping：${matchedItems}/${summaryItems.size}`);
      setActiveTab('旭日圖/關聯樹');
    } catch (error) {
      if (isEncryptedWorkbookError(error)) {
        setShowEncryptedDialog(true);
        return;
      }
      setMappingStatus(error instanceof Error ? error.message : '無法讀取 Mapping 檔案');
    }
  }

  function downloadMasterSummary(product: string) {
    const rows = summaries.filter((r) => r.Product === product);
    const buf = writeMasterSummaryWorkbook(rows, mapping);
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${product}_Master_Summary.xlsx`; a.click();
    URL.revokeObjectURL(url);
  }

  function downloadAllAnalysisStructure() {
    const buf = writeAnalysisWorkbook(summaries, mapping);
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'T5830_Analysis_Structure.xlsx'; a.click();
    URL.revokeObjectURL(url);
  }

  function downloadSunburstStructure() {
    const buf = writeSunburstWorkbook(summaries, mapping);
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'Sunburst_Structure.xlsx'; a.click();
    URL.revokeObjectURL(url);
  }

  function downloadMappingTemplate() {
    const a = document.createElement('a');
    a.href = './Management_Mapping.xlsx';
    a.download = 'Management_Mapping.xlsx';
    a.click();
  }

  const products = [...new Set(summaries.map((r) => r.Product))].sort();
  const panelId = `dashboard-panel-${tabs.indexOf(activeTab)}`;
  return (
    <section className="dashboard-page">
      <h1>全產品線測試時間戰情室</h1>
      <DashboardFilters rows={summaries} value={filters} onChange={setFilters} />
      {/* Master Summary 下載 */}
      {products.length > 0 && (
        <section aria-label="Master Summary 下載">
          <span style={{ marginRight: 8 }}>📥 下載 Master Summary：</span>
          {products.map((p) => (
            <button key={p} type="button" onClick={() => downloadMasterSummary(p)}
              style={{ marginRight: 8, padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(88,202,255,.4)', background: 'var(--surface)', color: 'var(--ink)', cursor: 'pointer' }}>
              {p}.xlsx
            </button>
          ))}
        </section>
      )}
      {products.length > 0 && (
        <section aria-label="完整分析結構匯出" style={{ marginTop: 12 }}>
          <button type="button" onClick={downloadAllAnalysisStructure} style={downloadButtonStyle}>
            📦 匯出所有分析結構
          </button>
        </section>
      )}
      <section aria-label="Mapping 檔案">
        <label>Management Mapping 檔案<input type="file" accept=".xlsx" onChange={(event) => updateMapping(event.target.files?.[0])} /></label>
        <p>Mapping 檔案必須是 .xlsx，且應有 Original_Item_Name、Mode、Operation 欄位。</p>
        <button type="button" onClick={downloadMappingTemplate} style={{ ...downloadButtonStyle, marginTop: 8 }}>
          下載 Test Item Mapping 範本
        </button>
        {mappingStatus && <p role="status">{mappingStatus}</p>}
      </section>
      <div role="tablist" aria-label="Dashboard 分頁">
        {tabs.map((tab, index) => (
          <button key={tab} id={`dashboard-tab-${index}`} role="tab" aria-selected={activeTab === tab}
            aria-controls={`dashboard-panel-${index}`} onClick={() => setActiveTab(tab)}>{tab}</button>
        ))}
      </div>
      {activeTab === '旭日圖/關聯樹' && (
        <section aria-label="Sunburst 資料結構匯出" style={{ marginTop: 12 }}>
          <button type="button" onClick={downloadSunburstStructure} style={downloadButtonStyle}>
            下載 Sunburst 資料結構
          </button>
        </section>
      )}
      <div id={panelId} role="tabpanel" aria-labelledby={`dashboard-tab-${tabs.indexOf(activeTab)}`}>
        {filtered.length === 0 && activeTab !== 'TTR前後分析' && activeTab !== 'TD/SITE分析'
          ? <p>{summaries.length === 0 ? '尚無 Master Summary 資料。請先完成分析或載入 Master Summary 檔案。' : '沒有符合目前篩選條件的資料。'}</p>
          : <TabContent tab={activeTab} rows={filtered} rawRows={rawFiltered} mapping={mapping} baseline={baseline} optimized={optimized} onLoad={(kind, rows) => kind === 'baseline' ? setBaseline(rows) : setOptimized(rows)} error={ttrError} onError={setTtrError} onEncryptedFile={() => setShowEncryptedDialog(true)} />}
      </div>
      <dialog className="encrypted-dialog" open={showEncryptedDialog} aria-labelledby="encrypted-dialog-title">
        <p id="encrypted-dialog-title">⚠️ 系統無法分析受保護的 Excel 檔案，請解除加密設定後重新上傳。</p>
        <img src="unlock_irm.jpg" alt="解除保護說明" />
        <div className="encrypted-dialog-actions">
          <button className="primary-action" type="button" onClick={() => setShowEncryptedDialog(false)}>關閉</button>
        </div>
      </dialog>
    </section>
  );
}

function TabContent({ tab, rows, rawRows, mapping, baseline, optimized, onLoad, error, onError, onEncryptedFile }: {
  tab: (typeof tabs)[number];
  rows: MasterSummaryRow[];
  rawRows: MasterSummaryRow[];
  mapping: MappingRow[];
  baseline: MasterSummaryRow[];
  optimized: MasterSummaryRow[];
  onLoad: (kind: 'baseline' | 'optimized', rows: MasterSummaryRow[]) => void;
  error: string;
  onError: (error: string) => void;
  onEncryptedFile: () => void;
}) {
  if (tab === '儀表板總覽') return <OverviewTab rows={rows} rawRows={rawRows} mapping={mapping} />;
  if (tab === '總時間比較') return <StackedTimeBars rows={rows} />;
  if (tab === '跨產品明細 (時間)') return <TimeTab rows={rows} />;
  if (tab === '跨產品明細 (次數)') return <CountTab rows={rows} />;
  if (tab === '旭日圖/關聯樹') return <SunburstTab rows={rawRows} mapping={mapping} />;
  if (tab === 'TD/SITE分析') return <TdAnalysisTab rows={rawRows} />;
  return <TtrCompareTab baseline={baseline} optimized={optimized} onLoad={onLoad} error={error} onError={onError} onEncryptedFile={onEncryptedFile} />;
}

function StackedTimeBars({ rows }: { rows: MasterSummaryRow[] }) {
  const items = topStackedItems(rows);
  const products = productItemTimes(rows);
  const colors = ['#9333ea', '#16a34a', '#60a5fa', '#ca8a04', '#db2777', '#4ade80', '#f97316', '#06b6d4', '#e879f9', '#64748b', '#dc2626'];

  // Build legend items (top 10 + Others)
  const legendItems = [...items];
  legendItems.push('Others (其他)');

  // Compute max time for Y-axis scale
  let maxTime = 0;
  for (const [, values] of products) {
    const total = [...values.values()].reduce((sum, v) => sum + v, 0);
    if (total > maxTime) maxTime = total;
  }
  maxTime = maxTime || 1;

  // Chart dimensions
  const chartH = 400;
  const chartW = Math.max(720, products.size * 140);
  const padL = 60, padR = 10, padT = 20, padB = 80;
  const plotH = chartH - padT - padB;
  const plotW = chartW - padL - padR;
  const barW = Math.min(60, plotW / Math.max(products.size, 1) * 0.7);
  const gap = plotW / Math.max(products.size, 1);

  // Y-axis ticks
  const ticks = 5;
  const yStep = Math.ceil(maxTime / ticks / 100) * 100 || Math.ceil(maxTime / ticks);

  return (
    <section aria-labelledby="stacked-title">
      <h2 id="stacked-title">總時間比較</h2>
      <div style={{ overflowX: 'auto' }}>
        <svg role="img" aria-label="各產品測試時間堆疊條圖" width="100%" height={chartH} viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none" style={{ display: 'block', minWidth: chartW }}>
          {/* Y-axis labels & grid */}
          {Array.from({ length: ticks + 1 }, (_, i) => {
            const val = i * yStep;
            if (val > maxTime * 1.1) return null;
            const y = padT + plotH - (val / maxTime) * plotH;
            return <g key={`y-${i}`}>
              <line x1={padL} x2={padL + plotW} y1={y} y2={y} stroke="rgba(255,255,255,.1)" />
              <text x={padL - 8} y={y + 4} textAnchor="end" fill="var(--muted)" fontSize="11">{val}</text>
            </g>;
          })}
          {/* Y-axis title */}
          <text x="14" y={padT + plotH / 2} textAnchor="middle" fill="var(--muted)" fontSize="12" transform={`rotate(-90 14 ${padT + plotH / 2})`}>總時間 (秒)</text>

          {/* Stacked bars */}
          {[...products].map(([product, values], pi) => {
            const segments = new Map<string, number>();
            for (const [item, time] of values) {
              const key = items.has(item) ? item : 'Others (其他)';
              segments.set(key, (segments.get(key) ?? 0) + time);
            }
            const cx = padL + gap * pi + gap / 2;
            let offsetY = 0;
            const meta = rows.find((r) => r.Product === product);
            return <g key={product}>
              {[...segments].map(([item, time]) => {
                const h = (time / maxTime) * plotH;
                const y = padT + plotH - offsetY - h;
                offsetY += h;
                const ci = legendItems.indexOf(item) % colors.length;
                return <rect key={item} x={cx - barW / 2} y={y} width={barW} height={h} fill={colors[ci]}>
                  <title>{`${item}: ${time.toFixed(2)} 秒`}</title>
                </rect>;
              })}
              {/* X-axis label */}
              <text x={cx} y={padT + plotH + 14} textAnchor="middle" fill="var(--ink)" fontSize="12" fontWeight="bold">{product}</text>
              <text x={cx} y={padT + plotH + 28} textAnchor="middle" fill="var(--muted)" fontSize="10">{meta?.Process ?? ''}</text>
              <text x={cx} y={padT + plotH + 40} textAnchor="middle" fill="var(--muted)" fontSize="10">{meta?.Size ?? ''}</text>
              <text x={cx} y={padT + plotH + 52} textAnchor="middle" fill="var(--muted)" fontSize="10">{meta?.Voltage ? `${meta.Voltage}V` : ''}</text>
            </g>;
          })}

        </svg>
        <div className="overview-chart-legend" aria-label="總時間比較圖例">
          {legendItems.map((item, index) => (
            <span key={item} className="overview-chart-legend-item">
              <span className="overview-chart-legend-swatch" style={{ backgroundColor: colors[index % colors.length] }} aria-hidden="true" />
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
