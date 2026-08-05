import { useState } from 'react';
import type { MasterSummaryRow } from '../../types/analysis';
import {
  tdAnalysisGroups,
  tdDimensionValue,
  tdDimensions,
  tdMetrics,
  topTdItems,
  type TdAnalysisItem,
  type TdDimension,
  type TdDimensionFilters,
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

const initialFilters: TdDimensionFilters = {
  Mode: '',
  Operation: '',
  Test_Item_Merged: '',
  Original_Item_Name: '',
  Test_Item: ''
};
const metricLabels: Record<TdMetric, string> = { avg: 'AVG', max: 'MAX', min: 'MIN', range: 'RANGE' };

function sortedTouchdowns(rows: MasterSummaryRow[]) {
  return [...new Set(rows.flatMap((row) => Object.keys(row.touchdownStats ?? {})))].sort(
    (left, right) => Number.parseInt(left.slice(3), 10) - Number.parseInt(right.slice(3), 10)
  );
}

function dimensionOptions(rows: MasterSummaryRow[], filters: TdDimensionFilters, dimension: TdDimension) {
  const index = tdDimensions.indexOf(dimension);
  return [...new Set(rows
    .filter((row) => row.touchdownStats && tdDimensions
      .slice(0, index)
      .every((previous) => !filters[previous] || filters[previous] === tdDimensionValue(row, previous)))
    .map((row) => tdDimensionValue(row, dimension))
    .filter(Boolean))]
    .sort();
}

function heatColor(value: number, min: number, max: number) {
  if (max === min) return 'hsl(52 88% 55%)';
  const ratio = (value - min) / (max - min);
  return `hsl(${120 - ratio * 120} 82% ${48 + ratio * 5}%)`;
}

function itemKey(item: TdAnalysisItem) {
  return tdDimensions.map((dimension) => item.hierarchy[dimension]).join('\x00');
}

function HeatmapTable({ product, items, metric, touchdowns, selectedCell, onSelect }: {
  product: string;
  items: TdAnalysisItem[];
  metric: TdMetric;
  touchdowns: string[];
  selectedCell?: SelectedCell;
  onSelect: (cell: SelectedCell) => void;
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
  const stickyHierarchy = { position: 'sticky' as const, left: 0, zIndex: 1, background: 'var(--surface-raised)' };
  const stickyTestItem = { position: 'sticky' as const, left: 260, zIndex: 1, background: 'var(--surface-raised)' };
  const headerStyle = { position: 'sticky' as const, top: 0, zIndex: 2, background: 'var(--surface-raised)', padding: '8px 10px', textAlign: 'left' as const };

  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
      <table aria-label={`${product} TD Heatmap`} style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
        <caption style={{ padding: 10, textAlign: 'left', color: 'var(--muted)' }}>
          {metricLabels[metric]}：每列以所選 TD 的最大值排序，顏色由綠（快）至紅（慢）。
        </caption>
        <thead>
          <tr>
            <th scope="col" style={{ ...headerStyle, ...stickyHierarchy, zIndex: 4, minWidth: 240 }}>Hierarchy</th>
            <th scope="col" style={{ ...headerStyle, ...stickyTestItem, zIndex: 4, minWidth: 140 }}>Test_Item</th>
            {touchdowns.map((touchdown) => <th key={touchdown} scope="col" style={headerStyle}>{touchdown}</th>)}
          </tr>
        </thead>
        <tbody>
          {chartItems.map((item) => (
            <tr key={itemKey(item)}>
              <td style={{ ...stickyHierarchy, padding: '8px 10px', maxWidth: 240, borderTop: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                {`${item.hierarchy.Mode} > ${item.hierarchy.Operation} > ${item.hierarchy.Test_Item_Merged} > ${item.hierarchy.Original_Item_Name}`}
              </td>
              <td style={{ ...stickyTestItem, padding: '8px 10px', borderTop: '1px solid var(--border)', fontWeight: 'bold' }}>{item.testItem}</td>
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
                      aria-label={`${product} · ${item.testItem} · ${touchdown} · ${metricLabels[metric]} · ${value.toFixed(2)} 秒`}
                      title={`${product} · ${item.hierarchy.Original_Item_Name} · ${touchdown} · ${metricLabels[metric]}: ${value.toFixed(2)} 秒`}
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

function DetailCard({ selectedCell }: { selectedCell?: SelectedCell }) {
  if (!selectedCell) {
    return <aside role="region" aria-label="TD 格子明細" style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 10 }}>
      選取 Heatmap 色格以查看 TD 明細。
    </aside>;
  }
  const { item } = selectedCell;
  return (
    <aside role="region" aria-label="TD 格子明細" style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 10 }}>
      <h3 style={{ marginTop: 0 }}>TD 格子明細</h3>
      <p><strong>Product：</strong>{selectedCell.product}</p>
      {tdDimensions.map((dimension) => <p key={dimension}><strong>{dimension}：</strong>{item.hierarchy[dimension]}</p>)}
      <p><strong>TD：</strong>{selectedCell.touchdown}</p>
      <p><strong>{metricLabels[selectedCell.metric]}：</strong>{selectedCell.value.toFixed(2)} 秒</p>
    </aside>
  );
}

export function TdAnalysisTab({ rows }: Props) {
  const [filters, setFilters] = useState<TdDimensionFilters>(initialFilters);
  const [metric, setMetric] = useState<TdMetric>('max');
  const [selectedCell, setSelectedCell] = useState<SelectedCell>();
  const hasStats = rows.some((row) => row.touchdownStats && Object.keys(row.touchdownStats).length > 0);
  const groups = tdAnalysisGroups(rows, filters);
  const touchdowns = sortedTouchdowns(rows);

  function updateFilter(dimension: TdDimension, value: string) {
    setFilters((current) => {
      const next = { ...current };
      for (const later of tdDimensions.slice(tdDimensions.indexOf(dimension))) next[later] = '';
      next[dimension] = value;
      return next;
    });
    setSelectedCell(undefined);
  }

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
        : <>
          <fieldset style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <legend>TD 分析階層篩選</legend>
            {tdDimensions.map((dimension) => (
              <label key={dimension}>
                {dimension}
                <select aria-label={dimension} value={filters[dimension]} onChange={(event) => updateFilter(dimension, event.target.value)}>
                  <option value="">全部</option>
                  {dimensionOptions(rows, filters, dimension).map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
            ))}
          </fieldset>
          {tdDimensions.some((dimension) => filters[dimension]) && (
            <div aria-label="目前 TD 分析篩選" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {tdDimensions.filter((dimension) => filters[dimension]).map((dimension) => (
                <button key={dimension} type="button" aria-label={`清除 ${dimension}: ${filters[dimension]}`} onClick={() => updateFilter(dimension, '')}>
                  {dimension}: {filters[dimension]} ×
                </button>
              ))}
            </div>
          )}
          <div aria-label="TD 統計切換" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '16px 0' }}>
            {tdMetrics.map((currentMetric) => (
              <button key={currentMetric} type="button" aria-pressed={metric === currentMetric} onClick={() => selectMetric(currentMetric)}>
                {metricLabels[currentMetric]}
              </button>
            ))}
          </div>
          {groups.length === 0
            ? <p>沒有符合目前階層篩選條件的 TD 統計資料。</p>
            : <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(260px, 320px)', gap: 16, alignItems: 'start' }}>
              <div>
                {groups.map((group) => (
                  <section key={group.product} aria-label={`${group.product} TD 統計`} style={{ marginBottom: 22 }}>
                    <h2>{group.product}</h2>
                    <HeatmapTable
                      product={group.product}
                      items={group.items}
                      metric={metric}
                      touchdowns={touchdowns}
                      selectedCell={selectedCell}
                      onSelect={setSelectedCell}
                    />
                  </section>
                ))}
              </div>
              <div style={{ position: 'sticky', top: 12 }}>
                <DetailCard selectedCell={selectedCell} />
              </div>
            </div>}
        </>}
    </section>
  );
}
