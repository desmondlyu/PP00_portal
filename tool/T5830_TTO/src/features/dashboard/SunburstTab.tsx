import type { MasterSummaryRow } from '../../types/analysis';
import type { MappingRow } from '../../lib/workbook';
import { SunburstTree } from './SunburstTree';

type Segment = { label: string; value: number; color: string };

const modeColors: Record<string, string> = {
  'User Mode': '#A9DFBF', 'Test Mode': '#2E86C1', 'UM PGM': '#27AE60', 'UM ERS': '#E74C3C',
  'UM READ': '#3498DB', 'TM PGM': '#85C1E9', 'TM ERS': '#1A5276', 'TM SEC ERS': '#154360',
  'TM BLK ERS': '#1B4F72', 'CAM WR': '#C0392B', 'DR': '#8E44AD', 'MR': '#F39C12',
  'Not Classified': '#5D6D7E'
};

function getColor(label: string, index: number): string {
  if (modeColors[label]) return modeColors[label];
  const palette = ['#2E86C1', '#27AE60', '#E74C3C', '#F39C12', '#8E44AD', '#1ABC9C', '#D35400', '#2C3E50', '#C0392B', '#16A085', '#7D3C98', '#F1C40F', '#E67E22', '#3498DB', '#9B59B6'];
  return palette[index % palette.length];
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r1: number, r2: number, startAngle: number, endAngle: number) {
  const large = endAngle - startAngle > 180 ? 1 : 0;
  const s1 = polarToCartesian(cx, cy, r2, startAngle);
  const e1 = polarToCartesian(cx, cy, r2, endAngle);
  const s2 = polarToCartesian(cx, cy, r1, endAngle);
  const e2 = polarToCartesian(cx, cy, r1, startAngle);
  return `M${s1.x},${s1.y} A${r2},${r2},0,${large},1,${e1.x},${e1.y} L${s2.x},${s2.y} A${r1},${r1},0,${large},0,${e2.x},${e2.y} Z`;
}

