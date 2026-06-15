(function setupKpiCompareReact(global) {
  const roots = new WeakMap();
  const e = global.React.createElement;

  function ensureRoot(container) {
    let root = roots.get(container);
    if (!root) {
      root = global.ReactDOM.createRoot(container);
      roots.set(container, root);
    }
    return root;
  }

  function clear(container) {
    if (!container) return;
    const root = roots.get(container);
    if (root) root.render(null);
    else container.innerHTML = "";
  }

  function formatValue(value, decimals) {
    return Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  function MetricCard(props) {
    const title = props.title;
    const unit = props.unit;
    const decimals = props.decimals || 0;
    const rows = props.rows || [];
    const metricKey = props.metricKey;
    const maxValue = Math.max(0, ...rows.map((row) => Number(row[metricKey] || 0)));

    return e(
      "div",
      { className: "kpi-react-box" },
      e("h3", { className: "kpi-react-title" }, title),
      e(
        "div",
        { className: "kpi-react-list" },
        rows.map(function renderRow(row, idx) {
          const value = Number(row[metricKey] || 0);
          const ratio = maxValue > 0 ? Math.max(0.015, value / maxValue) : 0;
          return e(
            "div",
            { className: "kpi-react-row", key: title + "-" + row.productName },
            e("div", { className: "kpi-react-label", title: row.productName }, row.productName),
            e(
              "div",
              { className: "kpi-react-track" },
              e("div", {
                className: "kpi-react-fill",
                style: {
                  width: ratio > 0 ? String(Math.min(100, ratio * 100)) + "%" : "0%",
                  background: props.colors[idx % props.colors.length] || "#3b82f6",
                },
              }),
            ),
            e("div", { className: "kpi-react-value" }, formatValue(value, decimals) + (unit ? " " + unit : "")),
          );
        }),
      ),
    );
  }

  function KpiPanel(props) {
    const rows = props.rows || [];
    const colors = props.colors || ["#3b82f6"];
    return e(
      "div",
      null,
      e("div", { className: "kpi-chart-meta" }, "站點：" + (props.stationName || "-")),
      e(
        "div",
        { className: "kpi-react-grid" },
        e(MetricCard, { title: "單次 Touch Down 時間", metricKey: "touchDownAvgSeconds", unit: "s", decimals: 3, rows, colors }),
        e(MetricCard, { title: "Test Item 種類數", metricKey: "itemCount", unit: "", decimals: 0, rows, colors }),
        e(MetricCard, { title: "測試站點時間", metricKey: "stationMinutes", unit: "min", decimals: 3, rows, colors }),
        e(MetricCard, { title: "Touch Down 數", metricKey: "touchDownCount", unit: "", decimals: 0, rows, colors }),
      ),
    );
  }

  function render(container, props) {
    if (!container || !props || !Array.isArray(props.rows) || props.rows.length === 0) {
      clear(container);
      return;
    }
    const root = ensureRoot(container);
    root.render(e(KpiPanel, props));
  }

  global.KpiCompareReact = { render, clear };
})(window);
