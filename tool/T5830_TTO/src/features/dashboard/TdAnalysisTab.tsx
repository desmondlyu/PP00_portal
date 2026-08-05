import { useState } from 'react';
import type { MasterSummaryRow } from '../../types/analysis';
import {
  tdAnalysisGroups,
  tdDimensionValue,
  tdDimensions,
  tdMetrics,
  topTdItems,
  type TdDimension,
  type TdDimensionFilters,
  type TdMetric
} from './dashboardSelectors';

type Props = { rows: MasterSummaryRow[] };

const initialFilters: TdDimensionFilters = {
  Mode: '',
  Operation: '',
  Test_Item_Merged: '',
  Original_Item_Name: '',
  Test_Item: ''
};
const metricLabels: Record<TdMetric, string> = { avg: 'AVG', max: 'MAX', min: 'MIN', range: 'RANGE' };
const touchdownColors = ['#60a5fa', '#c084fc', '#fb7185', '#34d399', '#fbbf24', '#22d3ee'];

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

function MetricChart({ product, items, metric, touchdowns }: {
  product: string;
  items: ReturnType<typeof topTdItems>;
  metric: TdMetric;
  touchdowns: string[];
}) {
  const chartItems = topTdItems(items, metric);
  const label = metricLabels[metric];
  const maxValue = Math.max(1, ...chartItems.flatMap((item) => Object.values(item.stats).map((stats) => stats[metric])));
  const chartWidth = 700;
  const labelWidth = 220;
  const plotWidth = chartWidth - labelWidth - 30;
  const rowHeight = 30;
  const topPadding = 20;
  const bottomPadding = 30;
  const chartHeight = topPadding + chartItems.length * rowHeight + bottomPadding;
  const barHeight = Math.max(3, (rowHeight - 6) / Math.max(touchdowns.length, 1));

  return (
    <section style={{ minWidth: 0, padding: 12, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface-raised)' }}>
      <h3 style={{ margin: '0 0 8px' }}>{label}</h3>
      <div style={{ overflowX: 'auto' }}>
        <svg
          role="img"
          aria-label={`${label} Top 20`}
          width="100%"
          height={chartHeight}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          style={{ display: 'block', minWidth: chartWidth }}
        >
          {chartItems.map((item, itemIndex) => {
            const y = topPadding + itemIndex * rowHeight;
            return (
              <g key={item.testItem}>
                <line x1={labelWidth} x2={labelWidth + plotWidth} y1={y + rowHeight} y2={y + rowHeight} stroke="rgba(255,255,255,.08)" />
                <text x={labelWidth - 8} y={y + rowHeight / 2 + 4} textAnchor="end" fill="var(--ink)" fontSize="11">
                  {item.testItem}
                </text>
                {touchdowns.map((touchdown, touchdownIndex) => {
                  const value = item.stats[touchdown]?.[metric];
                  if (value === undefined) return null;
                  const width = value / maxValue * plotWidth;
                  return (
                    <rect
                      key={touchdown}
                      x={labelWidth}
                      y={y + 3 + touchdownIndex * barHeight}
                      width={width}
                      height={barHeight}
                      fill={touchdownColors[touchdownIndex % touchdownColors.length]}
                    >
                      <title>{`${product} · ${item.testItem} · ${touchdown} · ${label}: ${value.toFixed(2)} 秒`}</title>
                    </rect>
                  );
                })}
              </g>
            );
          })}
          <text x={labelWidth} y={chartHeight - 8} fill="var(--muted)" fontSize="10">0</text>
          <text x={labelWidth + plotWidth} y={chartHeight - 8} textAnchor="end" fill="var(--muted)" fontSize="10">
            {maxValue.toFixed(2)} 秒
          </text>
        </svg>
      </div>
    </section>
  );
}

export function TdAnalysisTab({ rows }: Props) {
  const [filters, setFilters] = useState<TdDimensionFilters>(initialFilters);
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
  }

  return (
    <section aria-labelledby="td-analysis-title">
      <h1 id="td-analysis-title">TD 分析</h1>
      <p>每張圖各自顯示前 20 名；以所選 TD 的最大值排序，並保留同列所有所選 TD 的數值。</p>
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
          {groups.length === 0
            ? <p>沒有符合目前階層篩選條件的 TD 統計資料。</p>
            : groups.map((group) => (
              <section key={group.product} aria-label={`${group.product} TD 統計`} style={{ marginTop: 18 }}>
                <h2>{group.product}</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 14 }}>
                  {tdMetrics.map((metric) => (
                    <MetricChart key={metric} product={group.product} items={group.items} metric={metric} touchdowns={touchdowns} />
                  ))}
                </div>
                <div className="overview-chart-legend" aria-label={`${group.product} TD 圖例`}>
                  {touchdowns.map((touchdown, index) => (
                    <span key={touchdown} className="overview-chart-legend-item">
                      <span className="overview-chart-legend-swatch" style={{ backgroundColor: touchdownColors[index % touchdownColors.length] }} aria-hidden="true" />
                      {touchdown}
                    </span>
                  ))}
                </div>
              </section>
            ))}
        </>}
    </section>
  );
}
