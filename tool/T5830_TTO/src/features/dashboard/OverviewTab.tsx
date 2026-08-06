import type { MappingRow } from '../../lib/workbook';
import type { MasterSummaryRow } from '../../types/analysis';
import { SunburstTab } from './SunburstTab';

export function OverviewTab({ rawRows, mapping }: { rawRows: MasterSummaryRow[]; mapping: MappingRow[] }) {
  return (
    <section aria-labelledby="overview-title">
      <h2 id="overview-title">🚀 儀表板總覽</h2>
      <SunburstTab rows={rawRows} mapping={mapping} showTree={false} />
    </section>
  );
}
