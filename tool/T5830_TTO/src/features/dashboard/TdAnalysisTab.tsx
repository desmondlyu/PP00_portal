import { useState } from 'react';
import type { MasterSummaryRow } from '../../types/analysis';
import {
  tdAnalysisGroups,
  tdMetrics,
  topTdItems,
  type TdAnalysisItem,
  type TdMetric
} from './dashboardSelectors';

type Props = { rows: MasterSummaryRow[] };

type SelectedCell = {
  product: string;
  item: TdAnalysisItem;
  touchdown: string;
  metric: TdMetric;
  value: number;
};

const metricLabels: Record<TdMetric, string> = { avg: 'AVG', max: 'MAX', min: 'MIN', range: 'RANGE' };
const itemFields = ['Mode', 'Operation', 'Original_Item_Name', 'Test_Item_Merged', 'Test_Item'] as const;
type ItemField = (typeof itemFields)[number];

function sortedTouchdowns(rows: MasterSummaryRow[]) {
  return [...new Set(rows.flatMap((row) => [
    ...Object.keys(row.touchdownStats ?? {}),
    ...Object.keys(row.touchdownSiteTimes ?? {})
  ]))].sort(
    (left, right) => Number.parseInt(left.slice(3), 10) - Number.parseInt(right.slice(3), 10)
  );
}

function heatColor(value: number, min: number, max: number) {
  if (max === min) return 'hsl(52 88% 55%)';
  const ratio = (value - min) / (max - min);
  return `hsl(${120 - ratio * 120} 82% ${48 + ratio * 5}%)`;
}

function itemKey(item: TdAnalysisItem) {
  return item.category;
}