/** 單一產品的旭日圖 */
function SingleSunburst({ rows, mapping, title }: { rows: MasterSummaryRow[]; mapping: MappingRow[]; title: string }) {
  const mappings = new Map(mapping.map((row) => [row.Original_Item_Name, row]));

  const modeMap = new Map<string, number>();
  const opMap = new Map<string, { mode: string; time: number }>();

  for (const row of rows) {
    const m = mappings.get(row.Original_Item_Name);
    const mode = m?.Mode || 'Not Classified';
    const op = m?.Operation || 'Not Classified';
    modeMap.set(mode, (modeMap.get(mode) ?? 0) + row.Grand_Total_Time);
    const key = `${mode}\x00${op}`;
    const existing = opMap.get(key);
    if (existing) existing.time += row.Grand_Total_Time;
    else opMap.set(key, { mode, time: row.Grand_Total_Time });
  }

  const total = [...modeMap.values()].reduce((s, v) => s + v, 0);
  if (total === 0) return <p>無資料</p>;

  const modes: Segment[] = [...modeMap].sort((a, b) => b[1] - a[1]).map(([label, value], i) => ({ label, value, color: getColor(label, i) }));
  const ops = [...opMap].sort((a, b) => b[1].time - a[1].time).map(([key, { mode, time }]) => ({ key, mode, label: key.split('\x00')[1], time }));

  const cx = 180, cy = 180, innerR1 = 55, innerR2 = 105, outerR1 = 110, outerR2 = 165;

  let angle = 0;
  const innerArcs = modes.map((seg) => {
    const sweep = (seg.value / total) * 360;
    const start = angle;
    angle += sweep;
    const mid = start + sweep / 2;
    const labelPos = polarToCartesian(cx, cy, (innerR1 + innerR2) / 2, mid);
    const pct = ((seg.value / total) * 100).toFixed(0);
    return { ...seg, start, end: angle, mid, labelPos, pct, sweep };
  });

  angle = 0;
  const outerArcs: Array<{ label: string; time: number; color: string; start: number; end: number; labelPos: { x: number; y: number }; pct: string; sweep: number }> = [];
  for (const modeSeg of modes) {
    const modeOps = ops.filter((o) => o.mode === modeSeg.label).sort((a, b) => b.time - a.time);
    for (const op of modeOps) {
      const sweep = (op.time / total) * 360;
      const start = angle;
      angle += sweep;
      const mid = start + sweep / 2;
      const labelPos = polarToCartesian(cx, cy, (outerR1 + outerR2) / 2, mid);
      const pct = ((op.time / total) * 100).toFixed(0);
      outerArcs.push({ label: op.label, time: op.time, color: modeSeg.color, start, end: angle, labelPos, pct, sweep });
    }
  }

  return (
    <div style={{ display: 'inline-block', verticalAlign: 'top', margin: '0 12px 24px' }}>
      <h3 style={{ textAlign: 'center' }}>{title} ({total.toFixed(1)}s)</h3>
      <svg role="img" aria-label={`${title} 旭日圖`} width="360" height="360" viewBox="0 0 360 360">
        {outerArcs.map((arc, i) => (
          <g key={`o-${i}`}>
            <path d={arcPath(cx, cy, outerR1, outerR2, arc.start, arc.end)} fill={arc.color} stroke="rgba(0,0,0,.4)" strokeWidth="1" opacity="0.85">
              <title>{`${arc.label}: ${arc.time.toFixed(2)}s (${arc.pct}%)`}</title>
            </path>
            {arc.sweep > 10 && <text x={arc.labelPos.x} y={arc.labelPos.y} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={arc.sweep > 20 ? '9' : '7'} fontWeight="bold" pointerEvents="none">
              {arc.label}
              {arc.sweep > 16 && <tspan x={arc.labelPos.x} dy="11" fontSize="8">{arc.pct}%</tspan>}
            </text>}
          </g>
        ))}
        {innerArcs.map((arc, i) => (
          <g key={`i-${i}`}>
            <path d={arcPath(cx, cy, innerR1, innerR2, arc.start, arc.end)} fill={arc.color} stroke="rgba(0,0,0,.5)" strokeWidth="1.5">
              <title>{`${arc.label}: ${arc.value.toFixed(2)}s (${arc.pct}%)`}</title>
            </path>
            {arc.sweep > 14 && <text x={arc.labelPos.x} y={arc.labelPos.y} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={arc.sweep > 30 ? '11' : '8'} fontWeight="bold" pointerEvents="none">
              {arc.label}
              <tspan x={arc.labelPos.x} dy="12" fontSize="9">{arc.pct}%</tspan>
            </text>}
          </g>
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--muted)" fontSize="10">總時間</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--ink)" fontSize="12" fontWeight="bold">{total.toFixed(1)}s</text>
      </svg>
    </div>
  );
}

export function SunburstTab({ rows, mapping = [] }: { rows: MasterSummaryRow[]; mapping?: MappingRow[] }) {
  // ponytail: 按產品分開顯示各自旭日圖
  const byProduct = new Map<string, MasterSummaryRow[]>();
  for (const row of rows) {
    const list = byProduct.get(row.Product) ?? [];
    list.push(row);
    byProduct.set(row.Product, list);
  }

  const products = [...byProduct.keys()].sort();
  if (products.length === 0) return <section><h2>多維度旭日圖</h2><p>無資料可顯示。</p></section>;

  return (
    <section aria-labelledby="sunburst-title">
      <h2 id="sunburst-title">多維度旭日圖 (Mode / Operation)</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
        {products.map((product) => (
          <SingleSunburst key={product} rows={byProduct.get(product)!} mapping={mapping} title={product} />
        ))}
      </div>
      {products.map((product) => (
        <SunburstTree key={`tree-${product}`} rows={byProduct.get(product)!} mapping={mapping} title={product} />
      ))}
    </section>
  );
}
