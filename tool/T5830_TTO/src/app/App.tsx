import { useState } from 'react';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { PipelinePage } from '../features/pipeline/PipelinePage';
import type { MasterSummaryRow } from '../types/analysis';

export function App() {
  const [view, setView] = useState<'pipeline' | 'dashboard'>('pipeline');
  const [summaries, setSummaries] = useState<MasterSummaryRow[]>([]);
  const [processing, setProcessing] = useState(false);

  function navigate(target: 'pipeline' | 'dashboard') {
    if (processing) return; // 分析中禁止切換
    setView(target);
  }

  return (
    <main className="app-shell">
      <nav className="app-nav" aria-label="主要導覽">
        <button className="brand" type="button" onClick={() => navigate('pipeline')}>T5830<span>INSIGHT</span></button>
        <div className="nav-actions">
          <button className={view === 'pipeline' ? 'nav-link active' : 'nav-link'} type="button"
            disabled={processing} onClick={() => navigate('pipeline')}>Pipeline</button>
          <button className={view === 'dashboard' ? 'nav-link active' : 'nav-link'} type="button"
            disabled={processing} onClick={() => navigate('dashboard')}>Dashboard</button>
        </div>
      </nav>
      {view === 'pipeline'
        ? <PipelinePage
            onProcessing={setProcessing}
            onComplete={(report) => {
              setProcessing(false);
              setSummaries(report.masterSummary);
              setView('dashboard');
            }} />
        : <DashboardPage summaries={summaries} />}
      <footer style={{ textAlign: 'center', padding: '32px 16px 24px', fontSize: '0.8em', color: 'var(--muted)', borderTop: '1px solid rgba(88,202,255,.1)', marginTop: 48 }}>
        <p style={{ margin: '0 0 4px' }}>ATE/Test Time Analysis Tool by PP20 YCWu &amp; PP32 YPLu (Desmond)</p>
        <p style={{ margin: 0 }}>Contact: yplu@winbond.com ｜ Copyright © 2026 PP32 YPLu (Desmond) ｜ MIT License</p>
      </footer>
    </main>
  );
}
