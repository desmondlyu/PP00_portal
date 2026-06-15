(function setupSiteTdHeatmapReact(global) {
  const roots = new WeakMap();
  const e = global.React.createElement;
  const useState = global.React.useState;
  const useEffect = global.React.useEffect;
  const SITES_PER_PAGE = 24;

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
    if (root) {
      root.render(null);
    } else {
      container.innerHTML = "";
    }
  }

  function getHeatColor(value, maxValue) {
    if (!maxValue || value <= 0) return "rgba(30,41,59,0.55)";
    const ratio = Math.max(0, Math.min(1, value / maxValue));
    const stops = ["#1e293b", "#2563eb", "#06b6d4", "#22c55e", "#f59e0b", "#ef4444"];
    const scaled = ratio * (stops.length - 1);
    const idx = Math.floor(scaled);
    const localT = scaled - idx;
    const c1 = hexToRgb(stops[idx]);
    const c2 = hexToRgb(stops[Math.min(idx + 1, stops.length - 1)]);
    const r = Math.round(c1.r + (c2.r - c1.r) * localT);
    const g = Math.round(c1.g + (c2.g - c1.g) * localT);
    const b = Math.round(c1.b + (c2.b - c1.b) * localT);
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  function hexToRgb(hex) {
    const clean = hex.replace("#", "");
    const num = parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  }

  function buildModel(siteTdMap) {
    const tdSet = new Set();
    const siteLabels = Array.from(siteTdMap.keys()).sort(function sortSite(a, b) {
      if (a === "Unknown") return 1;
      if (b === "Unknown") return -1;
      return Number(a) - Number(b);
    });

    for (const tdMap of siteTdMap.values()) {
      for (const td of tdMap.keys()) tdSet.add(td);
    }
    const tdLabels = Array.from(tdSet).sort(function sortTd(a, b) {
      return Number(a) - Number(b);
    });

    let maxValue = 0;
    const matrix = siteLabels.map(function mapSite(site) {
      const tdMap = siteTdMap.get(site) || new Map();
      return tdLabels.map(function mapTd(td) {
        const v = tdMap.get(td) || 0;
        if (v > maxValue) maxValue = v;
        return v;
      });
    });

    return { tdLabels, siteLabels, matrix, maxValue };
  }

  function HeatmapBoard(props) {
    const tdLabels = props.tdLabels;
    const siteEntries = props.siteEntries;
    const matrix = props.matrix;
    const maxValue = props.maxValue;
    const colCount = Math.max(1, siteEntries.length);
    const rowCount = Math.max(1, tdLabels.length);
    const gridStyle = {
      gridTemplateColumns: "92px repeat(" + String(colCount) + ", minmax(0, 1fr))",
      gridTemplateRows: "40px repeat(" + String(rowCount) + ", minmax(0, 1fr))",
    };
    const cells = [];

    cells.push(e("div", { key: "corner", className: "heatmap-cell heatmap-corner" }, "TD \\ SITE"));

    for (const entry of siteEntries) {
      cells.push(
        e(
          "div",
          { key: "th-site-" + entry.site, className: "heatmap-cell heatmap-head-cell" },
          formatSiteLabel(entry.site),
        ),
      );
    }

    tdLabels.forEach(function renderTdRow(td, tdIndex) {
      cells.push(
        e("div", { key: "th-td-" + td, className: "heatmap-cell heatmap-side-cell" }, formatTdLabel(td)),
      );

      siteEntries.forEach(function renderCell(entry) {
        const site = entry.site;
        const value = matrix[entry.siteIndex][tdIndex];
        const style = { background: getHeatColor(value, maxValue) };
        const title = "TD " + formatTdLabel(td) + ", SITE " + formatSiteLabel(site) + ": " + value.toFixed(3) + " s";
        cells.push(
          e(
            "div",
            { key: "cell-td-" + td + "-site-" + site, className: "heatmap-cell heatmap-value-cell", style: style, title: title },
            value > 0 ? value.toFixed(1) : "-",
          ),
        );
      });
    });

    return e(
      "div",
      { className: "heatmap-board-shell" },
      e("div", { className: "heatmap-board", style: gridStyle }, cells),
    );
  }

  function HeatmapPanel(props) {
    const totalSites = props.siteLabels.length;
    const totalPages = Math.max(1, Math.ceil(totalSites / SITES_PER_PAGE));
    const state = useState(0);
    const page = state[0];
    const setPage = state[1];

    useEffect(
      function keepPageInRange() {
        if (page > totalPages - 1) setPage(0);
      },
      [page, totalPages],
    );

    const currentPage = Math.max(0, Math.min(totalPages - 1, page));
    const start = currentPage * SITES_PER_PAGE;
    const end = Math.min(totalSites, start + SITES_PER_PAGE);
    const siteEntries = props.siteLabels.slice(start, end).map(function mapEntry(site, idx) {
      return { site: site, siteIndex: start + idx };
    });

    return e(
      "div",
      { className: "heatmap-panel" },
      e(
        "div",
        { className: "heatmap-pager" },
        e(
          "button",
          {
            type: "button",
            className: "pager-btn",
            onClick: function onPrev() {
              setPage(Math.max(0, currentPage - 1));
            },
            disabled: currentPage === 0,
          },
          "← 上一頁",
        ),
        e(
          "div",
          { className: "pager-meta" },
          "SITE 分頁 ",
          String(currentPage + 1),
          " / ",
          String(totalPages),
          "（",
          String(start + 1),
          "-",
          String(end),
          " / ",
          String(totalSites),
          "）",
        ),
        e(
          "button",
          {
            type: "button",
            className: "pager-btn",
            onClick: function onNext() {
              setPage(Math.min(totalPages - 1, currentPage + 1));
            },
            disabled: currentPage >= totalPages - 1,
          },
          "下一頁 →",
        ),
      ),
      e(HeatmapBoard, {
        tdLabels: props.tdLabels,
        siteEntries: siteEntries,
        matrix: props.matrix,
        maxValue: props.maxValue,
      }),
    );
  }

  function formatSiteLabel(site) {
    if (site === "Unknown") return "?";
    const n = Number(site);
    return Number.isFinite(n) ? String(n) : String(site);
  }

  function formatTdLabel(td) {
    const n = Number(td);
    return Number.isFinite(n) ? String(n) : String(td);
  }

  function render(container, siteTdMap) {
    if (!container || !siteTdMap || siteTdMap.size === 0) {
      clear(container);
      return;
    }

    const model = buildModel(siteTdMap);
    if (model.tdLabels.length === 0 || model.siteLabels.length === 0) {
      clear(container);
      return;
    }

    const root = ensureRoot(container);
    root.render(e(HeatmapPanel, model));
  }

  global.SiteTdHeatmapReact = {
    render: render,
    clear: clear,
  };
})(window);
