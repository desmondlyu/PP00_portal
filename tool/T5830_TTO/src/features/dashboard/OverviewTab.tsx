import type { MasterSummaryRow } from '../../types/analysis';
import type { MappingRow } from '../../lib/workbook';
import { topStackedItems, productItemTimes } from './dashboardSelectors';
import { PivotTable } from './PivotTable';
import { SunburstTab } from './SunburstTab';

export function OverviewTab({ rows, rawRows, mapping }: { rows: MasterSummaryRow[]; rawRows: MasterSummaryRow[]; mapping: MappingRow[] }) {
  const totalTime = rows.reduce((sum, row) => sum + row.Grand_Total_Time, 0);
  const products = new Set(rows.map((row) => row.Product));
  const items = topStackedItems(rows);
  const productTimes = productItemTimes(rows);
  const colors = ['#9333ea', '#16a34a', '#60a5fa', '#ca8a04', '#db2777', '#4ade80', '#f97316', '#06b6d4', '#e879f9', '#64748b', '#dc2626'];
  const legendItems = [...items, 'Others (其他)'];

  // Chart dimensions
  let maxTime = 0;
  for (const [, values] of productTimes) {
    const total = [...values.values()].reduce((s, v) => s + v, 0);
    if (total > maxTime) maxTime = total;
  }
  maxTime = maxTime || 1;
  const chartH = 380, padL = 55, padR = 10, padT = 15, padB = 75;
  const plotH = chartH - padT - padB;
  const chartW = Math.max(720, productTimes.size * 140);
  const plotW = chartW - padL - padR;
  const barW = Math.min(55, plotW / Math.max(productTimes.size, 1) * 0.65);
  const gap = plotW / Math.max(productTimes.size, 1);
  const ticks = 5;
  const yStep = Math.ceil(maxTime / ticks / 100) * 100 || Math.ceil(maxTime / ticks);

  return (
    <section aria-labelledby="overview-title">
      {/* KPI cards */}
      <h2 id="overview-title">🚀 核心戰情總覽</h2>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={kpiCard}><span style={kpiLabel}>符合條件的產品數</span><span style={kpiValue}>{products.size} 支產品</span></div>
        <div style={kpiCard}><span style={kpiLabel}>篩選後總測試秒數</span><span style={kpiValue}>{totalTime.toLocaleString(undefined, { maximumFractionDigits: 2 })} 秒</span></div>
        <div style={kpiCard}><span style={kpiLabel}>資料庫狀態</span><span style={kpiValue}>🟢 資料載入完畢</span></div>
      </div>
      <hr style={divider} />

      <section className="overview-chart-section" role="region" aria-label="跨產品時間結構對比">
          <h3>📊 跨產品時間結構對比</h3>
          <div className="overview-chart-scroll">
            <svg role="img" aria-label="堆疊條圖" width="100%" height={chartH} viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none" style={{ minWidth: chartW }}>
              {Array.from({ length: ticks + 1 }, (_, i) => {
                const val = i * yStep;
                if (val > maxTime * 1.1) return null;
                const y = padT + plotH - (val / maxTime) * plotH;
                return <g key={`y-${i}`}>
                  <line x1={padL} x2={padL + plotW} y1={y} y2={y} stroke="rgba(255,255,255,.08)" />
                  <text x={padL - 6} y={y + 4} textAnchor="end" fill="var(--muted)" fontSize="10">{val}</text>
                </g>;
              })}
              {[...productTimes].map(([product, values], pi) => {
                const segments = new Map<string, number>();
                for (const [item, time] of values) {
                  const key = items.has(item) ? item : 'Others (其他)';
                  segments.set(key, (segments.get(key) ?? 0) + time);
                }
                const cx = padL + gap * pi + gap / 2;
                const total = [...segments.values()].reduce((sum, time) => sum + time, 0);
                const totalY = Math.max(12, padT + plotH - (total / maxTime) * plotH - 8);
                let offsetY = 0;
                const meta = rows.find((r) => r.Product === product);
                return <g key={product}>
                  {[...segments].map(([item, time]) => {
                    const h = (time / maxTime) * plotH;
                    const y = padT + plotH - offsetY - h;
                    offsetY += h;
                    const ci = legendItems.indexOf(item) % colors.length;
                    return <rect key={item} x={cx - barW / 2} y={y} width={barW} height={h} fill={colors[ci]}><title>{`${item}: ${time.toFixed(2)}s`}</title></rect>;
                  })}
                  <text x={cx} y={totalY} textAnchor="middle" fill="var(--ink)" fontSize="12" fontWeight="bold">
                    {`${total.toFixed(1)}s`}
                  </text>
                  <text x={cx} y={padT + plotH + 14} textAnchor="middle" fill="var(--ink)" fontSize="11" fontWeight="bold">{product}</text>
                  <text x={cx} y={padT + plotH + 26} textAnchor="middle" fill="var(--muted)" fontSize="9">{meta?.Process ?? ''}</text>
                  <text x={cx} y={padT + plotH + 37} textAnchor="middle" fill="var(--muted)" fontSize="9">{meta?.Size ?? ''}</text>
                  <text x={cx} y={padT + plotH + 48} textAnchor="middle" fill="var(--muted)" fontSize="9">{meta?.Voltage ? `${meta.Voltage}V` : ''}</text>
                </g>;
              })}
            </svg>
          </div>
          <div className="overview-chart-legend" aria-label="跨產品時間結構圖例">
            {legendItems.map((item, index) => (
              <span key={item} className="overview-chart-legend-item">
                <span className="overview-chart-legend-swatch" style={{ backgroundColor: colors[index % colors.length] }} aria-hidden="true" />
                {item}
              </span>
            ))}
          </div>
      </section>

      <section className="overview-sunburst-section" role="region" aria-label="總體測試時間結構">
        <h3>🍩 總體測試時間結構 (Mode/Operation)</h3>
        {mapping.length > 0
          ? <SunburstTab rows={rawRows} mapping={mapping} />
          : <p style={{ color: 'var(--muted)' }}>請載入 Management_Mapping.xlsx 以解鎖旭日圖。</p>}
      </section>

      <section className="overview-pivot-section" role="region" aria-label="時間與次數樞紐分析總表">
        <h3 className="overview-pivot-title">⏱️ 時間與次數樞紐分析總表</h3>
        <div className="overview-pivot-table"><PivotTable rows={rows} valueField="Grand_Total_Time" /></div>
        <div className="overview-pivot-table"><PivotTable rows={rows} valueField="Total_Merged_Count" /></div>
      </section>
    </section>
  );
}

const kpiCard: React.CSSProperties = {
  flex: '1 1 180px',
  padding: '16px 20px',
  background: 'linear-gradient(135deg, rgba(30,60,100,.7), rgba(10,25,50,.8))',
  border: '1px solid rgba(148,163,184,.2)',
  borderRadius: 12
};
const kpiLabel: React.CSSProperties = { display: 'block', color: 'var(--muted)', fontSize: '.82rem' };
const kpiValue: React.CSSProperties = { display: 'block', color: 'var(--ink)', fontSize: '1.3rem', fontWeight: 800, marginTop: 4 };
const divider: React.CSSProperties = { borderColor: 'rgba(148,163,184,.15)', margin: '24px 0' };
