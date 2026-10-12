export function taipeiYearMonth(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en', {timeZone: 'Asia/Taipei', year: 'numeric', month: 'numeric'}).formatToParts(date);
  return {year: Number(parts.find(p => p.type === 'year').value), month: Number(parts.find(p => p.type === 'month').value)};
}

export function buildMonthlySeries(rows, toolId = '') {
  const counts = Array(12).fill(0);
  for (const row of rows) {
    if ((!toolId || row.tool_id === toolId) && row.month >= 1 && row.month <= 12) counts[row.month - 1] += Number(row.clicks);
  }
  return counts;
}

export function rankTools(rows, tools, month) {
  return tools.map(tool => {
    const counts = buildMonthlySeries(rows, tool.id);
    return {id: tool.id, title: tool.title, monthClicks: counts[month - 1], yearClicks: counts.reduce((a,b) => a+b, 0)};
  }).sort((a,b) => b.monthClicks - a.monthClicks || b.yearClicks - a.yearClicks || a.title.localeCompare(b.title));
}

// Best effort: analytics failure must never prevent opening an application.
export async function recordToolClick(client, toolId) {
  if (!client) return false;
  try {
    const {error} = await client.rpc('record_portal_tool_click', {p_tool_id: toolId, p_event_id: crypto.randomUUID()});
    return !error;
  } catch {
    return false;
  }
}