function HeatmapTable({ product, items, metric, touchdowns, itemField, selectedCell, onSelect, onItemFieldChange }: {
  product: string;
  items: TdAnalysisItem[];
  metric: TdMetric;
  touchdowns: string[];
  itemField: ItemField;
  selectedCell?: SelectedCell;
  onSelect: (cell: SelectedCell) => void;
  onItemFieldChange: (field: ItemField) => void;
}) {
  const chartItems = topTdItems(items, metric);
  const values = chartItems.flatMap((item) =>
    touchdowns.flatMap((touchdown) => {
      const value = item.stats[touchdown]?.[metric];
      return value === undefined ? [] : [value];
    })
  );
  const min = Math.min(...values);
  const max = Math.max(...values);
  const headerStyle = { position: 'sticky' as const, top: 0, zIndex: 2, background: 'var(--surface-raised)', padding: '8px 10px', textAlign: 'left' as const };

  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
      <table aria-label={`${product} TD Heatmap`} style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
        <caption style={{ padding: 10, textAlign: 'left', color: 'var(--muted)' }}>
          {metricLabels[metric]}：每列以所選 TD 的最大值排序，顏色由綠（快）至紅（慢）。
        </caption>
        <thead>
          <tr>
            <th scope="col" style={{ ...headerStyle, left: 0, zIndex: 4, minWidth: 240, position: 'sticky', fontSize: '0.75em' }}>
              Item
              <select
                aria-label="Item 顯示欄位"
                value={itemField}
                onChange={(event) => {
                  const field = itemFields.find((itemField) => itemField === event.target.value);
                  if (field) onItemFieldChange(field);
                }}
                style={{ marginLeft: 8, padding: 4 }}
              >
                {itemFields.map((field) => <option key={field} value={field}>{field}</option>)}
              </select>
            </th>
            {touchdowns.map((touchdown) => <th key={touchdown} scope="col" style={headerStyle}>{touchdown}</th>)}
          </tr>
        </thead>
        <tbody>
          {chartItems.map((item) => (
            <tr key={itemKey(item)}>
              <td
                title={item.category}
                style={{ position: 'sticky', left: 0, zIndex: 1, background: 'var(--surface-raised)', padding: '8px 10px', maxWidth: 240, borderTop: '1px solid var(--border)', whiteSpace: 'nowrap', fontSize: '0.75em' }}
              >
                {item.category}
              </td>
              {touchdowns.map((touchdown) => {
                const value = item.stats[touchdown]?.[metric];
                if (value === undefined) return <td key={touchdown} style={{ padding: 2, textAlign: 'center' }}>—</td>;
                const selected = selectedCell?.product === product
                  && selectedCell.touchdown === touchdown
                  && selectedCell.metric === metric
                  && itemKey(selectedCell.item) === itemKey(item);
                return (
                  <td key={touchdown} style={{ padding: 2 }}>
                    <button
                      type="button"
                      aria-label={`${product} · ${item.category} · ${touchdown} · ${metricLabels[metric]} · ${value.toFixed(2)} 秒`}
                      title={`${product} · ${item.category} · ${touchdown} · ${metricLabels[metric]}: ${value.toFixed(2)} 秒`}
                      style={{
                        width: '100%',
                        minWidth: 72,
                        padding: '9px 8px',
                        border: selected ? '2px solid var(--ink)' : '1px solid transparent',
                        borderRadius: 5,
                        background: heatColor(value, min, max),
                        color: '#06111f',
                        cursor: 'pointer',
                        fontVariantNumeric: 'tabular-nums'
                      }}
                      onClick={() => onSelect({ product, item, touchdown, metric, value })}
                    >
                      {value.toFixed(2)}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetailDialog({ selectedCell, onClose }: { selectedCell?: SelectedCell; onClose: () => void }) {
  if (!selectedCell) return null;
  const { item } = selectedCell;
  const sources = item.sources
    .filter((source) => source.touchdownTimes[selectedCell.touchdown] !== undefined)
    .sort((left, right) => left.Original_Item_Name.localeCompare(right.Original_Item_Name));
  const total = sources.reduce(
    (sum, source) => sum + source.touchdownTimes[selectedCell.touchdown],
    0
  );
  return (
    <dialog className="encrypted-dialog td-detail-dialog" open aria-label="TD 明細" onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <h2 style={{ marginTop: 0 }}>TD 明細</h2>
      <p><strong>Product：</strong>{selectedCell.product}</p>
      <p><strong>Item：</strong>{item.category}</p>
      <p><strong>TD：</strong>{selectedCell.touchdown}</p>
      <p><strong>{metricLabels[selectedCell.metric]}：</strong>{selectedCell.value.toFixed(2)} 秒</p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85em' }}>
          <thead>
            <tr>
              {['Mode', 'Operation', 'Original_Item_Name', 'Test_Item_Merged', 'Test_Item', 'TD 秒數'].map((label) => (
                <th key={label} scope="col" style={{ padding: 6, borderBottom: '1px solid var(--border)', textAlign: 'left' }}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr key={[source.Mode, source.Operation, source.Original_Item_Name, source.Test_Item_Merged, source.Test_Item].join('\x00')}>
                <td style={{ padding: 6 }}>{source.Mode || '未分類'}</td>
                <td style={{ padding: 6 }}>{source.Operation || '未分類'}</td>
                <td style={{ padding: 6 }}>{source.Original_Item_Name}</td>
                <td style={{ padding: 6 }}>{source.Test_Item_Merged}</td>
                <td style={{ padding: 6 }}>{source.Test_Item || '—'}</td>
                <td style={{ padding: 6, textAlign: 'right' }}>{source.touchdownTimes[selectedCell.touchdown].toFixed(2)} 秒</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th colSpan={5} scope="row" style={{ padding: 6, textAlign: 'right' }}>TD 合計：</th>
              <td style={{ padding: 6, textAlign: 'right' }}>{total.toFixed(2)} 秒</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="encrypted-dialog-actions">
        <button className="secondary-action" type="button" onClick={onClose}>關閉</button>
      </div>
    </dialog>
  );
}

export function TdAnalysisTab({ rows }: Props) {
  const [metric, setMetric] = useState<TdMetric>('max');
  const [itemField, setItemField] = useState<ItemField>('Original_Item_Name');
  const [selectedCell, setSelectedCell] = useState<SelectedCell>();
  const hasStats = rows.some((row) => row.touchdownStats && Object.keys(row.touchdownStats).length > 0);
  const hasSiteTimes = rows.some((row) => row.touchdownSiteTimes && Object.keys(row.touchdownSiteTimes).length > 0);
  const groups = tdAnalysisGroups(rows, itemField);
  const touchdowns = sortedTouchdowns(rows);

  function selectMetric(nextMetric: TdMetric) {
    setMetric(nextMetric);
    setSelectedCell(undefined);
  }

  return (
    <section aria-labelledby="td-analysis-title">
      <h1 id="td-analysis-title">TD 分析</h1>
      <p>每個產品各自顯示前 20 名；以所選 TD 的最大值排序，色階由綠（快）至紅（慢）。</p>
      {!hasStats
        ? <p>沒有可用的 TD 統計資料。請以「分析所有TD」重新分析，並匯入支援 TD 統計的分析檔案。</p>
        : !hasSiteTimes
          ? <p>缺少 Site × TD 明細，請重新分析或匯入新版檔案。</p>
        : <>
          {groups.length === 0
            ? <p>沒有可用的 TD 統計資料。</p>
            : groups.map((group) => (
                <section key={group.product} aria-label={`${group.product} TD 統計`} style={{ marginBottom: 22 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                    <h2 style={{ margin: 0 }}>{group.product}</h2>
                    <div aria-label={`${group.product} TD 統計切換`} className="td-metric-tabs">
                      {tdMetrics.map((currentMetric) => (
                        <button key={currentMetric} className="td-metric-toggle" type="button" aria-pressed={metric === currentMetric} onClick={() => selectMetric(currentMetric)}>
                          {metricLabels[currentMetric]}
                        </button>
                      ))}
                    </div>
                  </div>
                    <HeatmapTable
                      product={group.product}
                      items={group.items}
                      metric={metric}
                      touchdowns={touchdowns}
                      itemField={itemField}
                      selectedCell={selectedCell}
                      onSelect={setSelectedCell}
                      onItemFieldChange={(field) => {
                        setItemField(field);
                        setSelectedCell(undefined);
                      }}
                    />
                </section>
              ))}
        </>}
      <DetailDialog selectedCell={selectedCell} onClose={() => setSelectedCell(undefined)} />
    </section>
  );
}
