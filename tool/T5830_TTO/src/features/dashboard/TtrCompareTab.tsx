import type { ChangeEvent } from 'react';
import type { MasterSummaryRow } from '../../types/analysis';
import { readMasterSummaryWorkbook } from '../../lib/workbook';

type Props = {
  baseline: MasterSummaryRow[];
  optimized: MasterSummaryRow[];
  onLoad: (kind: 'baseline' | 'optimized', rows: MasterSummaryRow[]) => void;
  error: string;
  onError: (error: string) => void;
};

function totalsByItem(rows: MasterSummaryRow[]) {
  return rows.reduce((totals, row) => {
    totals.set(row.Test_Item_Merged, (totals.get(row.Test_Item_Merged) ?? 0) + row.Grand_Total_Time);
    return totals;
  }, new Map<string, number>());
}

const pieColors = ['#2E86C1', '#27AE60', '#E74C3C', '#F39C12', '#8E44AD', '#1ABC9C', '#D35400', '#2C3E50', '#C0392B', '#16A085', '#7D3C98', '#F1C40F', '#E67E22', '#3498DB', '#9B59B6', '#85C1E9', '#A9DFBF', '#F5B7B1', '#FAD7A0', '#D2B4DE'];

function polarToXY(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** 簡易甜甜圈圖 */
function DonutChart({ data, title, size = 280 }: { data: Map<string, number>; title: string; size?: number }) {
  const total = [...data.values()].reduce((s, v) => s + v, 0);
  if (total === 0) return <div style={{ textAlign: 'center', width: size }}><p style={{ color: 'var(--muted)' }}>無資料</p></div>;

  const sorted = [...data.entries()].sort((a, b) => b[1] - a[1]);
  const cx = size / 2, cy = size / 2, outerR = size / 2 - 10, innerR = outerR * 0.5;
  let angle = 0;

  const arcs = sorted.map(([label, value], i) => {
    const sweep = (value / total) * 360;
    const start = angle;
    angle += sweep;
    const large = sweep > 180 ? 1 : 0;
    const s1 = polarToXY(cx, cy, outerR, start);
    const e1 = polarToXY(cx, cy, outerR, start + sweep);
    const s2 = polarToXY(cx, cy, innerR, start + sweep);
    const e2 = polarToXY(cx, cy, innerR, start);
    const d = `M${s1.x},${s1.y} A${outerR},${outerR},0,${large},1,${e1.x},${e1.y} L${s2.x},${s2.y} A${innerR},${innerR},0,${large},0,${e2.x},${e2.y} Z`;
    const mid = start + sweep / 2;
    const labelR = (outerR + innerR) / 2;
    const labelPos = polarToXY(cx, cy, labelR, mid);
    const pct = ((value / total) * 100).toFixed(0);
    return { label, d, color: pieColors[i % pieColors.length], labelPos, pct, sweep };
  });

  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontWeight: 'bold', marginBottom: 8 }}>{title}</p>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {arcs.map((arc, i) => (
          <g key={i}>
            <path d={arc.d} fill={arc.color} stroke="rgba(0,0,0,.3)" strokeWidth="1">
              <title>{`${arc.label}: ${arc.pct}%`}</title>
            </path>
            {arc.sweep > 12 && (
              <text x={arc.labelPos.x} y={arc.labelPos.y} textAnchor="middle" dominantBaseline="middle"
                fill="#fff" fontSize={arc.sweep > 25 ? '10' : '7'} fontWeight="bold" pointerEvents="none">
                {arc.label}
                {arc.sweep > 18 && <tspan x={arc.labelPos.x} dy="12" fontSize="9">{arc.pct}%</tspan>}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

function buildDatasetCsvRows(dataset: string, data: Map<string, number>) {
  const total = [...data.values()].reduce((s, v) => s + v, 0) || 1;
  return [...data.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([item, time]) => `${dataset},${item},${time.toFixed(2)},${((time / total) * 100).toFixed(2)}%`);
}

function downloadCombinedCsv(before: Map<string, number>, after: Map<string, number>, savings: Map<string, number>) {
  const lines = ['Dataset,Test_Item,Time(s),Ratio(%)'];
  lines.push(...buildDatasetCsvRows('Baseline', before));
  lines.push(...buildDatasetCsvRows('Optimized', after));
  lines.push(...buildDatasetCsvRows('Savings', savings));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'ttr_combined_ratio.csv'; a.click();
  URL.revokeObjectURL(url);
}

export function TtrCompareTab({ baseline, optimized, onLoad, error, onError }: Props) {
  async function load(kind: 'baseline' | 'optimized', event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      onError('TTR 僅支援 .xlsx Master Summary 檔案');
      return;
    }
    try {
      onLoad(kind, await readMasterSummaryWorkbook(file));
      onError('');
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : '無法讀取 Master Summary');
    }
  }

  // 上傳區（始終顯示）
  const uploadSection = (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 24 }}>
      <label style={{ flex: 1 }}>
        🔴 優化前 Master Summary
        <input type="file" accept=".xlsx" onChange={(event) => load('baseline', event)} />
        {baseline.length > 0 && <span style={{ fontSize: '0.8em', color: '#16a34a' }}> ✓ 已載入</span>}
      </label>
      <label style={{ flex: 1 }}>
        🟢 優化後 Master Summary
        <input type="file" accept=".xlsx" onChange={(event) => load('optimized', event)} />
        {optimized.length > 0 && <span style={{ fontSize: '0.8em', color: '#16a34a' }}> ✓ 已載入</span>}
      </label>
    </div>
  );

  if (baseline.length === 0 || optimized.length === 0) {
    return (
      <section aria-labelledby="ttr-title">
        <h2 id="ttr-title">📊 TTR 優化效益成果戰報</h2>
        <p>請載入優化前與優化後兩份 Master Summary .xlsx 檔案，以計算實際 TTR 增減。</p>
        {uploadSection}
        {error && <p role="alert">{error}</p>}
      </section>
    );
  }

  const before = totalsByItem(baseline);
  const after = totalsByItem(optimized);
  const totalBefore = [...before.values()].reduce((s, v) => s + v, 0);
  const totalAfter = [...after.values()].reduce((s, v) => s + v, 0);
  const saved = totalBefore - totalAfter;
  const ttrRate = totalBefore > 0 ? (saved / totalBefore) * 100 : 0;

  // Savings donut: 只顯示有節省的測項
  const savingsMap = new Map<string, number>();
  for (const [item, bTime] of before) {
    const aTime = after.get(item) ?? 0;
    const delta = bTime - aTime;
    if (delta > 0) savingsMap.set(item, delta);
  }

  return (
    <section aria-labelledby="ttr-title">
      <h2 id="ttr-title">📊 TTR 優化效益成果戰報</h2>
      {uploadSection}

      {/* KPI Cards */}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 32 }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <p style={{ margin: 0, fontSize: '0.85em' }}>🔴 優化前總測試時間</p>
          <p style={{ margin: '4px 0', fontSize: '2em', fontWeight: 'bold' }}>{totalBefore.toFixed(2)} 秒</p>
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <p style={{ margin: 0, fontSize: '0.85em' }}>🟢 優化後總測試時間</p>
          <p style={{ margin: '4px 0', fontSize: '2em', fontWeight: 'bold' }}>{totalAfter.toFixed(2)} 秒</p>
          <p style={{ margin: 0, fontSize: '0.85em', color: saved >= 0 ? '#16a34a' : '#dc2626' }}>
            {saved >= 0 ? '↑' : '↓'} {Math.abs(saved).toFixed(2)} 秒
          </p>
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <p style={{ margin: 0, fontSize: '0.85em' }}>🏆 總體 TTR 改善率</p>
          <p style={{ margin: '4px 0', fontSize: '2em', fontWeight: 'bold' }}>{ttrRate.toFixed(2)} %</p>
        </div>
      </div>

      {/* 結構佔比圖 */}
      <h3>🍩 結構佔比變化與優化貢獻 (左：優化前 ｜ 中：優化後 ｜ 右：成功省下的時間貢獻)</h3>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 32 }}>
        <DonutChart data={before} title="🔴 優化前 (Baseline)" />
        <DonutChart data={after} title="🟢 優化後 (Optimized)" />
        {savingsMap.size > 0
          ? <DonutChart data={savingsMap} title="🏆 貢獻 (Savings)" />
          : <div style={{ width: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ padding: 16, borderRadius: 8, background: 'rgba(255,200,50,.1)', color: 'var(--muted)' }}>
                沒有測項顯著節省時間。
              </p>
            </div>
        }
      </div>

      {/* CSV 下載 */}
      <h3>📂 工作大項佔比數據下載：</h3>
      <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
        <button className="secondary-action" type="button"
          style={{ fontSize: '0.8em', padding: '8px 16px', fontWeight: 'normal' }}
          onClick={() => downloadCombinedCsv(before, after, savingsMap)}>
          📥 下載整合佔比 (CSV)
        </button>
      </div>

      {/* 明細表 */}
      <table>
        <caption>優化前後測試時間差異</caption>
        <thead><tr><th>測項</th><th>優化前 (s)</th><th>優化後 (s)</th><th>節省 (s)</th><th>改善率</th></tr></thead>
        <tbody>{[...new Set([...before.keys(), ...after.keys()])].sort().map((item) => {
          const bTime = before.get(item) ?? 0;
          const aTime = after.get(item) ?? 0;
          const delta = bTime - aTime;
          const pct = bTime > 0 ? (delta / bTime) * 100 : 0;
          return (
            <tr key={item} style={{ color: delta > 0 ? '#16a34a' : delta < 0 ? '#dc2626' : 'var(--ink)' }}>
              <th scope="row">{item}</th>
              <td>{bTime.toFixed(2)}</td>
              <td>{aTime.toFixed(2)}</td>
              <td>{delta.toFixed(2)}</td>
              <td>{pct.toFixed(1)}%</td>
            </tr>
          );
        })}</tbody>
      </table>
    </section>
  );
}
