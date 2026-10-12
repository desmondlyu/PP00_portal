import React, {useEffect, useState} from 'react';
import {supabaseAdmin} from '../utils/supabaseClient';
import {buildMonthlySeries, rankTools, taipeiYearMonth} from '../utils/usageAnalytics.mjs';

const number = value => value.toLocaleString('zh-TW');

export function UsageReport({rows, tools, year, month, toolId}) {
  const counts = buildMonthlySeries(rows, toolId);
  const total = counts.reduce((a,b) => a+b, 0);
  const max = Math.max(2, Math.ceil(Math.max(...counts) / 2) * 2);
  const ranking = rankTools(rows, tools, month);
  const title = tools.find(tool => tool.id === toolId)?.title || '全部應用程式';
  return <>
    <div className="usage-summary">
      <div><span>{year} 年累計點擊</span><strong>{number(total)}<small> 次</small></strong></div>
      <div><span>{month} 月點擊</span><strong>{number(counts[month-1])}<small> 次</small></strong></div>
      <div><span>統計範圍</span><b>{title}</b></div>
    </div>
    <div className="usage-chart-heading"><h5>每月點擊趨勢</h5><span>單位：次</span></div>
    {total === 0 && <p className="usage-empty">此範圍尚無已記錄的點擊。</p>}
    <div className="usage-chart-scroll" tabIndex={0} aria-label="每月點擊長條圖，可左右捲動">
      <svg className="usage-chart" viewBox="0 0 660 240" role="img" aria-label={`${year} 年 ${title} 每月點擊數：${counts.map((n,i)=>`${i+1}月 ${n}次`).join('，')}`}>
        {[0, .5, 1].map(ratio => <g key={ratio}>
          <line x1="48" x2="650" y1={190-ratio*150} y2={190-ratio*150} stroke="#d5deea" strokeDasharray={ratio ? '3 4' : undefined}/>
          <text x="40" y={194-ratio*150} textAnchor="end" className="usage-axis">{number(Math.ceil(max*ratio))}</text>
        </g>)}
        {counts.map((value,i) => <g key={i}>
          <title>{i+1} 月：{number(value)} 次</title>
          <rect x={58+i*49} y={190-value/max*150} width="28" height={value/max*150} rx="3" fill={i+1===month ? '#1767b4' : '#8caecf'}/>
          <text x={72+i*49} y={180-value/max*150} textAnchor="middle" className="usage-value">{number(value)}</text>
          <text x={72+i*49} y="215" textAnchor="middle" className="usage-axis">{i+1}月</text>
        </g>)}
      </svg>
    </div>
    <div className="usage-chart-heading"><h5>{month} 月應用程式排行</h5><span>全部應用程式</span></div>
    <div className="usage-table-scroll" tabIndex={0} aria-label="各應用程式點擊數">
      <table className="usage-table">
        <caption className="usage-sr-only">{year} 年各應用程式點擊統計</caption>
        <thead><tr><th scope="col">應用程式</th><th scope="col">{month} 月</th><th scope="col">全年</th></tr></thead>
        <tbody>{ranking.map(tool => <tr key={tool.id}><th scope="row">{tool.title}</th><td>{number(tool.monthClicks)}</td><td>{number(tool.yearClicks)}</td></tr>)}</tbody>
      </table>
    </div>
  </>;
}

export default function UsageDashboard({tools}) {
  const now = taipeiYearMonth();
  const [year, setYear] = useState(now.year);
  const [month, setMonth] = useState(now.month);
  const [toolId, setToolId] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState({year: null, rows: null, error: '', loadedAt: ''});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setResult({year, rows:null, error:'', loadedAt:''});
    (async () => {
      try {
        if (!supabaseAdmin) throw new Error('統計服務尚未設定。');
        const {data, error} = await supabaseAdmin.rpc('get_portal_tool_clicks', {p_year: year});
        if (error) {
          if (['PGRST202','42P01','42883'].includes(error.code)) throw new Error('點擊統計尚未啟用，請先完成 Supabase 統計資料表設定。');
          throw new Error('無法讀取點擊統計，請確認管理員權限或網路後重試。');
        }
        if (!cancelled) setResult({year, rows:data || [], error:'', loadedAt:new Date().toLocaleTimeString('zh-TW', {timeZone:'Asia/Taipei', hour:'2-digit', minute:'2-digit'})});
      } catch (error) {
        if (!cancelled) setResult({year, rows:null, error:error.message, loadedAt:''});
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {cancelled = true;};
  }, [year, refresh]);
  const pending = loading || result.year !== year;
  return <section className="usage-dashboard" aria-labelledby="usage-heading">
    <h4 id="usage-heading">應用程式使用統計</h4>
    <p className="usage-note">統計入口網站「啟動應用程式」的點擊次數，依台灣時間按月彙整。重複啟動會再次計數，非不重複使用人數。</p>
    <div className="usage-filters">
      <label>年份<select value={year} onChange={e=>setYear(Number(e.target.value))}>{Array.from({length: Math.max(1, now.year-2026+1)}, (_,i)=>now.year-i).map(y=><option key={y} value={y}>{y} 年</option>)}</select></label>
      <label>排行月份<select value={month} onChange={e=>setMonth(Number(e.target.value))}>{Array.from({length:12},(_,i)=><option key={i} value={i+1}>{i+1} 月</option>)}</select></label>
      <label className="usage-tool-filter">趨勢應用程式<select value={toolId} onChange={e=>setToolId(e.target.value)}><option value="">全部應用程式</option>{tools.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
      <button type="button" onClick={()=>setRefresh(n=>n+1)} disabled={pending}>重新整理</button>
    </div>
    {pending ? <p role="status" className="usage-status">正在讀取統計…</p> : result.error ? <p role="alert" className="usage-error">{result.error}</p> : <UsageReport rows={result.rows} tools={tools} year={year} month={month} toolId={toolId}/>}
    <p className="usage-note">僅包含統計啟用後成功送出的點擊；不補算歷史資料、直接網址開啟或工具內操作。網路中斷可能漏計。{!pending && result.loadedAt && ` 更新時間 ${result.loadedAt}（台灣時間）。`}</p>
  </section>;
}
