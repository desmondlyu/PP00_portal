import type { MasterSummaryRow } from '../../types/analysis';
import { PivotTable } from './PivotTable';

export function CountTab({ rows }: { rows: MasterSummaryRow[] }) {
  return (
    <section aria-labelledby="count-title">
      <h2 id="count-title">🔢 測試次數 (Counts) 樞紐分析</h2>
      <PivotTable rows={rows} valueField="Total_Merged_Count" />
    </section>
  );
}
