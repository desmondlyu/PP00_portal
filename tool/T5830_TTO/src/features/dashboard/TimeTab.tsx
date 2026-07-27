import type { MasterSummaryRow } from '../../types/analysis';
import { PivotTable, RatioTable } from './PivotTable';

export function TimeTab({ rows }: { rows: MasterSummaryRow[] }) {
  return (
    <section aria-labelledby="time-title">
      <h2 id="time-title">⏱️ 測試時間 (Seconds) 樞紐分析</h2>
      <PivotTable rows={rows} valueField="Grand_Total_Time" />
      <hr style={{ borderColor: 'rgba(148,163,184,.2)', margin: '28px 0' }} />
      <h2>📊 測試時間佔比 (%) 樞紐分析</h2>
      <p style={{ color: 'var(--muted)' }}>顯示各測項佔該產品 <strong>總測試時間</strong> 的百分比。</p>
      <RatioTable rows={rows} />
    </section>
  );
}
