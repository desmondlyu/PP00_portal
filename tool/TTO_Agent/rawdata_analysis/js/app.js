const APP = {
  files: [],
  rootName: "",
  entryMode: "analysis",
  sourceMode: "none",
  importWorkspaceCollapsed: false,
  manualProductName: "",
  manualFallback: { lotNo: "", waferId: "", station: "", pendingFiles: [] },
  products: new Map(),
  activeStation: "",
  activeProduct: "",
  activeChartTab: "item",
  chartSortProduct: "",
  chartFilters: { product: [], process: [], density: [], voltage: [] },
  scenarioOverrides: new Map(),
  groupScenarioOverrides: new Map(),
  groupingMapByStation: new Map(),
  groupingReady: false,
  enableAnomalyDetail: false,
  enableRawKeywordAnalysis: false,
  rawKeywordResults: [],
  tableSort: { key: "mean", dir: "desc" },
  tableExpanded: new Set(),
  tableCollapsed: true,
  siteTdCollapsed: true,
  scopeCollapsed: false,
  kpiCollapsed: false,
  chartCollapsed: false,
  floatingStationTabsCollapsed: false,
  selectedScopes: new Set(),
  importedDashboardState: null,
  xlsxSummaryCards: [],
  charts: {
    count: null, mean: null, range: null, ratio: null, reduction: null, ratioByGroup: null,
    groupCount: null, groupMean: null, groupRange: null, groupRatio: null, groupReduction: null,
  },
};

const ROOT_REGEX = /^RW_(.+)_([^_]+)_([^_]+)_([^_]+)_(\d{14})$/i;
const PRODUCT_ROOT_REGEX = /^(EAG|FAG|AAG|KAG|MAG|RAG)\S*$/i;
const TEST_TIME_REGEX = /<<<\s*Test Time\s*>>>\s*,\s*(\d+)\s*,\s*([^,]+?)\s*,\s*([+-]?\d*\.?\d+)\s*,\s*\(([^)]+)\)/i;
const TOTAL_TEST_TIME_REGEX = /:(\d+):Total Test Time\s*=\s*([+-]?\d*\.?\d+)\s*\(S\)/i;
const RAW_TXT_FILENAME_REGEX = /^([^_]+)_Wafer(\d+)_([0-9]{14})_S(\d+)\.txt$/i;
const LINE_PREFIX_META_REGEX = /^[^:]+:([^:]+):([^:,]+),([^:]+):([^:]+):/;

const PRODUCT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#a855f7", "#06b6d4", "#ef4444", "#84cc16", "#f97316"];

const dom = {
  pickBtn: document.getElementById("pick-btn"),
  folderInput: document.getElementById("folder-input"),
  txtInput: document.getElementById("txt-input"),
  xlsxInput: document.getElementById("xlsx-input"),
  sourceModeGroup: document.getElementById("source-mode-group"),
  sourceRuleText: document.getElementById("source-rule-text"),
  sourceModeRadios: document.querySelectorAll('input[name="source-mode"]'),
  productInput: document.getElementById("product-input"),
  anomalyDetailToggle: document.getElementById("anomaly-detail-toggle"),
  rawKeywordAnalysisToggle: document.getElementById("raw-keyword-analysis-toggle"),
  folderName: document.getElementById("folder-name"),
  folderMeta: document.getElementById("folder-meta"),
  scopeSelectPanel: document.getElementById("scope-select-panel"),
  scopeSelectBody: document.getElementById("scope-select-body"),
  scopeSelectSummary: document.getElementById("scope-select-summary"),
  scopeSelectList: document.getElementById("scope-select-list"),
  scopeSelectAll: document.getElementById("scope-select-all"),
  scopeSelectNone: document.getElementById("scope-select-none"),
  scopeToggleBtn: document.getElementById("scope-toggle-btn"),
  importWorkspaceBody: document.getElementById("import-workspace-body"),
  importWorkspaceToggleBtn: document.getElementById("import-workspace-toggle-btn"),
  entryTabAnalysis: document.getElementById("entry-tab-analysis"),
  entryTabGuide: document.getElementById("entry-tab-guide"),
  themeToggleBtn: document.getElementById("theme-toggle-btn"),
  analysisPage: document.getElementById("analysis-page"),
  guidePage: document.getElementById("guide-page"),
  guideContent: document.getElementById("guide-content"),
  exampleImage: document.querySelector(".import-example-image"),
  imageLightbox: document.getElementById("image-lightbox"),
  imageLightboxImg: document.getElementById("image-lightbox-img"),
  imageLightboxClose: document.getElementById("image-lightbox-close"),
  message: document.getElementById("message"),
  manualEntryHint: document.getElementById("manual-entry-hint"),
  analyzeBtn: document.getElementById("analyze-btn"),
  exportBtn: document.getElementById("export-btn"),
  progressWrap: document.getElementById("progress-wrap"),
  progressBar: document.getElementById("progress-bar"),
  stationTabsSection: document.getElementById("station-tabs-section"),
  stationTabs: document.getElementById("station-tabs"),
  floatingStationTabsPanel: document.getElementById("floating-station-tabs-panel"),
  floatingStationTabs: document.getElementById("floating-station-tabs"),
  floatingStationTabsToggleBtn: document.getElementById("floating-station-tabs-toggle-btn"),
  kpiToggleBtn: document.getElementById("kpi-toggle-btn"),
  tableProductTabs: document.getElementById("table-product-tabs"),
  tableToggleBtn: document.getElementById("table-toggle-btn"),
  scenarioResetBtn: document.getElementById("scenario-reset-btn"),
  tableContentItem: document.getElementById("table-content-item"),
  siteProductTabs: document.getElementById("site-product-tabs"),
  chartTabItem: document.getElementById("chart-tab-item"),
  chartTabGroup: document.getElementById("chart-tab-group"),
  kpiSection: document.getElementById("kpi-section"),
  chartSection: document.getElementById("chart-section"),
  chartSortProduct: document.getElementById("chart-sort-product"),
  chartFilterProductBtn: document.getElementById("chart-filter-product-btn"),
  chartFilterProductMenu: document.getElementById("chart-filter-product-menu"),
  chartFilterProcessBtn: document.getElementById("chart-filter-process-btn"),
  chartFilterProcessMenu: document.getElementById("chart-filter-process-menu"),
  chartFilterDensityBtn: document.getElementById("chart-filter-density-btn"),
  chartFilterDensityMenu: document.getElementById("chart-filter-density-menu"),
  chartFilterVoltageBtn: document.getElementById("chart-filter-voltage-btn"),
  chartFilterVoltageMenu: document.getElementById("chart-filter-voltage-menu"),
  chartToggleBtn: document.getElementById("chart-toggle-btn"),
  chartContentItem: document.getElementById("chart-content-item"),
  chartContentGroup: document.getElementById("chart-content-group"),
  tableSection: document.getElementById("table-section"),
  statsThead: document.getElementById("stats-thead"),
  statsTbody: document.getElementById("stats-tbody"),
  siteTdSection: document.getElementById("site-td-section"),
  siteTdToggleBtn: document.getElementById("site-td-toggle-btn"),
  siteTdContentItem: document.getElementById("site-td-content-item"),
  siteTdHeatmap: document.getElementById("site-td-heatmap"),
  rawKeywordSection: document.getElementById("keyword-analysis-section"),
  rawKeywordInput: document.getElementById("raw-keyword-input"),
  rawBinInput: document.getElementById("raw-bin-input"),
  rawKeywordAnalyzeBtn: document.getElementById("raw-keyword-analyze-btn"),
  rawKeywordExportBtn: document.getElementById("raw-keyword-export-btn"),
  rawKeywordResultSummary: document.getElementById("raw-keyword-result-summary"),
  rawKeywordResultBox: document.getElementById("raw-keyword-result-box"),
};

dom.pickBtn.addEventListener("click", onPickSourceClick);
dom.folderInput.addEventListener("change", handleFolderSelection);
dom.txtInput.addEventListener("change", handleTxtSelection);
dom.xlsxInput.addEventListener("change", handleXlsxSelection);
dom.productInput?.addEventListener("input", onProductNameChange);
dom.anomalyDetailToggle?.addEventListener("change", onAnomalyToggleChange);
dom.rawKeywordAnalysisToggle?.addEventListener("change", onRawKeywordAnalysisToggleChange);
dom.rawKeywordInput?.addEventListener("input", syncRawKeywordAnalysisUI);
dom.analyzeBtn.addEventListener("click", startAnalysis);
dom.exportBtn.addEventListener("click", exportXlsx);
dom.rawKeywordAnalyzeBtn?.addEventListener("click", startRawKeywordAnalysis);
dom.rawKeywordExportBtn?.addEventListener("click", exportRawKeywordResultsXlsx);
dom.stationTabs?.addEventListener("click", onStationTabClick);
dom.floatingStationTabs?.addEventListener("click", onStationTabClick);
dom.floatingStationTabsToggleBtn?.addEventListener("click", onFloatingStationTabsToggleClick);
dom.kpiToggleBtn?.addEventListener("click", onKpiToggleClick);
dom.tableProductTabs?.addEventListener("click", onProductTabClick);
dom.siteProductTabs?.addEventListener("click", onProductTabClick);
dom.statsThead?.addEventListener("click", onStatsHeadClick);
dom.statsTbody?.addEventListener("click", onStatsBodyClick);
dom.statsTbody?.addEventListener("input", onScenarioInputChange);
dom.chartSortProduct?.addEventListener("change", onChartSortProductChange);
dom.chartFilterProductBtn?.addEventListener("click", onChartProductFilterToggle);
dom.chartFilterProductMenu?.addEventListener("change", onChartProductFilterItemChange);
dom.chartFilterProcessBtn?.addEventListener("click", (event) => onChartMultiFilterToggle(event, "process"));
dom.chartFilterDensityBtn?.addEventListener("click", (event) => onChartMultiFilterToggle(event, "density"));
dom.chartFilterVoltageBtn?.addEventListener("click", (event) => onChartMultiFilterToggle(event, "voltage"));
dom.chartFilterProcessMenu?.addEventListener("change", (event) => onChartMultiFilterItemChange(event, "process"));
dom.chartFilterDensityMenu?.addEventListener("change", (event) => onChartMultiFilterItemChange(event, "density"));
dom.chartFilterVoltageMenu?.addEventListener("change", (event) => onChartMultiFilterItemChange(event, "voltage"));
dom.chartToggleBtn?.addEventListener("click", onChartToggleClick);
dom.tableToggleBtn?.addEventListener("click", onTableToggleClick);
dom.siteTdToggleBtn?.addEventListener("click", onSiteTdToggleClick);
dom.scenarioResetBtn?.addEventListener("click", onScenarioResetClick);
dom.chartTabItem?.addEventListener("click", () => switchChartTab("item"));
dom.chartTabGroup?.addEventListener("click", () => switchChartTab("group"));
dom.entryTabAnalysis?.addEventListener("click", () => switchEntryPage("analysis"));
dom.entryTabGuide?.addEventListener("click", () => switchEntryPage("guide"));
dom.themeToggleBtn?.addEventListener("click", onThemeToggleClick);
dom.scopeSelectList?.addEventListener("change", onScopeSelectionChange);
dom.scopeSelectList?.addEventListener("click", onScopeSelectionClick);
dom.folderMeta?.addEventListener("change", onScopeSelectionChange);
dom.folderMeta?.addEventListener("click", onMetaScopeMenuClick);
dom.scopeSelectAll?.addEventListener("click", () => { console.log("[TTO] 全選 clicked"); toggleAllScopes(true); });
dom.scopeSelectNone?.addEventListener("click", () => { console.log("[TTO] 全不選 clicked"); toggleAllScopes(false); });
dom.scopeToggleBtn?.addEventListener("click", onScopeToggleClick);
dom.importWorkspaceToggleBtn?.addEventListener("click", onImportWorkspaceToggleClick);
dom.folderMeta?.addEventListener("input", onMetaInputChange);
dom.exampleImage?.addEventListener("click", onZoomableImageClick);
dom.imageLightboxClose?.addEventListener("click", closeImageLightbox);
dom.imageLightbox?.addEventListener("click", onLightboxBackdropClick);
for (const radio of dom.sourceModeRadios) {
  radio.addEventListener("change", onSourceModeRadioChange);
}
document.addEventListener("click", onDocumentClick);
document.addEventListener("click", onGlobalZoomableImageClick, true);
document.addEventListener("keydown", onDocumentKeydown);
console.log("[TTO] Event binding complete. scopeSelectAll=", !!dom.scopeSelectAll, "scopeSelectNone=", !!dom.scopeSelectNone, "folderMeta=", !!dom.folderMeta);

initializeGuidePage();
initializeGroupingMapping();
applyEntryModeUI();
initializeTheme();
syncChartTabUI();
syncFloatingStationTabsCollapsedUI();
syncImportWorkspaceCollapsedUI();
syncSiteTdCollapsedUI();

function applyTheme(theme) {
  const isLight = theme === "light";
  document.body.classList.toggle("theme-light", isLight);
  if (dom.themeToggleBtn) {
    dom.themeToggleBtn.textContent = isLight ? "深色系" : "亮色系";
    dom.themeToggleBtn.setAttribute("aria-pressed", isLight ? "true" : "false");
  }
}

function initializeTheme() {
  const saved = localStorage.getItem("tto-theme");
  applyTheme(saved === "light" ? "light" : "dark");
}

function onThemeToggleClick() {
  const toLight = !document.body.classList.contains("theme-light");
  const theme = toLight ? "light" : "dark";
  applyTheme(theme);
  localStorage.setItem("tto-theme", theme);
}

function onZoomableImageClick(event) {
  const img = event.target;
  if (!(img instanceof HTMLImageElement)) return;
  openImageLightbox(img.currentSrc || img.src, img.alt || "放大圖片");
}

function onGlobalZoomableImageClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLImageElement)) return;
  if (target.closest("#image-lightbox")) return;
  if (!target.hasAttribute("data-zoomable") && !target.classList.contains("js-zoomable") && !target.classList.contains("import-example-image")) return;
  openImageLightbox(target.currentSrc || target.src, target.alt || "放大圖片");
}

function onLightboxBackdropClick(event) {
  if (event.target !== dom.imageLightbox) return;
  closeImageLightbox();
}

function onDocumentKeydown(event) {
  if (event.key !== "Escape") return;
  if (!dom.imageLightbox || dom.imageLightbox.classList.contains("hidden")) return;
  closeImageLightbox();
}

function openImageLightbox(src, alt) {
  if (!dom.imageLightbox || !dom.imageLightboxImg) return;
  dom.imageLightboxImg.src = String(src || "");
  dom.imageLightboxImg.alt = String(alt || "放大圖片");
  dom.imageLightbox.classList.remove("hidden");
  dom.imageLightbox.setAttribute("aria-hidden", "false");
}

function closeImageLightbox() {
  if (!dom.imageLightbox || !dom.imageLightboxImg) return;
  dom.imageLightbox.classList.add("hidden");
  dom.imageLightbox.setAttribute("aria-hidden", "true");
  dom.imageLightboxImg.src = "";
}

function bindZoomableImages(container) {
  if (!container) return;
  const images = container.querySelectorAll("img");
  for (const image of images) {
    image.classList.add("js-zoomable");
    image.setAttribute("data-zoomable", "true");
    image.addEventListener("click", onZoomableImageClick);
  }
}

function initializeGroupingMapping() {
  APP.groupingMapByStation = new Map();
  APP.groupingReady = false;
  const source = window.GROUPING_RULES_BY_STATION;
  if (!source || typeof source !== "object") return;
  for (const [station, itemMap] of Object.entries(source)) {
    const stationKey = String(station || "").trim().toUpperCase();
    if (!stationKey || !itemMap || typeof itemMap !== "object") continue;
    const stationMap = new Map();
    for (const [testItem, groupName] of Object.entries(itemMap)) {
      const item = String(testItem || "").trim();
      const group = String(groupName || "").trim();
      if (!item || !group) continue;
      stationMap.set(item, group);
    }
    if (stationMap.size > 0) APP.groupingMapByStation.set(stationKey, stationMap);
  }
  APP.groupingReady = APP.groupingMapByStation.size > 0;
  if (APP.groupingReady && hasAnalyzedData()) {
    renderTable();
    renderCharts();
  }
}

function switchChartTab(tab) {
  if (tab !== "item" && tab !== "group") return;
  APP.activeChartTab = tab;
  syncChartTabUI();
  syncChartCollapsedUI();
  renderCharts();
}

function syncChartTabUI() {
  const isItem = APP.activeChartTab === "item";
  if (dom.chartTabItem) {
    dom.chartTabItem.setAttribute("aria-selected", isItem ? "true" : "false");
    dom.chartTabItem.classList.toggle("is-active", isItem);
  }
  if (dom.chartTabGroup) {
    dom.chartTabGroup.setAttribute("aria-selected", isItem ? "false" : "true");
    dom.chartTabGroup.classList.toggle("is-active", !isItem);
  }
}

function onPickSourceClick() {
  const selected = getSelectedSourceMode();
  if (selected === "xlsx") {
    dom.xlsxInput.value = "";
    dom.xlsxInput.click();
    return;
  }
  if (selected === "folder") {
    dom.folderInput.value = "";
    dom.folderInput.click();
    return;
  }
  dom.txtInput.value = "";
  dom.txtInput.click();
}

function getSelectedSourceMode() {
  return Array.from(dom.sourceModeRadios).find((r) => r.checked)?.value ?? "folder";
}

function onSourceModeRadioChange() {
  const selected = getSelectedSourceMode();
  APP.sourceMode = selected;
  syncSourceModeUI();
  renderScopeSelection();
  syncRawKeywordAnalysisUI();
  updateAnalyzeState();
}

function showMessage(text, type = "info") {
  dom.message.textContent = text;
  if (type === "error") dom.message.className = "mt-4 text-sm msg-error";
  else if (type === "success") dom.message.className = "mt-4 text-sm msg-success";
  else dom.message.className = "mt-4 text-sm msg-info";
}

function hasManualFallbackOnly() {
  return APP.manualFallback.pendingFiles.length > 0 && getProducts().length === 0;
}

function isManualFallbackReady() {
  const productToken = detectProductToken(APP.manualProductName.trim());
  return Boolean(
    productToken &&
    APP.manualFallback.lotNo.trim() &&
    APP.manualFallback.waferId.trim() &&
    APP.manualFallback.station.trim(),
  );
}

function syncManualEntryHint() {
  if (!dom.manualEntryHint) return;
  dom.manualEntryHint.classList.toggle("hidden", !hasManualFallbackOnly());
}

function onProductNameChange() {
  APP.manualProductName = dom.productInput?.value.trim() || "";
  updateAnalyzeState();
  if (hasAnalyzedData()) {
    renderMeta(buildMetaCards());
    renderKpi();
  }
}

function onAnomalyToggleChange() {
  APP.enableAnomalyDetail = Boolean(dom.anomalyDetailToggle?.checked);
  APP.tableExpanded.clear();
  if (hasAnalyzedData()) renderTable();
}

function onRawKeywordAnalysisToggleChange() {
  APP.enableRawKeywordAnalysis = Boolean(dom.rawKeywordAnalysisToggle?.checked);
  if (!APP.enableRawKeywordAnalysis) {
    APP.rawKeywordResults = [];
    renderRawKeywordResults([]);
  }
  syncRawKeywordAnalysisUI();
}

function parseRootMeta(rootName) {
  const m = rootName.match(ROOT_REGEX);
  if (!m) return null;
  const raw = m[5];
  return {
    lotNo: m[2],
    waferId: m[3],
    station: m[4],
    datetimeRaw: raw,
    datetime: `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)} ${raw.slice(8, 10)}:${raw.slice(10, 12)}:${raw.slice(12, 14)}`,
  };
}

function createStation(name, rootFolderName = "", parsedMeta = null) {
  return {
    name,
    rootFolderName,
    parsedMeta,
    rawTxtFiles: [],
    stats: [],
    stationTotalTime: 0,
    touchDownCount: 0,
    siteTdMap: new Map(),
  };
}

function createProduct(name) {
  return {
    name,
    stations: new Map(),
    lotNos: new Set(),
    waferIds: new Set(),
    datetimes: new Set(),
    rootNames: new Set(),
    process: "",
    density: "",
    voltage: "",
  };
}

function getProducts() {
  return Array.from(APP.products.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function getProductByName(name) {
  return APP.products.get(name) ?? null;
}

function getActiveProduct() {
  const p = getProductByName(APP.activeProduct);
  if (p) return p;
  const first = getProducts()[0] ?? null;
  if (first) APP.activeProduct = first.name;
  return first;
}

function getStationNames() {
  const stationSet = new Set();
  for (const product of getProducts()) {
    for (const stationName of product.stations.keys()) {
      const normalized = String(stationName || "").trim();
      if (normalized) stationSet.add(normalized);
    }
  }
  return Array.from(stationSet).sort((a, b) => a.localeCompare(b));
}

function getProductsInStation(stationName) {
  return getProducts().filter((p) => {
    const station = p.stations.get(stationName);
    return Boolean(station && station.stats.length > 0);
  });
}

function getActiveStationData() {
  const product = getActiveProduct();
  if (!product || !APP.activeStation) return null;
  return product.stations.get(APP.activeStation) ?? null;
}

function getTotalRawTxtCount() {
  let total = 0;
  for (const product of getProducts()) {
    for (const station of product.stations.values()) {
      total += station.rawTxtFiles.length;
    }
  }
  return total;
}

function makeScopeKey(productName, stationName) {
  return `${String(productName || "").trim()}||${String(stationName || "").trim()}`;
}

function initializeScopeSelection() {
  APP.selectedScopes.clear();
  for (const product of getProducts()) {
    for (const station of product.stations.values()) {
      APP.selectedScopes.add(makeScopeKey(product.name, station.name));
    }
  }
}

function getSelectableStationEntries() {
  const entries = [];
  for (const product of getProducts()) {
    for (const station of product.stations.values()) {
      if (!station.rawTxtFiles.length) continue;
      entries.push({ product, station, key: makeScopeKey(product.name, station.name) });
    }
  }
  return entries;
}

function getSelectedStationEntries() {
  return getSelectableStationEntries().filter((entry) => APP.selectedScopes.has(entry.key));
}

function getSelectedRawTxtCount() {
  return getSelectedStationEntries().reduce((acc, entry) => acc + entry.station.rawTxtFiles.length, 0);
}

function isProductFullySelected(productName) {
  const entries = getSelectableStationEntries().filter((entry) => entry.product.name === productName);
  if (!entries.length) return false;
  return entries.every((entry) => APP.selectedScopes.has(entry.key));
}

function isProductPartiallySelected(productName) {
  const entries = getSelectableStationEntries().filter((entry) => entry.product.name === productName);
  if (!entries.length) return false;
  const selectedCount = entries.filter((entry) => APP.selectedScopes.has(entry.key)).length;
  return selectedCount > 0 && selectedCount < entries.length;
}

function getSelectableEntriesByProduct(productName) {
  return getSelectableStationEntries().filter((entry) => entry.product.name === productName);
}

function isStationFullySelected(stationName) {
  const entries = getSelectableStationEntries().filter((entry) => entry.station.name === stationName);
  if (!entries.length) return false;
  return entries.every((entry) => APP.selectedScopes.has(entry.key));
}

function isStationPartiallySelected(stationName) {
  const entries = getSelectableStationEntries().filter((entry) => entry.station.name === stationName);
  if (!entries.length) return false;
  const selectedCount = entries.filter((entry) => APP.selectedScopes.has(entry.key)).length;
  return selectedCount > 0 && selectedCount < entries.length;
}

function setProductScopeSelection(productName, checked) {
  for (const entry of getSelectableStationEntries()) {
    if (entry.product.name !== productName) continue;
    if (checked) APP.selectedScopes.add(entry.key);
    else APP.selectedScopes.delete(entry.key);
  }
}

function setStationScopeSelection(stationName, checked) {
  for (const entry of getSelectableStationEntries()) {
    if (entry.station.name !== stationName) continue;
    if (checked) APP.selectedScopes.add(entry.key);
    else APP.selectedScopes.delete(entry.key);
  }
}

function renderScopeSelection() {
  if (!dom.scopeSelectPanel || !dom.scopeSelectList || !dom.scopeSelectSummary) return;
  const show = APP.sourceMode === "folder" && getSelectableStationEntries().length > 0;
  dom.scopeSelectPanel.classList.toggle("hidden", !show);
  if (!show) {
    dom.scopeSelectList.innerHTML = "";
    return;
  }

  const entries = getSelectableStationEntries();
  dom.scopeSelectList.innerHTML = "";

  const selectedStations = getSelectedStationEntries().length;
  const totalStations = entries.length;
  const selectedFiles = getSelectedRawTxtCount();
  dom.scopeSelectSummary.textContent = `目前已勾選 ${selectedStations}/${totalStations} 個站點，共 ${selectedFiles} 個 .TXT 檔案。`;
  syncScopeCollapsedUI();
}

function onScopeSelectionChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  const openMenuKey = dom.folderMeta?.querySelector(".meta-scope-menu:not(.hidden)")?.getAttribute("data-meta-scope-menu") || null;
  if (target.hasAttribute("data-scope-product")) {
    const productName = target.getAttribute("data-scope-product");
    if (!productName) return;
    setProductScopeSelection(productName, target.checked);
    renderScopeSelection();
    renderMeta(buildMetaCards());
    if (openMenuKey) reopenMetaScopeMenu(openMenuKey);
    updateAnalyzeState();
    return;
  }
  if (target.hasAttribute("data-scope-station-name")) {
    const stationName = target.getAttribute("data-scope-station-name");
    if (!stationName) return;
    setStationScopeSelection(stationName, target.checked);
    renderScopeSelection();
    renderMeta(buildMetaCards());
    if (openMenuKey) reopenMetaScopeMenu(openMenuKey);
    updateAnalyzeState();
    return;
  }
  if (target.hasAttribute("data-scope-station")) {
    const key = target.getAttribute("data-scope-station");
    if (!key) return;
    if (target.checked) APP.selectedScopes.add(key);
    else APP.selectedScopes.delete(key);
    renderScopeSelection();
    renderMeta(buildMetaCards());
    if (openMenuKey) reopenMetaScopeMenu(openMenuKey);
    updateAnalyzeState();
    return;
  }
}

function reopenMetaScopeMenu(menuKey) {
  if (!dom.folderMeta) return;
  const menu = dom.folderMeta.querySelector(`[data-meta-scope-menu="${menuKey}"]`);
  const btn = dom.folderMeta.querySelector(`[data-meta-scope-menu-toggle="${menuKey}"]`);
  if (menu) menu.classList.remove("hidden");
  if (btn) btn.setAttribute("aria-expanded", "true");
}

function onScopeSelectionClick(event) {
  const btn = event.target instanceof Element ? event.target.closest("[data-scope-menu-toggle]") : null;
  if (!btn) return;
  event.stopPropagation();
  const targetKey = btn.getAttribute("data-scope-menu-toggle");
  if (!targetKey) return;
  const targetMenu = dom.scopeSelectList?.querySelector(`[data-scope-menu="${targetKey}"]`);
  if (!targetMenu) return;
  const willOpen = targetMenu.classList.contains("hidden");
  closeScopeMenus();
  targetMenu.classList.toggle("hidden", !willOpen);
  btn.setAttribute("aria-expanded", willOpen ? "true" : "false");
}

function closeScopeMenus() {
  if (!dom.scopeSelectList) return;
  for (const menu of dom.scopeSelectList.querySelectorAll("[data-scope-menu]")) {
    menu.classList.add("hidden");
  }
  for (const btn of dom.scopeSelectList.querySelectorAll("[data-scope-menu-toggle]")) {
    btn.setAttribute("aria-expanded", "false");
  }
}

function onMetaScopeMenuClick(event) {
  const btn = event.target instanceof Element ? event.target.closest("[data-meta-scope-menu-toggle]") : null;
  console.log("[TTO] onMetaScopeMenuClick fired, btn=", btn);
  if (!btn || !dom.folderMeta) return;
  event.stopPropagation();
  const menuKey = btn.getAttribute("data-meta-scope-menu-toggle");
  if (!menuKey) return;
  const targetMenu = dom.folderMeta.querySelector(`[data-meta-scope-menu="${menuKey}"]`);
  if (!targetMenu) return;
  const willOpen = targetMenu.classList.contains("hidden");
  closeMetaScopeMenus();
  targetMenu.classList.toggle("hidden", !willOpen);
  btn.setAttribute("aria-expanded", willOpen ? "true" : "false");
}

function closeMetaScopeMenus() {
  if (!dom.folderMeta) return;
  for (const menu of dom.folderMeta.querySelectorAll("[data-meta-scope-menu]")) {
    menu.classList.add("hidden");
  }
  for (const btn of dom.folderMeta.querySelectorAll("[data-meta-scope-menu-toggle]")) {
    btn.setAttribute("aria-expanded", "false");
  }
}

function toggleAllScopes(checked) {
  for (const entry of getSelectableStationEntries()) {
    if (checked) APP.selectedScopes.add(entry.key);
    else APP.selectedScopes.delete(entry.key);
  }
  renderScopeSelection();
  renderMeta(buildMetaCards());
  updateAnalyzeState();
}

function syncScopeCollapsedUI() {
  if (!dom.scopeToggleBtn || !dom.scopeSelectBody) return;
  dom.scopeSelectBody.classList.toggle("hidden", APP.scopeCollapsed);
  dom.scopeToggleBtn.textContent = APP.scopeCollapsed ? "展開全部" : "收合全部";
  dom.scopeToggleBtn.setAttribute("aria-expanded", APP.scopeCollapsed ? "false" : "true");
}

function syncImportWorkspaceCollapsedUI() {
  if (!dom.importWorkspaceBody || !dom.importWorkspaceToggleBtn) return;
  dom.importWorkspaceBody.classList.toggle("hidden", APP.importWorkspaceCollapsed);
  dom.importWorkspaceToggleBtn.textContent = APP.importWorkspaceCollapsed ? "展開全部" : "收合全部";
  dom.importWorkspaceToggleBtn.setAttribute("aria-expanded", APP.importWorkspaceCollapsed ? "false" : "true");
}

function onImportWorkspaceToggleClick() {
  APP.importWorkspaceCollapsed = !APP.importWorkspaceCollapsed;
  syncImportWorkspaceCollapsedUI();
}

function onScopeToggleClick() {
  APP.scopeCollapsed = !APP.scopeCollapsed;
  syncScopeCollapsedUI();
}

function canRunRawKeywordAnalysis() {
  if (APP.sourceMode === "xlsx") return false;
  return getSelectedRawTxtCount() > 0 || hasManualFallbackOnly();
}

function syncRawKeywordAnalysisUI() {
  const enabledByOption = APP.enableRawKeywordAnalysis && Boolean(dom.rawKeywordAnalysisToggle?.checked);
  const canRun = canRunRawKeywordAnalysis();
  const shouldShow = enabledByOption && canRun;
  if (dom.rawKeywordSection) dom.rawKeywordSection.classList.toggle("hidden", !shouldShow);

  if (dom.rawKeywordAnalysisToggle) {
    const disabled = APP.sourceMode === "xlsx";
    dom.rawKeywordAnalysisToggle.disabled = disabled;
    if (disabled && dom.rawKeywordAnalysisToggle.checked) {
      dom.rawKeywordAnalysisToggle.checked = false;
      APP.enableRawKeywordAnalysis = false;
      APP.rawKeywordResults = [];
      renderRawKeywordResults([]);
    }
  }

  if (dom.rawKeywordInput) dom.rawKeywordInput.disabled = !shouldShow;
  if (dom.rawBinInput) dom.rawBinInput.disabled = !shouldShow;
  if (dom.rawKeywordAnalyzeBtn) {
    const hasKeyword = String(dom.rawKeywordInput?.value || "").trim().length > 0;
    dom.rawKeywordAnalyzeBtn.disabled = !shouldShow || !hasKeyword;
  }
  if (dom.rawKeywordExportBtn) {
    dom.rawKeywordExportBtn.disabled = !shouldShow || APP.rawKeywordResults.length === 0;
  }

  if (!shouldShow && dom.rawKeywordResultSummary) {
    if (APP.sourceMode === "xlsx") dom.rawKeywordResultSummary.textContent = "XLSX 模式不提供 RAWDATA 關鍵字分析。";
    else dom.rawKeywordResultSummary.textContent = "請先勾選步驟三(Option)以啟用關鍵字分析。";
  } else if (shouldShow && dom.rawKeywordResultSummary && !APP.rawKeywordResults.length) {
    dom.rawKeywordResultSummary.textContent = "尚未執行關鍵字分析。";
  }
}

function renderRawKeywordResults(rows) {
  if (!dom.rawKeywordResultBox) return;
  if (!rows.length) {
    dom.rawKeywordResultBox.textContent = "尚無資料";
    if (dom.rawKeywordExportBtn) dom.rawKeywordExportBtn.disabled = true;
    return;
  }
  dom.rawKeywordResultBox.textContent = rows
    .map((row) => `[站點:${row.station}] [Site:${row.site}] [TD:${row.td}] [BIN:${row.bin}] [UTL_DUT:${row.utlDut}] [X:${row.x}] [Y:${row.y}] ${row.rawLine}`)
    .join("\n");
  dom.rawKeywordResultBox.scrollTop = 0;
  if (dom.rawKeywordExportBtn) dom.rawKeywordExportBtn.disabled = false;
}

function hasAnalyzedData() {
  for (const product of getProducts()) {
    for (const station of product.stations.values()) {
      if (station.stats.length > 0) return true;
    }
  }
  return false;
}

function resetResultsUI() {
  for (const product of getProducts()) {
    for (const station of product.stations.values()) {
      station.stats = [];
      station.stationTotalTime = 0;
      station.touchDownCount = 0;
      station.siteTdMap = new Map();
    }
  }
  APP.chartSortProduct = "";
  APP.chartFilters = { product: [], process: [], density: [], voltage: [] };
  APP.scenarioOverrides.clear();
  APP.groupScenarioOverrides.clear();
  APP.importedDashboardState = null;
  APP.xlsxSummaryCards = [];
  APP.tableExpanded.clear();
  APP.activeChartTab = "item";
  APP.tableCollapsed = true;
  APP.siteTdCollapsed = true;
  APP.scopeCollapsed = false;
  APP.importWorkspaceCollapsed = false;
  APP.kpiCollapsed = false;
  APP.chartCollapsed = false;
  APP.floatingStationTabsCollapsed = false;
  APP.rawKeywordResults = [];

  dom.stationTabsSection?.classList.add("hidden");
  dom.floatingStationTabsPanel?.classList.add("hidden");
  dom.kpiSection.classList.add("hidden");
  dom.chartSection.classList.add("hidden");
  dom.tableSection.classList.add("hidden");
  dom.siteTdSection.classList.add("hidden");
  dom.rawKeywordSection?.classList.add("hidden");

  if (dom.stationTabs) dom.stationTabs.innerHTML = "";
  if (dom.floatingStationTabs) dom.floatingStationTabs.innerHTML = "";
  if (dom.tableProductTabs) dom.tableProductTabs.innerHTML = "";
  if (dom.siteProductTabs) dom.siteProductTabs.innerHTML = "";
  if (dom.chartSortProduct) dom.chartSortProduct.innerHTML = "";
  if (dom.chartFilterProductBtn) dom.chartFilterProductBtn.textContent = "全部產品";
  if (dom.chartFilterProductMenu) dom.chartFilterProductMenu.innerHTML = "";
  if (dom.chartFilterProcessBtn) dom.chartFilterProcessBtn.textContent = "全部 Process";
  if (dom.chartFilterProcessMenu) dom.chartFilterProcessMenu.innerHTML = "";
  if (dom.chartFilterDensityBtn) dom.chartFilterDensityBtn.textContent = "全部 Density";
  if (dom.chartFilterDensityMenu) dom.chartFilterDensityMenu.innerHTML = "";
  if (dom.chartFilterVoltageBtn) dom.chartFilterVoltageBtn.textContent = "全部 Voltage";
  if (dom.chartFilterVoltageMenu) dom.chartFilterVoltageMenu.innerHTML = "";
  dom.statsTbody.innerHTML = "";
  renderRawKeywordResults([]);
  dom.progressWrap.classList.add("hidden");
  setProgress(0);
  syncChartTabUI();
  syncTableCollapsedUI();
  syncKpiCollapsedUI();
  syncChartCollapsedUI();
  syncSiteTdCollapsedUI();
  syncFloatingStationTabsCollapsedUI();
  syncImportWorkspaceCollapsedUI();

  destroyKpiCharts();
  for (const key of Object.keys(APP.charts)) {
    if (APP.charts[key]) {
      APP.charts[key].destroy();
      APP.charts[key] = null;
    }
  }
  if (window.SiteTdHeatmapReact && dom.siteTdHeatmap) {
    window.SiteTdHeatmapReact.clear(dom.siteTdHeatmap);
  } else if (dom.siteTdHeatmap) {
    dom.siteTdHeatmap.innerHTML = "";
  }
}

function syncTableCollapsedUI() {
  if (!dom.tableToggleBtn) return;
  dom.tableContentItem?.classList.toggle("hidden", APP.tableCollapsed);
  dom.tableToggleBtn.textContent = APP.tableCollapsed ? "展開全部" : "收合全部";
  dom.tableToggleBtn.setAttribute("aria-expanded", APP.tableCollapsed ? "false" : "true");
}

function onTableToggleClick() {
  APP.tableCollapsed = !APP.tableCollapsed;
  syncTableCollapsedUI();
}

function syncSiteTdCollapsedUI() {
  if (!dom.siteTdToggleBtn) return;
  dom.siteTdContentItem?.classList.toggle("hidden", APP.siteTdCollapsed);
  dom.siteTdToggleBtn.textContent = APP.siteTdCollapsed ? "展開全部" : "收合全部";
  dom.siteTdToggleBtn.setAttribute("aria-expanded", APP.siteTdCollapsed ? "false" : "true");
}

function onSiteTdToggleClick() {
  APP.siteTdCollapsed = !APP.siteTdCollapsed;
  syncSiteTdCollapsedUI();
  if (APP.siteTdCollapsed) {
    if (window.SiteTdHeatmapReact && dom.siteTdHeatmap) window.SiteTdHeatmapReact.clear(dom.siteTdHeatmap);
  } else {
    renderSiteTdChart();
  }
}

function syncKpiCollapsedUI() {
  if (!dom.kpiToggleBtn || !dom.kpiSection) return;
  dom.kpiToggleBtn.textContent = APP.kpiCollapsed ? "展開全部" : "收合全部";
  dom.kpiToggleBtn.setAttribute("aria-expanded", APP.kpiCollapsed ? "false" : "true");
  if (APP.kpiCollapsed) dom.kpiSection.classList.add("hidden");
}

function onKpiToggleClick() {
  APP.kpiCollapsed = !APP.kpiCollapsed;
  syncKpiCollapsedUI();
  if (!APP.kpiCollapsed) renderKpi();
}

function syncChartCollapsedUI() {
  if (!dom.chartToggleBtn) return;
  dom.chartContentItem?.classList.toggle("hidden", APP.chartCollapsed || APP.activeChartTab !== "item");
  dom.chartContentGroup?.classList.toggle("hidden", APP.chartCollapsed || APP.activeChartTab !== "group");
  dom.chartToggleBtn.textContent = APP.chartCollapsed ? "展開全部" : "收合全部";
  dom.chartToggleBtn.setAttribute("aria-expanded", APP.chartCollapsed ? "false" : "true");
}

function onChartToggleClick() {
  APP.chartCollapsed = !APP.chartCollapsed;
  syncChartCollapsedUI();
  if (!APP.chartCollapsed) renderCharts();
}

function syncFloatingStationTabsCollapsedUI() {
  if (!dom.floatingStationTabsPanel || !dom.floatingStationTabsToggleBtn) return;
  dom.floatingStationTabsPanel.classList.toggle("is-collapsed", APP.floatingStationTabsCollapsed);
  dom.floatingStationTabsToggleBtn.textContent = APP.floatingStationTabsCollapsed ? "▲" : "▼";
  dom.floatingStationTabsToggleBtn.setAttribute("aria-expanded", APP.floatingStationTabsCollapsed ? "false" : "true");
  dom.floatingStationTabsToggleBtn.setAttribute("aria-label", APP.floatingStationTabsCollapsed ? "向上展開浮動站點面板" : "向下收合浮動站點面板");
}

function onFloatingStationTabsToggleClick() {
  APP.floatingStationTabsCollapsed = !APP.floatingStationTabsCollapsed;
  syncFloatingStationTabsCollapsedUI();
}

function updateAnalyzeState() {
  if (APP.sourceMode === "xlsx") dom.analyzeBtn.disabled = APP.files.length === 0;
  else if (APP.sourceMode === "folder") {
    const hasSelectedScopeFiles = getSelectedRawTxtCount() > 0;
    const hasManualProduct = APP.manualProductName.length > 0;
    const hasAutoProduct = getProducts().length > 0;
    const canAnalyzeWithScope = hasSelectedScopeFiles && (hasManualProduct || hasAutoProduct);
    const canAnalyzeWithManualFallback = hasManualFallbackOnly() && isManualFallbackReady();
    dom.analyzeBtn.disabled = !(canAnalyzeWithScope || canAnalyzeWithManualFallback);
  } else if (APP.sourceMode === "txt") {
    const hasTxtFiles = APP.files.some((file) => file.name.toLowerCase().endsWith(".txt"));
    const hasAutoProduct = getProducts().length > 0;
    const canAnalyzeWithAuto = hasTxtFiles && hasAutoProduct;
    const canAnalyzeWithManualFallback = hasManualFallbackOnly() && isManualFallbackReady();
    dom.analyzeBtn.disabled = !(canAnalyzeWithAuto || canAnalyzeWithManualFallback);
  } else {
    const hasRawFiles = getTotalRawTxtCount() > 0;
    const hasManualProduct = APP.manualProductName.length > 0;
    const hasAutoProduct = getProducts().length > 0;
    dom.analyzeBtn.disabled = !(hasRawFiles && (hasManualProduct || hasAutoProduct));
  }
  dom.exportBtn.disabled = !hasAnalyzedData();
  syncManualEntryHint();
  syncRawKeywordAnalysisUI();
}

function detectProductToken(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return PRODUCT_ROOT_REGEX.test(text) ? text : "";
}

function parseImportPath(relativePath) {
  const normalized = String(relativePath || "").replaceAll("\\", "/");
  const parts = normalized.split("/").filter(Boolean);
  const homeIndex = parts.findIndex(
    (part, idx) =>
      part.toLowerCase() === "home" &&
      Boolean(parts[idx + 1]) &&
      Boolean(parts[idx + 2]),
  );
  if (homeIndex < 1) return null;

  const stationFolder = parts[homeIndex - 1];
  const stationMeta = parseRootMeta(stationFolder);
  let productName = "";
  for (let i = homeIndex - 2; i >= 0; i -= 1) {
    const token = detectProductToken(parts[i]);
    if (token) {
      productName = token;
      break;
    }
  }
  return {
    productName,
    stationFolder,
    stationName: stationMeta?.station ?? stationFolder,
    stationMeta,
  };
}

function ensureProduct(name) {
  const normalized = String(name || "").trim();
  const key = normalized || APP.manualProductName || "UNSPECIFIED";
  const existing = APP.products.get(key);
  if (existing) return existing;
  const created = createProduct(key);
  APP.products.set(key, created);
  return created;
}

function ensureStation(product, stationName, stationFolder, stationMeta) {
  const existing = product.stations.get(stationName);
  if (existing) return existing;
  const created = createStation(stationName, stationFolder, stationMeta);
  product.stations.set(stationName, created);
  return created;
}

function handleFolderSelection(event) {
  APP.sourceMode = "folder";
  APP.files = Array.from(event.target.files || []);
  APP.rootName = "";
  APP.manualFallback.lotNo = "";
  APP.manualFallback.waferId = "";
  APP.manualFallback.station = "";
  APP.manualFallback.pendingFiles = [];
  APP.products.clear();
  APP.activeStation = "";
  APP.activeProduct = "";
  resetResultsUI();

  if (!APP.files.length) {
    APP.selectedScopes.clear();
    renderScopeSelection();
    updateAnalyzeState();
    return;
  }

  const firstPath = APP.files[0].webkitRelativePath || APP.files[0].name;
  APP.rootName = firstPath.split("/")[0] || firstPath;
  dom.folderName.textContent = APP.rootName;

  const rootProduct = detectProductToken(APP.rootName);
  if (rootProduct) {
    APP.manualProductName = rootProduct;
    if (dom.productInput) dom.productInput.value = rootProduct;
  } else if (dom.productInput) {
    APP.manualProductName = dom.productInput.value.trim();
  } else {
    APP.manualProductName = "";
  }

  let totalTxt = 0;
  let acceptedTxt = 0;
  for (const file of APP.files) {
    const rel = String(file.webkitRelativePath || "");
    if (!rel.toLowerCase().endsWith(".txt")) continue;
    totalTxt += 1;
    const parsed = parseImportPath(rel);
    if (!parsed) continue;
    if (!parsed.productName) {
      APP.manualFallback.pendingFiles.push(file);
      if (parsed.stationMeta) {
        APP.manualFallback.lotNo = APP.manualFallback.lotNo || String(parsed.stationMeta.lotNo || "").trim();
        APP.manualFallback.waferId = APP.manualFallback.waferId || String(parsed.stationMeta.waferId || "").trim();
        APP.manualFallback.station = APP.manualFallback.station || String(parsed.stationMeta.station || parsed.stationName || "").trim();
      } else if (!APP.manualFallback.station) {
        APP.manualFallback.station = String(parsed.stationName || "").trim();
      }
      continue;
    }

    const productName = parsed.productName;
    const product = ensureProduct(productName);
    const station = ensureStation(product, parsed.stationName, parsed.stationFolder, parsed.stationMeta);
    station.rawTxtFiles.push(file);
    acceptedTxt += 1;

    if (parsed.stationMeta) {
      product.lotNos.add(parsed.stationMeta.lotNo);
      product.waferIds.add(parsed.stationMeta.waferId);
      product.datetimes.add(parsed.stationMeta.datetime);
    }
    product.rootNames.add(parsed.stationFolder);
  }

  const stationNames = getStationNames();
  APP.activeStation = stationNames[0] ?? "";
  APP.activeProduct = getProducts()[0]?.name ?? "";
  initializeScopeSelection();

  renderMeta(buildMetaCards());
  renderScopeSelection();

  const txtCount = getTotalRawTxtCount();
  if (!txtCount) {
    showMessage("未找到符合產品目錄（FAG/EAG/MAG/AAG/KAG/RAG）且位於 home/*/rawdata 的 .TXT 檔案。", "error");
  } else {
    const skipped = Math.max(0, totalTxt - acceptedTxt);
    const skippedText = skipped > 0 ? `，略過 ${skipped} 個非產品目錄 .TXT` : "";
    showMessage(`已找到 ${getProducts().length} 個產品、${stationNames.length} 個站點、共 ${txtCount} 個 .TXT 檔案${skippedText}。`, "success");
  }
  updateAnalyzeState();
}

function handleTxtSelection(event) {
  APP.sourceMode = "txt";
  APP.files = Array.from(event.target.files || []);
  APP.manualFallback.lotNo = "";
  APP.manualFallback.waferId = "";
  APP.manualFallback.station = "";
  APP.manualFallback.pendingFiles = [];
  APP.selectedScopes.clear();
  APP.rootName = "直接 TXT 上傳";
  APP.products.clear();
  APP.activeStation = "";
  APP.activeProduct = "";
  resetResultsUI();

  APP.manualProductName = "";
  const txtFiles = APP.files.filter((f) => f.name.toLowerCase().endsWith(".txt"));
  if (txtFiles.length > 0) {
    APP.manualFallback.pendingFiles = txtFiles.slice();
  }

  dom.folderName.textContent = txtFiles.length ? `直接 TXT 上傳（${txtFiles.length} 檔）` : "尚未選擇";
  renderMeta(buildMetaCards());
  renderScopeSelection();

  if (!txtFiles.length) showMessage("未選到任何 .TXT 檔案。", "error");
  else showMessage(`已選擇 ${txtFiles.length} 個 .TXT 檔案。請輸入 PRODUCT、LOTNO、WAFER ID、站點後開始分析。`, "info");

  updateAnalyzeState();
}

async function handleXlsxSelection(event) {
  APP.sourceMode = "xlsx";
  APP.files = Array.from(event.target.files || []).filter((f) => /\.(xlsx|xls)$/i.test(f.name));
  APP.manualFallback.lotNo = "";
  APP.manualFallback.waferId = "";
  APP.manualFallback.station = "";
  APP.manualFallback.pendingFiles = [];
  APP.selectedScopes.clear();
  APP.rootName = APP.files.length ? `匯入 XLSX（${APP.files.length} 檔）` : "";
  APP.products.clear();
  APP.activeStation = "";
  APP.activeProduct = "";
  APP.xlsxSummaryCards = [];
  resetResultsUI();

  dom.folderName.textContent = APP.files.length ? APP.rootName : "尚未選擇";
  if (APP.files.length > 0 && typeof XLSX !== "undefined") {
    APP.xlsxSummaryCards = await collectXlsxSummaryCards(APP.files);
  }
  renderMeta(buildMetaCards());
  renderScopeSelection();

  if (!APP.files.length) showMessage("未選到任何 XLSX 檔案。", "error");
  else if (typeof XLSX === "undefined") showMessage(`已選擇 ${APP.files.length} 個 XLSX 檔案，等待分析時再讀取 Summary。`, "info");
  else if (APP.xlsxSummaryCards.length > 0) showMessage(`已選擇 ${APP.files.length} 個 XLSX 檔案，已從 Summary 載入 PRODUCT / LOTID / WAFER ID。`, "success");
  else showMessage(`已選擇 ${APP.files.length} 個 XLSX 檔案，未在 Summary 找到完整欄位。`, "info");
  updateAnalyzeState();
}

function buildMetaCards() {
  if (APP.sourceMode === "xlsx" && APP.xlsxSummaryCards.length > 0 && !getProducts().length) {
    return APP.xlsxSummaryCards;
  }
  if (APP.sourceMode === "txt") {
    if (!getProducts().length) {
      return [{
        product: APP.manualProductName || "",
        lotNo: APP.manualFallback.lotNo || "",
        waferId: APP.manualFallback.waferId || "",
        station: APP.manualFallback.station || "",
        process: "",
        density: "",
        voltage: "",
        manualEditable: hasManualFallbackOnly(),
      }];
    }
    const name = getProducts()[0]?.name || "-";
    const product = getProductByName(name);
    return [{
      product: name,
      lotNo: "-",
      waferId: "-",
      station: "TXT",
      process: product?.process ?? "",
      density: product?.density ?? "",
      voltage: product?.voltage ?? "",
    }];
  }
  const cards = [];
  for (const product of getProducts()) {
    const stationNames = Array.from(product.stations.keys()).sort((a, b) => a.localeCompare(b));
    cards.push({
      product: product.name,
      lotNo: formatValueList(Array.from(product.lotNos).sort()),
      waferId: formatValueList(Array.from(product.waferIds).sort()),
      station: formatValueList(stationNames),
      stationNames,
      process: product.process || "",
      density: product.density || "",
      voltage: product.voltage || "",
    });
  }
  return cards.length ? cards : [{
    product: APP.manualProductName || "",
    lotNo: APP.manualFallback.lotNo || "",
    waferId: APP.manualFallback.waferId || "",
    station: APP.manualFallback.station || "",
    process: "",
    density: "",
    voltage: "",
    manualEditable: hasManualFallbackOnly(),
  }];
}

function renderMeta(cards) {
  dom.folderMeta.innerHTML = cards
    .map((card) => {
      const manualEditable = Boolean(card.manualEditable);
      const productName = String(card.product ?? "");
      const productEntries = getSelectableEntriesByProduct(productName);
      const canScopeSelect = APP.sourceMode === "folder" && !manualEditable && productEntries.length > 0;
      const selectedProductStations = productEntries.filter((entry) => APP.selectedScopes.has(entry.key));
      const selectedStationNames = Array.from(new Set(selectedProductStations.map((entry) => entry.station.name))).sort((a, b) => a.localeCompare(b));
      const stationText = canScopeSelect
        ? formatValueList(selectedStationNames)
        : String(card.station ?? "-");
      const productChip = manualEditable
        ? `<div class="meta-chip meta-input-chip"><div class="meta-key">PRODUCT</div><input type="text" class="meta-input" data-manual-field="product" value="${escapeHtml(String(card.product || ""))}" placeholder="請輸入產品名稱"></div>`
        : `<div class="meta-chip"><div class="meta-key">PRODUCT</div><div class="meta-value">${escapeHtml(String(card.product ?? "-"))}</div></div>`;
      const lotChip = manualEditable
        ? `<div class="meta-chip meta-input-chip"><div class="meta-key">LOTNO</div><input type="text" class="meta-input" data-manual-field="lotNo" value="${escapeHtml(String(card.lotNo || ""))}" placeholder="請輸入 LOTNO"></div>`
        : `<div class="meta-chip"><div class="meta-key">LOTNO</div><div class="meta-value">${escapeHtml(String(card.lotNo ?? "-"))}</div></div>`;
      const waferChip = manualEditable
        ? `<div class="meta-chip meta-input-chip"><div class="meta-key">WAFER ID</div><input type="text" class="meta-input" data-manual-field="waferId" value="${escapeHtml(String(card.waferId || ""))}" placeholder="請輸入 WAFER ID"></div>`
        : `<div class="meta-chip"><div class="meta-key">WAFER ID</div><div class="meta-value">${escapeHtml(String(card.waferId ?? "-"))}</div></div>`;
      const stationMenu = canScopeSelect
        ? `
          <div class="meta-scope-filter mt-1">
            <button type="button" class="meta-scope-trigger" data-meta-scope-menu-toggle="${escapeHtml(productName)}" aria-expanded="false">下拉多選（${selectedProductStations.length}/${productEntries.length}）</button>
            <div class="meta-scope-menu hidden" data-meta-scope-menu="${escapeHtml(productName)}">
              <label class="meta-scope-item"><input type="checkbox" data-scope-product="${escapeHtml(productName)}" ${isProductFullySelected(productName) ? "checked" : ""}> 勾選產品 ${escapeHtml(productName)}</label>
              ${productEntries
                .sort((a, b) => a.station.name.localeCompare(b.station.name))
                .map((entry) => `<label class="meta-scope-item"><input type="checkbox" data-scope-station="${escapeHtml(entry.key)}" ${APP.selectedScopes.has(entry.key) ? "checked" : ""}> ${escapeHtml(entry.station.name)} <span class="hint-text">(${entry.station.rawTxtFiles.length} 檔)</span></label>`)
                .join("")}
            </div>
          </div>
        `
        : "";
      const stationChip = manualEditable
        ? `<div class="meta-chip meta-input-chip"><div class="meta-key">站點</div><input type="text" class="meta-input" data-manual-field="station" value="${escapeHtml(String(card.station || ""))}" placeholder="請輸入站點"></div>`
        : `<div class="meta-chip"><div class="meta-key">站點</div><div class="meta-value">${escapeHtml(stationText)}</div>${stationMenu}</div>`;
      return `
      <div class="meta-row">
        ${productChip}
        ${lotChip}
        ${waferChip}
        ${stationChip}
        <div class="meta-chip meta-input-chip">
          <div class="meta-key">Process</div>
          <input type="text" class="meta-input" data-meta-product="${escapeHtml(String(card.product ?? ""))}" data-meta-field="process" value="${escapeHtml(String(card.process || ""))}" placeholder="範例:F45">
        </div>
        <div class="meta-chip meta-input-chip">
          <div class="meta-key">Density</div>
          <input type="text" class="meta-input" data-meta-product="${escapeHtml(String(card.product ?? ""))}" data-meta-field="density" value="${escapeHtml(String(card.density || ""))}" placeholder="範例: 256Mb">
        </div>
        <div class="meta-chip meta-input-chip">
          <div class="meta-key">Voltage</div>
          <input type="text" class="meta-input" data-meta-product="${escapeHtml(String(card.product ?? ""))}" data-meta-field="voltage" value="${escapeHtml(String(card.voltage || ""))}" placeholder="範例: 3V">
        </div>
      </div>
    `;
    })
    .join("");
  for (const checkbox of dom.folderMeta.querySelectorAll("input[data-scope-product]")) {
    const productName = checkbox.getAttribute("data-scope-product");
    if (!productName) continue;
    checkbox.indeterminate = isProductPartiallySelected(productName);
  }
  dom.folderMeta.classList.remove("hidden");
}

function onMetaInputChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  const manualField = target.getAttribute("data-manual-field");
  if (manualField) {
    const value = target.value.trim();
    if (manualField === "product") APP.manualProductName = value;
    else if (manualField === "lotNo") APP.manualFallback.lotNo = value;
    else if (manualField === "waferId") APP.manualFallback.waferId = value;
    else if (manualField === "station") APP.manualFallback.station = value;
    updateAnalyzeState();
    return;
  }
  const productName = target.getAttribute("data-meta-product");
  const field = target.getAttribute("data-meta-field");
  if (!productName || !field) return;
  const product = getProductByName(productName);
  if (!product) return;
  const value = target.value.trim();
  if (field === "process") product.process = value;
  else if (field === "density") product.density = value;
  else if (field === "voltage") product.voltage = value;
  else return;
  renderChartFilterOptions();
  renderChartSortOptions();
  renderKpi();
  renderCharts();
}

async function startAnalysis() {
  if (APP.sourceMode === "xlsx") {
    await startAnalysisFromXlsx();
    return;
  }
  APP.rawKeywordResults = [];
  renderRawKeywordResults([]);
  if (dom.rawKeywordResultSummary) dom.rawKeywordResultSummary.textContent = "尚未執行關鍵字分析。";

  if (dom.productInput) APP.manualProductName = dom.productInput.value.trim();
  let selectedEntries = APP.sourceMode === "folder" ? getSelectedStationEntries() : getSelectableStationEntries();
  if ((APP.sourceMode === "folder" || APP.sourceMode === "txt") && !selectedEntries.length && hasManualFallbackOnly()) {
    const productName = APP.manualProductName.trim();
    const stationName = APP.manualFallback.station.trim();
    const lotNo = APP.manualFallback.lotNo.trim();
    const waferId = APP.manualFallback.waferId.trim();
    if (!detectProductToken(productName)) {
      showMessage("PRODUCT 格式錯誤：必須以 FAG/EAG/MAG/AAG/KAG/RAG 開頭。", "error");
      updateAnalyzeState();
      return;
    }
    if (!productName || !stationName || !lotNo || !waferId) {
      showMessage("請先完整輸入 PRODUCT、LOTNO、WAFER ID、站點。", "error");
      updateAnalyzeState();
      return;
    }
    APP.products.clear();
    const product = ensureProduct(productName);
    product.lotNos.add(lotNo);
    product.waferIds.add(waferId);
    product.rootNames.add("手動輸入");
    const stationMeta = { lotNo, waferId, station: stationName, datetime: "-" };
    const station = ensureStation(product, stationName, stationName, stationMeta);
    station.rawTxtFiles = APP.manualFallback.pendingFiles.slice();
    APP.activeStation = stationName;
    APP.activeProduct = productName;
    initializeScopeSelection();
    renderMeta(buildMetaCards());
    renderScopeSelection();
    selectedEntries = getSelectedStationEntries();
  }
  const totalFiles = selectedEntries.reduce((acc, entry) => acc + entry.station.rawTxtFiles.length, 0);
  if (!totalFiles) {
    showMessage(APP.sourceMode === "folder" ? "請先勾選至少一個要分析的產品/站點。" : "請先選擇資料夾或上傳 TXT。", "error");
    updateAnalyzeState();
    return;
  }
  if (!APP.manualProductName && getProducts().length === 0) {
    showMessage("請先輸入產品名稱。", "error");
    updateAnalyzeState();
    return;
  }

  dom.analyzeBtn.disabled = true;
  dom.progressWrap.classList.remove("hidden");
  setProgress(0);
  showMessage("開始解析 TXT 檔案...", "info");

  let processed = 0;
  for (const product of getProducts()) {
    for (const station of product.stations.values()) {
      station.touchDownCount = 0;
      station.stationTotalTime = 0;
      station.siteTdMap = new Map();
      station.stats = [];
    }
  }

  for (const entry of selectedEntries) {
    const { station } = entry;
    const itemMap = new Map();
    const tdMaxMap = new Map();
    const siteTdMap = new Map();

    for (const file of station.rawTxtFiles) {
      const fileMeta = parseRawTxtFilename(file.name);
      const siteKey = fileMeta ? String(fileMeta.site) : "Unknown";
      const text = await file.text();
      const lines = text.split(/\r?\n/);

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const line = lines[lineIndex];
        const tdMatch = line.match(TOTAL_TEST_TIME_REGEX);
        if (tdMatch) {
          const td = String(Number.parseInt(tdMatch[1], 10));
          const tdTime = Number.parseFloat(tdMatch[2]);
          if (Number.isFinite(tdTime)) {
            const currentMax = tdMaxMap.get(td);
            if (currentMax === undefined || tdTime > currentMax) tdMaxMap.set(td, tdTime);

            const siteEntry = siteTdMap.get(siteKey) ?? new Map();
            const siteCurrentMax = siteEntry.get(td);
            if (siteCurrentMax === undefined || tdTime > siteCurrentMax) siteEntry.set(td, tdTime);
            siteTdMap.set(siteKey, siteEntry);
          }
        }

        const m = line.match(TEST_TIME_REGEX);
        if (!m) continue;
        const testNo = m[1].trim();
        const testItem = m[2].trim();
        const value = Number.parseFloat(m[3]);
        const unit = m[4].trim();
        if (!Number.isFinite(value)) continue;
        const lineMeta = parseTestTimeLineMeta(line);

        const row = itemMap.get(testItem) ?? { testNos: new Set(), testItem, values: [], unit };
        row.testNos.add(testNo);
        row.values.push({
          value,
          site: siteKey,
          td: lineMeta.td || "Unknown",
          systemDut: lineMeta.systemDut,
          x: lineMeta.x,
          y: lineMeta.y,
          testNo,
          testItem,
          lineIndex,
          lines,
          rawLine: line,
        });
        itemMap.set(testItem, row);
      }

      processed += 1;
      setProgress(Math.round((processed / totalFiles) * 100));
    }

    station.touchDownCount = tdMaxMap.size;
    station.stationTotalTime = Array.from(tdMaxMap.values()).reduce((acc, n) => acc + n, 0);
    station.siteTdMap = siteTdMap;
    station.stats = buildStats(itemMap, station.stationTotalTime, station.rawTxtFiles?.length || 1);
  }

  const stationsWithStats = getStationNames().filter((stationName) => getProductsInStation(stationName).length > 0);
  if (!stationsWithStats.length) {
    showMessage("未找到符合格式的 <<< Test Time >>> 記錄。", "error");
    updateAnalyzeState();
    return;
  }

  APP.activeStation = stationsWithStats[0];
  syncActiveProductForStation();
  renderStationTabs(stationsWithStats);
  renderProductTabs();
  renderChartFilterOptions();
  renderChartSortOptions();
  renderKpi();
  renderTable();
  renderCharts();
  renderSiteTdChart();
  APP.importWorkspaceCollapsed = true;
  syncImportWorkspaceCollapsedUI();
  showMessage(
    `分析完成：共 ${getProducts().length} 產品、${stationsWithStats.length} 站點、${getProducts().reduce((acc, p) => acc + Array.from(p.stations.values()).reduce((s, st) => s + st.stats.length, 0), 0)} 個 Test Item。`,
    "success",
  );
  updateAnalyzeState();
}

async function startAnalysisFromXlsx() {
  if (!APP.files.length) {
    showMessage("請先選擇 XLSX 檔案。", "error");
    updateAnalyzeState();
    return;
  }
  if (typeof XLSX === "undefined") {
    showMessage("XLSX 元件尚未載入。", "error");
    updateAnalyzeState();
    return;
  }

  APP.products.clear();
  APP.activeStation = "";
  APP.activeProduct = "";
  APP.rawKeywordResults = [];
  resetResultsUI();

  dom.analyzeBtn.disabled = true;
  dom.progressWrap.classList.remove("hidden");
  setProgress(0);
  showMessage("開始解析 XLSX 檔案...", "info");

  let processed = 0;
  for (const file of APP.files) {
    const buf = await file.arrayBuffer();
    const workbook = XLSX.read(buf, { type: "array" });
    importWorkbookData(workbook);
    processed += 1;
    setProgress(Math.round((processed / APP.files.length) * 100));
  }

  const stationNames = getStationNames().filter((name) => getProductsInStation(name).length > 0);
  if (!stationNames.length) {
    showMessage("匯入的 XLSX 未包含可用的統計資料。", "error");
    updateAnalyzeState();
    return;
  }

  APP.activeStation = stationNames[0];
  syncActiveProductForStation();
  applyImportedDashboardState(stationNames);
  renderMeta(buildMetaCards());
  renderStationTabs(stationNames);
  renderProductTabs();
  renderChartFilterOptions();
  renderChartSortOptions();
  renderKpi();
  renderTable();
  renderCharts();
  renderSiteTdChart();
  APP.importWorkspaceCollapsed = true;
  syncImportWorkspaceCollapsedUI();
  showMessage(`XLSX 匯入完成：共 ${getProducts().length} 產品、${stationNames.length} 站點。`, "success");
  updateAnalyzeState();
}

function getRawKeywordAnalysisEntries() {
  if (APP.sourceMode === "folder") return getSelectedStationEntries();
  return getSelectableStationEntries();
}

function normalizeBinToken(value) {
  const text = String(value || "").trim().toUpperCase();
  if (!text) return "";
  const num = text.match(/\d+/)?.[0];
  if (!num) return text;
  return `BIN${Number.parseInt(num, 10)}`;
}

function normalizeBinForDisplay(value) {
  const normalized = normalizeBinToken(value);
  return normalized || "N/A";
}

function toIntOrEmpty(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const num = Number.parseInt(text, 10);
  return Number.isFinite(num) ? String(num) : "";
}

function makeXyTdKey(x, y, td) {
  const xKey = toIntOrEmpty(x);
  const yKey = toIntOrEmpty(y);
  const tdKey = toIntOrEmpty(td);
  if (!xKey || !yKey || !tdKey) return "";
  return `${xKey},${yKey},${tdKey}`;
}

function makeTdDutKey(td, dut) {
  const tdKey = toIntOrEmpty(td);
  const dutKey = toIntOrEmpty(dut);
  if (!tdKey || !dutKey) return "";
  return `${tdKey},${dutKey}`;
}

function parseXyToDutMap(lines) {
  const map = new Map();
  let inGetXySection = false;
  for (const line of lines) {
    const text = String(line || "");
    if (/Get_XY_SYSDUT_Info\s+Start/i.test(text)) {
      inGetXySection = true;
      continue;
    }
    if (/Get_XY_SYSDUT_Info\s+End/i.test(text) || /All DUTs BinOut/i.test(text)) {
      inGetXySection = false;
    }
    if (!inGetXySection) continue;
    if (!/xloc\s*=/i.test(text) || !/yloc\s*=/i.test(text) || !/utl_dut\s*=/i.test(text)) continue;

    const lineMeta = parseTestTimeLineMeta(text);
    const xlocMatch = text.match(/xloc\s*=\s*(-?\d+)/i);
    const ylocMatch = text.match(/yloc\s*=\s*(-?\d+)/i);
    const x = xlocMatch?.[1] || lineMeta.x || "";
    const y = ylocMatch?.[1] || lineMeta.y || "";
    const td = lineMeta.td || "";
    const utlDutMatch = text.match(/utl_dut\s*=\s*(\d+)/i);
    const dut = utlDutMatch?.[1] || "";

    const xyTdKey = makeXyTdKey(x, y, td);
    const dutKey = toIntOrEmpty(dut);
    if (!xyTdKey || !dutKey) continue;
    map.set(xyTdKey, dutKey);
  }
  return map;
}

function parseDutToBinMap(lines) {
  const map = new Map();
  for (const line of lines) {
    const text = String(line || "");
    const lineMeta = parseTestTimeLineMeta(text);
    const direct = text.match(/DUT\s*0*(\d+).*?BIN\s*0*(\d+)/i);
    if (direct) {
      const tdDutKey = makeTdDutKey(lineMeta.td, direct[1]);
      if (tdDutKey) map.set(tdDutKey, `BIN${Number.parseInt(direct[2], 10)}`);
      continue;
    }
    const reverse = text.match(/BIN\s*0*(\d+).*?DUT\s*0*(\d+)/i);
    if (reverse) {
      const tdDutKey = makeTdDutKey(lineMeta.td, reverse[2]);
      if (tdDutKey) map.set(tdDutKey, `BIN${Number.parseInt(reverse[1], 10)}`);
    }
  }
  return map;
}

function parseXyFromRawLine(line) {
  const lineMeta = parseTestTimeLineMeta(line);
  if (lineMeta.x && lineMeta.y) return { x: lineMeta.x, y: lineMeta.y, td: lineMeta.td || "" };
  const fallback = String(line || "").match(/:(-?\d+)\s*,\s*(-?\d+):/);
  if (!fallback) return { x: "", y: "", td: lineMeta.td || "" };
  return { x: fallback[1], y: fallback[2], td: lineMeta.td || "" };
}

async function startRawKeywordAnalysis() {
  if (!APP.enableRawKeywordAnalysis || !dom.rawKeywordAnalysisToggle?.checked) {
    showMessage("請先勾選步驟三(Option)再進行關鍵字分析。", "error");
    syncRawKeywordAnalysisUI();
    return;
  }
  const keyword = String(dom.rawKeywordInput?.value || "").trim();
  if (!keyword) {
    showMessage("請先輸入 RAWDATA 關鍵字。", "error");
    syncRawKeywordAnalysisUI();
    return;
  }

  const entries = getRawKeywordAnalysisEntries();
  if (!entries.length) {
    showMessage("目前沒有可分析的 RAWDATA 檔案。", "error");
    syncRawKeywordAnalysisUI();
    return;
  }

  const targetBin = normalizeBinToken(dom.rawBinInput?.value || "");
  if (dom.rawKeywordAnalyzeBtn) {
    dom.rawKeywordAnalyzeBtn.disabled = true;
    dom.rawKeywordAnalyzeBtn.textContent = "分析中...";
  }
  if (dom.rawKeywordResultSummary) dom.rawKeywordResultSummary.textContent = "關鍵字分析中，請稍候...";

  const keywordLower = keyword.toLowerCase();
  const results = [];

  for (const entry of entries) {
    const stationName = String(entry.station?.name || "").trim() || "N/A";
    for (const file of entry.station.rawTxtFiles || []) {
      const text = await file.text();
      const lines = text.split(/\r?\n/);
      const xyToDut = parseXyToDutMap(lines);
      const dutToBin = parseDutToBinMap(lines);
      const siteParsed = parseRawTxtFilename(file.name);
      const site = Number.isFinite(siteParsed?.site) ? String(siteParsed.site) : "Unknown";

      for (const line of lines) {
        const rawLine = String(line || "").trim();
        if (!rawLine) continue;
        if (!rawLine.toLowerCase().includes(keywordLower)) continue;

        const { x, y, td } = parseXyFromRawLine(rawLine);
        const xyTdKey = makeXyTdKey(x, y, td);
        const utlDut = xyTdKey ? (xyToDut.get(xyTdKey) || "N/A") : "N/A";
        const tdDutKey = utlDut !== "N/A" ? makeTdDutKey(td, utlDut) : "";
        const binRaw = tdDutKey ? (dutToBin.get(tdDutKey) || "N/A") : "N/A";
        const bin = normalizeBinForDisplay(binRaw);
        if (targetBin && bin !== targetBin) continue;

        results.push({
          station: stationName,
          site,
          td: toIntOrEmpty(td) || "N/A",
          bin,
          utlDut: utlDut === "N/A" ? "N/A" : String(utlDut),
          x: toIntOrEmpty(x) || "N/A",
          y: toIntOrEmpty(y) || "N/A",
          rawLine,
        });
      }
    }
  }

  APP.rawKeywordResults = results;
  renderRawKeywordResults(results);
  if (dom.rawKeywordResultSummary) {
    const binLabel = targetBin ? `（BIN 篩選：${targetBin}）` : "";
    dom.rawKeywordResultSummary.textContent = `共找到 ${results.length} 筆命中資料${binLabel}。`;
  }
  showMessage(`關鍵字分析完成：命中 ${results.length} 筆。`, "success");
  if (dom.rawKeywordAnalyzeBtn) {
    dom.rawKeywordAnalyzeBtn.textContent = "開始分析";
  }
  if (dom.rawKeywordExportBtn) {
    dom.rawKeywordExportBtn.disabled = results.length === 0;
  }
  syncRawKeywordAnalysisUI();
}

function exportRawKeywordResultsXlsx() {
  if (!APP.rawKeywordResults.length) {
    showMessage("目前沒有可匯出的關鍵字搜尋結果。", "error");
    return;
  }
  if (typeof XLSX === "undefined") {
    showMessage("XLSX 匯出元件尚未載入。", "error");
    return;
  }

  const rows = [
    ["Station", "Site", "TD", "BIN", "UTL_DUT", "X", "Y", "RawLine"],
    ...APP.rawKeywordResults.map((row) => [
      row.station || "",
      row.site || "",
      row.td || "",
      row.bin || "",
      row.utlDut || "",
      row.x || "",
      row.y || "",
      row.rawLine || "",
    ]),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Keyword_Results");

  const metaRows = [
    ["Key", "Value"],
    ["Keyword", String(dom.rawKeywordInput?.value || "").trim()],
    ["BIN Filter", String(dom.rawBinInput?.value || "").trim() || "ALL"],
    ["Result Count", String(APP.rawKeywordResults.length)],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(metaRows), "Summary");

  const keyword = sanitizeFileName(String(dom.rawKeywordInput?.value || "").trim() || "keyword");
  XLSX.writeFile(wb, `${keyword}_keyword_results.xlsx`);
  showMessage("關鍵字搜尋結果已匯出 XLSX。", "success");
}

function importWorkbookData(workbook) {
  const importedState = parseDashboardState(workbook);
  if (importedState && !APP.importedDashboardState) APP.importedDashboardState = importedState;
  const summaryEntries = parseSummaryEntries(workbook);
  const dataSheets = workbook.SheetNames.filter((name) => name !== "Summary" && name !== "Dashboard_State");
  const statsSheets = [];
  const siteSheets = [];

  for (const sheetName of dataSheets) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: true, defval: "" });
    const header = rows[0] ?? [];
    if (isStatsSheet(header)) statsSheets.push({ sheetName, rows });
    else if (isSiteSheet(header)) siteSheets.push({ sheetName, rows });
  }

  const entryCount = Math.max(summaryEntries.length, statsSheets.length, siteSheets.length);
  for (let idx = 0; idx < entryCount; idx += 1) {
    const summary = summaryEntries[idx] ?? {};
    const inferred = parseEntryFromSheetName(statsSheets[idx]?.sheetName || siteSheets[idx]?.sheetName || "");
    const keyParsed = parseSummaryEntryKey(summary.key);
    const productName = String(summary.product || keyParsed.product || inferred.product || "").trim() || "UNSPECIFIED";
    const stationName = String(summary.station || keyParsed.station || inferred.station || "").trim() || "UNSPECIFIED";
    const rootName = String(summary.root || "").trim() || `${productName}_${stationName}`;
    const parsedMeta = parseRootMeta(rootName);
    const lotNo = String(summary.lotNo || summary.lot || "").trim();
    const waferId = String(summary.waferId || summary.wafer || "").trim();

    const product = ensureProduct(productName);
    const station = ensureStation(product, stationName, rootName, parsedMeta);
    station.rootFolderName = rootName;
    station.parsedMeta = parsedMeta;

    const statRows = statsSheets[idx]?.rows ?? [];
    if (statRows.length > 1) {
      station.stats = parseStatsRows(statRows);
      mergeImportedGroupingFromStats(station.name, station.stats);
    }

    const siteRows = siteSheets[idx]?.rows ?? [];
    if (siteRows.length > 1) station.siteTdMap = parseSiteTdRows(siteRows);

    const summaryTd = Number.parseInt(summary.touchDownCount || "0", 10);
    station.touchDownCount = Number.isFinite(summaryTd) ? summaryTd : 0;

    const summaryTotal = Number.parseFloat(summary.stationTotalTimeSeconds || "0");
    const derivedTotal = calculateStationTotalFromSiteTd(station.siteTdMap);
    station.stationTotalTime = Number.isFinite(derivedTotal) && derivedTotal > 0 ? derivedTotal : (Number.isFinite(summaryTotal) ? summaryTotal : 0);
    if (!station.touchDownCount || station.touchDownCount <= 0) station.touchDownCount = countTouchDown(station.siteTdMap);

    if (parsedMeta) {
      product.lotNos.add(parsedMeta.lotNo);
      product.waferIds.add(parsedMeta.waferId);
      product.datetimes.add(parsedMeta.datetime);
    }
    if (lotNo) product.lotNos.add(lotNo);
    if (waferId) product.waferIds.add(waferId);
    product.rootNames.add(rootName);
  }
}

function parseSummaryEntries(workbook) {
  const summary = workbook.Sheets.Summary;
  if (!summary) return [];
  const rows = XLSX.utils.sheet_to_json(summary, { header: 1, raw: true, defval: "" });
  if (!rows.length) return [];
  const header = rows[0].map((v) => String(v || "").trim());
  const entries = [];
  for (let col = 1; col < header.length; col += 1) entries.push({ key: header[col] });
  for (let r = 1; r < rows.length; r += 1) {
    const row = rows[r];
    const field = String(row[0] || "").trim();
    if (!field) continue;
    for (let col = 1; col < header.length; col += 1) {
      const entry = entries[col - 1];
      if (!entry) continue;
      entry[fieldToSummaryKey(field)] = String(row[col] ?? "").trim();
    }
  }
  return entries;
}

function fieldToSummaryKey(field) {
  const raw = String(field || "").trim();
  const normalized = raw.replaceAll(/\s+/g, "").replaceAll("_", "").toLowerCase();
  if (normalized === "product" || normalized === "產品名稱" || normalized === "產品") return "product";
  if (normalized === "root" || normalized === "rootfolder" || normalized === "主目錄") return "root";
  if (normalized === "station" || normalized === "站點") return "station";
  if (normalized === "lotno" || normalized === "lot" || normalized === "lotid" || normalized === "批號") return "lotNo";
  if (normalized === "waferid" || normalized === "wafer" || normalized === "晶圓id") return "waferId";
  if (normalized === "process") return "process";
  if (normalized === "density") return "density";
  if (normalized === "voltage") return "voltage";
  if (normalized === "touchdowncount") return "touchDownCount";
  if (normalized === "stationtotaltimeseconds") return "stationTotalTimeSeconds";
  return raw;
}

async function collectXlsxSummaryCards(files) {
  const byProduct = new Map();
  for (const file of files) {
    const buf = await file.arrayBuffer();
    const workbook = XLSX.read(buf, { type: "array" });
    const entries = parseSummaryEntries(workbook);
    for (const entry of entries) {
      const keyParsed = parseSummaryEntryKey(entry.key);
      const productName = String(entry.product || keyParsed.product || "").trim() || "UNSPECIFIED";
      const stationName = String(entry.station || keyParsed.station || "").trim();
      const lotNo = String(entry.lotNo || entry.lot || "").trim();
      const waferId = String(entry.waferId || entry.wafer || "").trim();
      const process = String(entry.process || "").trim();
      const density = String(entry.density || "").trim();
      const voltage = String(entry.voltage || "").trim();
      const bucket = byProduct.get(productName) || {
        product: productName,
        lotNos: new Set(),
        waferIds: new Set(),
        stations: new Set(),
        processes: new Set(),
        densities: new Set(),
        voltages: new Set(),
      };
      if (lotNo) bucket.lotNos.add(lotNo);
      if (waferId) bucket.waferIds.add(waferId);
      if (stationName) bucket.stations.add(stationName);
      if (process) bucket.processes.add(process);
      if (density) bucket.densities.add(density);
      if (voltage) bucket.voltages.add(voltage);
      byProduct.set(productName, bucket);
    }
  }
  const cards = Array.from(byProduct.values())
    .sort((a, b) => a.product.localeCompare(b.product))
    .map((item) => ({
      product: item.product,
      lotNo: formatValueList(Array.from(item.lotNos).sort()),
      waferId: formatValueList(Array.from(item.waferIds).sort()),
      station: formatValueList(Array.from(item.stations).sort()),
      process: formatValueList(Array.from(item.processes).sort()),
      density: formatValueList(Array.from(item.densities).sort()),
      voltage: formatValueList(Array.from(item.voltages).sort()),
    }));
  return cards;
}

function parseSummaryEntryKey(key) {
  const text = String(key || "").trim();
  if (!text) return { product: "", station: "" };
  const parts = text.split("_").filter(Boolean);
  if (parts.length < 2) return { product: "", station: "" };
  const station = parts[parts.length - 1];
  const product = parts.slice(0, -1).join("_");
  return { product, station };
}

function isStatsSheet(header) {
  const h = header.map((v) => String(v || "").trim());
  return h.includes("Test Item") && h.includes("Count") && h.includes("Mean(s)");
}

function isSiteSheet(header) {
  const h = header.map((v) => String(v || "").trim());
  return h.includes("TouchDown") && h.includes("Site") && h.includes("Time(s)");
}

function parseEntryFromSheetName(sheetName) {
  const text = String(sheetName || "");
  const m = text.match(/^(.+)_([^_]+)_(TestItem_Stats|Site_TouchDown)$/i);
  if (!m) return { product: "", station: "" };
  return { product: m[1], station: m[2] };
}

function parseDashboardState(workbook) {
  const sheet = workbook?.Sheets?.Dashboard_State;
  if (!sheet) return null;
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });
  if (!Array.isArray(rows) || rows.length < 2) return null;
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const key = String(row[0] ?? "").trim();
    if (key !== "DashboardState") continue;
    const raw = String(row[1] ?? "").trim();
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

function buildDashboardStateSnapshot() {
  return {
    version: 1,
    activeStation: APP.activeStation,
    activeProduct: APP.activeProduct,
    activeChartTab: APP.activeChartTab,
    chartSortProduct: APP.chartSortProduct,
    chartFilters: {
      product: Array.isArray(APP.chartFilters.product) ? [...APP.chartFilters.product] : [],
      process: Array.isArray(APP.chartFilters.process) ? [...APP.chartFilters.process] : [],
      density: Array.isArray(APP.chartFilters.density) ? [...APP.chartFilters.density] : [],
      voltage: Array.isArray(APP.chartFilters.voltage) ? [...APP.chartFilters.voltage] : [],
    },
    tableSort: {
      key: APP.tableSort?.key || "mean",
      dir: APP.tableSort?.dir === "asc" ? "asc" : "desc",
    },
    tableExpanded: Array.from(APP.tableExpanded.values()),
    tableCollapsed: Boolean(APP.tableCollapsed),
    siteTdCollapsed: Boolean(APP.siteTdCollapsed),
    scopeCollapsed: Boolean(APP.scopeCollapsed),
    kpiCollapsed: Boolean(APP.kpiCollapsed),
    chartCollapsed: Boolean(APP.chartCollapsed),
    floatingStationTabsCollapsed: Boolean(APP.floatingStationTabsCollapsed),
    selectedScopes: Array.from(APP.selectedScopes.values()),
    enableAnomalyDetail: Boolean(APP.enableAnomalyDetail),
    scenarioOverrides: serializeOverrideMap(APP.scenarioOverrides),
    groupScenarioOverrides: serializeOverrideMap(APP.groupScenarioOverrides),
  };
}

function serializeOverrideMap(mapObj) {
  if (!(mapObj instanceof Map)) return [];
  return Array.from(mapObj.entries()).map(([key, payload]) => {
    const mean = Number(payload?.mean);
    const range = Number(payload?.range);
    return [
      String(key || "").trim(),
      {
        mean: Number.isFinite(mean) ? mean : null,
        range: Number.isFinite(range) ? range : null,
      },
    ];
  });
}

function deserializeOverrideMap(rawEntries) {
  const mapObj = new Map();
  if (!Array.isArray(rawEntries)) return mapObj;
  for (const pair of rawEntries) {
    if (!Array.isArray(pair) || pair.length < 2) continue;
    const key = String(pair[0] || "").trim();
    if (!key) continue;
    const payload = pair[1] ?? {};
    const mean = Number(payload?.mean);
    const range = Number(payload?.range);
    const next = {};
    if (Number.isFinite(mean) && mean >= 0) next.mean = mean;
    if (Number.isFinite(range) && range >= 0) next.range = range;
    if (Object.keys(next).length > 0) mapObj.set(key, next);
  }
  return mapObj;
}

function applyImportedDashboardState(stationNames) {
  const state = APP.importedDashboardState;
  APP.importedDashboardState = null;
  if (!state || typeof state !== "object") return;

  const availableStations = new Set((Array.isArray(stationNames) ? stationNames : []).map((v) => String(v || "").trim()).filter(Boolean));
  const requestedStation = String(state.activeStation || "").trim();
  if (requestedStation && availableStations.has(requestedStation)) APP.activeStation = requestedStation;

  syncActiveProductForStation();
  const productsInStation = getProductsInStation(APP.activeStation);
  const productNames = new Set(productsInStation.map((p) => p.name));

  const requestedProduct = String(state.activeProduct || "").trim();
  if (requestedProduct && productNames.has(requestedProduct)) APP.activeProduct = requestedProduct;

  const requestedSortProduct = String(state.chartSortProduct || "").trim();
  if (requestedSortProduct && productNames.has(requestedSortProduct)) APP.chartSortProduct = requestedSortProduct;

  APP.activeChartTab = state.activeChartTab === "group" ? "group" : "item";
  APP.tableSort = normalizeImportedTableSort(state.tableSort);
  APP.tableExpanded = normalizeImportedExpandedKeys(state.tableExpanded);
  APP.chartFilters = normalizeImportedChartFilters(state.chartFilters, productsInStation);
  APP.selectedScopes = normalizeStringSet(state.selectedScopes);

  APP.tableCollapsed = parseBooleanOrDefault(state.tableCollapsed, APP.tableCollapsed);
  APP.siteTdCollapsed = parseBooleanOrDefault(state.siteTdCollapsed, APP.siteTdCollapsed);
  APP.scopeCollapsed = parseBooleanOrDefault(state.scopeCollapsed, APP.scopeCollapsed);
  APP.kpiCollapsed = parseBooleanOrDefault(state.kpiCollapsed, APP.kpiCollapsed);
  APP.chartCollapsed = parseBooleanOrDefault(state.chartCollapsed, APP.chartCollapsed);
  APP.floatingStationTabsCollapsed = parseBooleanOrDefault(state.floatingStationTabsCollapsed, APP.floatingStationTabsCollapsed);
  APP.enableAnomalyDetail = parseBooleanOrDefault(state.enableAnomalyDetail, APP.enableAnomalyDetail);
  if (dom.anomalyDetailToggle) dom.anomalyDetailToggle.checked = APP.enableAnomalyDetail;

  APP.scenarioOverrides = deserializeOverrideMap(state.scenarioOverrides);
  APP.groupScenarioOverrides = deserializeOverrideMap(state.groupScenarioOverrides);

  syncActiveProductForStation();
}

function normalizeImportedTableSort(rawSort) {
  const allowed = new Set(["testItem", "count", "mean", "median", "range", "ttRatio", "min", "max"]);
  const key = String(rawSort?.key || "mean").trim();
  const dir = rawSort?.dir === "asc" ? "asc" : "desc";
  return { key: allowed.has(key) ? key : "mean", dir };
}

function normalizeImportedExpandedKeys(rawExpanded) {
  if (!Array.isArray(rawExpanded)) return new Set();
  return new Set(rawExpanded.map((v) => String(v || "").trim()).filter(Boolean));
}

function normalizeImportedChartFilters(rawFilters, productsInStation) {
  const products = productsInStation.map((p) => p.name);
  const processes = Array.from(new Set(productsInStation.map((p) => String(p.process || "").trim()).filter(Boolean)));
  const densities = Array.from(new Set(productsInStation.map((p) => String(p.density || "").trim()).filter(Boolean)));
  const voltages = Array.from(new Set(productsInStation.map((p) => String(p.voltage || "").trim()).filter(Boolean)));
  const pick = (values, allowed) => {
    const allowSet = new Set(allowed);
    if (!Array.isArray(values)) return [];
    return values.map((v) => String(v || "").trim()).filter((v) => v && allowSet.has(v));
  };
  return {
    product: pick(rawFilters?.product, products),
    process: pick(rawFilters?.process, processes),
    density: pick(rawFilters?.density, densities),
    voltage: pick(rawFilters?.voltage, voltages),
  };
}

function normalizeStringSet(rawValues) {
  if (!Array.isArray(rawValues)) return new Set();
  return new Set(rawValues.map((v) => String(v || "").trim()).filter(Boolean));
}

function parseBooleanOrDefault(value, fallback) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return Boolean(fallback);
}

function parseStatsRows(rows) {
  const header = (rows[0] ?? []).map((v) => String(v ?? "").trim());
  const idxMap = new Map(header.map((name, idx) => [name, idx]));
  const stats = [];
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const testItem = String(getCellByHeader(row, idxMap, ["Test Item"], 1) ?? "").trim();
    if (!testItem) continue;
    const count = Number.parseInt(getCellByHeader(row, idxMap, ["Count"], 2), 10);
    const mean = Number.parseFloat(getCellByHeader(row, idxMap, ["Mean(s)"], 3));
    const median = Number.parseFloat(getCellByHeader(row, idxMap, ["Median(s)"], 4));
    const range = Number.parseFloat(getCellByHeader(row, idxMap, ["Range(s)"], 5));
    const ttRatioRaw = Number.parseFloat(getCellByHeader(row, idxMap, ["TT Ratio/站點(%)", "TT Ratio/站點 (%)", "TT Ratio/站點"], 6));
    const ratioHeader = idxMap.has("TT Ratio/站點(%)")
      ? "TT Ratio/站點(%)"
      : (idxMap.has("TT Ratio/站點 (%)") ? "TT Ratio/站點 (%)" : "TT Ratio/站點");
    const ttRatio = normalizeTtRatioValue(ttRatioRaw, ratioHeader);
    const min = Number.parseFloat(getCellByHeader(row, idxMap, ["Min(s)"], 7));
    const max = Number.parseFloat(getCellByHeader(row, idxMap, ["Max(s)"], 8));
    const minSourceText = String(getCellByHeader(row, idxMap, ["Min Source(SITE/TD)"], 9) ?? "");
    const maxSourceText = String(getCellByHeader(row, idxMap, ["Max Source(SITE/TD)"], 10) ?? "");
    const maxDetailLine = String(getCellByHeader(row, idxMap, ["Max Detail RawLine"], -1) ?? "").trim();
    const minSource = parseSourceCell(minSourceText);
    const maxSource = parseSourceCell(maxSourceText);
    const unit = String(getCellByHeader(row, idxMap, ["Unit"], 12) ?? "S").trim() || "S";
    const testNos = String(getCellByHeader(row, idxMap, ["Test Nos"], 0) ?? "")
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);
    const group = String(getCellByHeader(row, idxMap, ["Group"], -1) ?? "").trim();
    stats.push({
      testNos,
      testItem,
      group,
      count: Number.isFinite(count) ? count : 0,
      mean: Number.isFinite(mean) ? mean : 0,
      median: Number.isFinite(median) ? median : 0,
      range: Number.isFinite(range) ? range : 0,
      ttRatio: Number.isFinite(ttRatio) ? ttRatio : 0,
      min: Number.isFinite(min) ? min : 0,
      max: Number.isFinite(max) ? max : 0,
      minSite: minSource.site,
      minTd: minSource.td,
      maxSite: maxSource.site,
      maxTd: maxSource.td,
      maxDetailLine,
      unit,
    });
  }
  return stats;
}

function mergeImportedGroupingFromStats(stationName, stats) {
  const stationKey = String(stationName || "").trim().toUpperCase();
  if (!stationKey || !Array.isArray(stats) || stats.length === 0) return;
  const stationMap = APP.groupingMapByStation.get(stationKey) ?? new Map();
  for (const stat of stats) {
    const testItem = String(stat?.testItem || "").trim();
    const group = String(stat?.group || "").trim();
    if (!testItem || !group) continue;
    stationMap.set(testItem, group);
  }
  if (stationMap.size > 0) {
    APP.groupingMapByStation.set(stationKey, stationMap);
    APP.groupingReady = true;
  }
}

function parseSiteTdRows(rows) {
  const siteTdMap = new Map();
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const tdText = String(row[0] ?? "").trim();
    const siteText = String(row[1] ?? "").trim();
    const val = Number.parseFloat(row[2]);
    const tdMatch = tdText.match(/(\d+)/);
    const siteMatch = siteText.match(/(\d+)/);
    if (!tdMatch || !siteMatch || !Number.isFinite(val)) continue;
    const td = String(Number.parseInt(tdMatch[1], 10));
    const site = String(Number.parseInt(siteMatch[1], 10));
    const siteMap = siteTdMap.get(site) ?? new Map();
    siteMap.set(td, val);
    siteTdMap.set(site, siteMap);
  }
  return siteTdMap;
}

function calculateStationTotalFromSiteTd(siteTdMap) {
  if (!siteTdMap || siteTdMap.size === 0) return 0;
  const tdMax = new Map();
  for (const tdMap of siteTdMap.values()) {
    for (const [td, value] of tdMap.entries()) {
      const current = tdMax.get(td);
      if (current === undefined || value > current) tdMax.set(td, value);
    }
  }
  return Array.from(tdMax.values()).reduce((acc, n) => acc + n, 0);
}

function countTouchDown(siteTdMap) {
  if (!siteTdMap || siteTdMap.size === 0) return 0;
  const tdSet = new Set();
  for (const tdMap of siteTdMap.values()) {
    for (const td of tdMap.keys()) tdSet.add(td);
  }
  return tdSet.size;
}

function syncActiveProductForStation() {
  const productsInStation = getProductsInStation(APP.activeStation);
  if (!productsInStation.length) {
    APP.activeProduct = "";
    return;
  }
  if (!productsInStation.some((p) => p.name === APP.activeProduct)) {
    APP.activeProduct = productsInStation[0].name;
  }
  if (!APP.chartSortProduct || !productsInStation.some((p) => p.name === APP.chartSortProduct)) {
    APP.chartSortProduct = APP.activeProduct;
  }
}

function renderStationTabs(stationNames) {
  if (!dom.stationTabsSection || !dom.stationTabs) return;
  const names = stationNames.map((name) => String(name || "").trim()).filter(Boolean);
  renderStationTabHost(dom.stationTabs, names);
  renderStationTabHost(dom.floatingStationTabs, names);
  dom.stationTabsSection.classList.toggle("hidden", names.length === 0);
  dom.floatingStationTabsPanel?.classList.toggle("hidden", names.length === 0);
  syncFloatingStationTabsCollapsedUI();
}

function renderStationTabHost(host, stationNames) {
  if (!host) return;
  host.innerHTML = "";
  for (const rawName of stationNames) {
    const name = String(rawName || "").trim();
    if (!name) continue;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "station-tab-btn";
    btn.dataset.station = name;
    btn.setAttribute("aria-selected", name === APP.activeStation ? "true" : "false");
    btn.textContent = name;
    host.appendChild(btn);
  }
}

function renderProductTabs() {
  const productsInStation = getProductsInStation(APP.activeStation);
  syncProductTabHost(dom.tableProductTabs, productsInStation);
  syncProductTabHost(dom.siteProductTabs, productsInStation);
}

function syncProductTabHost(host, productsInStation) {
  if (!host) return;
  host.innerHTML = "";
  for (const product of productsInStation) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "station-tab-btn";
    btn.dataset.product = product.name;
    btn.setAttribute("aria-selected", product.name === APP.activeProduct ? "true" : "false");
    btn.textContent = product.name;
    host.appendChild(btn);
  }
}

function onStationTabClick(event) {
  const btn = event.target instanceof Element ? event.target.closest("[data-station]") : null;
  if (!btn) return;
  const stationName = btn.getAttribute("data-station");
  if (!stationName) return;
  APP.activeStation = stationName;
  APP.tableExpanded.clear();
  APP.chartFilters.product = [];
  APP.chartFilters.process = [];
  APP.chartFilters.density = [];
  APP.chartFilters.voltage = [];
  syncActiveProductForStation();
  renderStationTabs(getStationNames().filter((s) => getProductsInStation(s).length > 0));
  renderProductTabs();
  renderChartFilterOptions();
  renderChartSortOptions();
  renderKpi();
  renderTable();
  renderCharts();
  renderSiteTdChart();
}

function onProductTabClick(event) {
  const btn = event.target instanceof Element ? event.target.closest("[data-product]") : null;
  if (!btn) return;
  const productName = btn.getAttribute("data-product");
  if (!productName) return;
  APP.activeProduct = productName;
  APP.tableExpanded.clear();
  renderProductTabs();
  renderKpi();
  renderTable();
  renderSiteTdChart();
}

function onChartSortProductChange() {
  APP.chartSortProduct = dom.chartSortProduct?.value || APP.chartSortProduct;
  renderCharts();
}

function onChartProductFilterToggle(event) {
  event.stopPropagation();
  const menu = dom.chartFilterProductMenu;
  const btn = dom.chartFilterProductBtn;
  if (!menu || !btn) return;
  closeAllChartMultiFilterMenus();
  const willOpen = menu.classList.contains("hidden");
  menu.classList.toggle("hidden", !willOpen);
  btn.setAttribute("aria-expanded", willOpen ? "true" : "false");
}

function onChartProductFilterItemChange(event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  if (!input.matches("[data-chart-product-filter]")) return;
  APP.chartFilters.product = getCheckedChartProductFilters();
  const totalOptions = dom.chartFilterProductMenu?.querySelectorAll("input[data-chart-product-filter]").length || 0;
  syncChartProductFilterButton(totalOptions);
  renderChartSortOptions();
  renderCharts();
}

function onDocumentClick(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (!target.closest(".chart-multi-filter")) {
    closeChartProductFilterMenu();
    closeAllChartMultiFilterMenus();
  }
  if (!target.closest(".scope-multi-filter")) {
    closeScopeMenus();
  }
  if (!target.closest(".meta-scope-filter")) {
    closeMetaScopeMenus();
  }
}

function onChartMultiFilterToggle(event, key) {
  event.stopPropagation();
  const targetDom = getChartFilterDomByKey(key);
  if (!targetDom) return;
  closeChartProductFilterMenu();
  closeAllChartMultiFilterMenus();
  const willOpen = targetDom.menu.classList.contains("hidden");
  targetDom.menu.classList.toggle("hidden", !willOpen);
  targetDom.button.setAttribute("aria-expanded", willOpen ? "true" : "false");
}

function onChartMultiFilterItemChange(event, key) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  if (!input.matches("[data-chart-filter-item]")) return;
  APP.chartFilters[key] = getCheckedChartMultiFilters(key);
  const totalOptions = getChartFilterDomByKey(key)?.menu.querySelectorAll("input[data-chart-filter-item]").length || 0;
  syncChartMultiFilterButton(key, `全部 ${capitalizeFilterKey(key)}`, totalOptions);
  renderChartSortOptions();
  renderCharts();
}

function onStatsBodyClick(event) {
  const btn = event.target instanceof Element ? event.target.closest("[data-expand-key]") : null;
  if (!btn) return;
  const key = btn.getAttribute("data-expand-key");
  if (!key) return;
  if (APP.tableExpanded.has(key)) APP.tableExpanded.delete(key);
  else APP.tableExpanded.add(key);
  renderTable();
}

function onScenarioInputChange(event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  if (!input.matches("[data-scenario-field]")) return;
  const field = input.getAttribute("data-scenario-field");
  const stationName = input.getAttribute("data-scenario-station");
  const productName = input.getAttribute("data-scenario-product");
  const testItem = input.getAttribute("data-scenario-item");
  if (!field || !stationName || !productName || !testItem) return;
  const product = getProductByName(productName);
  const station = product?.stations.get(stationName);
  const stat = station?.stats.find((s) => s.testItem === testItem);
  if (!product || !station || !stat || (field !== "mean" && field !== "range")) return;
  const next = Number.parseFloat(input.value);
  applyScenarioOverride(productName, stationName, testItem, field, next, stat[field]);
  syncScenarioCells();
  renderCharts();
}

function onScenarioResetClick() {
  APP.scenarioOverrides.clear();
  renderTable();
  renderCharts();
}

function onStatsHeadClick(event) {
  const btn = event.target instanceof Element ? event.target.closest("[data-sort-key]") : null;
  if (!btn) return;
  const key = btn.getAttribute("data-sort-key");
  if (!key) return;
  if (APP.tableSort.key === key) APP.tableSort.dir = APP.tableSort.dir === "asc" ? "desc" : "asc";
  else {
    APP.tableSort.key = key;
    APP.tableSort.dir = key === "testItem" ? "asc" : "desc";
  }
  renderTable();
}

function onGroupStatsHeadClick(event) {
  const btn = event.target instanceof Element ? event.target.closest("[data-group-sort-key]") : null;
  if (!btn) return;
  const key = btn.getAttribute("data-group-sort-key");
  if (!key) return;
  if (APP.groupTableSort.key === key) APP.groupTableSort.dir = APP.groupTableSort.dir === "asc" ? "desc" : "asc";
  else {
    APP.groupTableSort.key = key;
    APP.groupTableSort.dir = key === "group" ? "asc" : "desc";
  }
  renderTable();
}

function renderGroupSortHeaderState() {
  if (!dom.groupStatsThead) return;
  const sortButtons = dom.groupStatsThead.querySelectorAll("[data-group-sort-key]");
  for (const btn of sortButtons) {
    const key = btn.getAttribute("data-group-sort-key");
    const isSorted = key === APP.groupTableSort.key;
    btn.classList.toggle("is-sorted", isSorted);
    btn.classList.toggle("asc", isSorted && APP.groupTableSort.dir === "asc");
    btn.classList.toggle("desc", isSorted && APP.groupTableSort.dir === "desc");
  }
}

function renderSortHeaderState() {
  if (!dom.statsThead) return;
  const sortButtons = dom.statsThead.querySelectorAll("[data-sort-key]");
  for (const btn of sortButtons) {
    const key = btn.getAttribute("data-sort-key");
    const isSorted = key === APP.tableSort.key;
    btn.classList.toggle("is-sorted", isSorted);
    btn.classList.toggle("asc", isSorted && APP.tableSort.dir === "asc");
    btn.classList.toggle("desc", isSorted && APP.tableSort.dir === "desc");
  }
}

function buildStats(itemMap, stationTotalTime, fileCount = 1) {
  const results = [];
  for (const payload of itemMap.values()) {
    const valueRecords = payload.values.filter((entry) => Number.isFinite(entry?.value));
    const values = valueRecords.map((entry) => entry.value).sort((a, b) => a - b);
    const count = valueRecords.length;
    const sum = valueRecords.reduce((acc, entry) => acc + entry.value, 0);
    const mean = sum / count;
    const median = count % 2 === 0 ? (values[count / 2 - 1] + values[count / 2]) / 2 : values[Math.floor(count / 2)];
    const min = values[0];
    const max = values[count - 1];
    const range = max - min;
    const ttRatio = stationTotalTime > 0 ? (mean / stationTotalTime) * 100 : 0;
    let minRecord = null;
    let maxRecord = null;
    for (const entry of valueRecords) {
      if (!minRecord || entry.value < minRecord.value) minRecord = entry;
      if (!maxRecord || entry.value > maxRecord.value) maxRecord = entry;
    }
    results.push({
      testNos: Array.from(payload.testNos).sort((a, b) => Number(a) - Number(b)),
      testItem: payload.testItem,
      count,
      mean,
      median,
      range,
      min,
      max,
      ttRatio,
      unit: payload.unit,
      minSite: minRecord?.site || "Unknown",
      minTd: minRecord?.td || "Unknown",
      maxSite: maxRecord?.site || "Unknown",
      maxTd: maxRecord?.td || "Unknown",
      maxDetailLine: extractMaxDetailRawLine(maxRecord),
    });
  }
  return results.sort((a, b) => (b.mean !== a.mean ? b.mean - a.mean : a.testItem.localeCompare(b.testItem)));
}

function getRawdataSiteCount(station) {
  if (!station?.siteTdMap || station.siteTdMap.size === 0) return 0;
  const filtered = Array.from(station.siteTdMap.keys()).filter((site) => site !== "Unknown");
  return filtered.length > 0 ? filtered.length : station.siteTdMap.size;
}

function destroyKpiCharts() {
  if (window.KpiCompareReact?.clear && dom.kpiSection) {
    window.KpiCompareReact.clear(dom.kpiSection);
  }
}

function renderKpiComparisonCharts(rows) {
  dom.kpiSection.classList.remove("kpi-grid");
  if (window.KpiCompareReact?.render && dom.kpiSection) {
    window.KpiCompareReact.render(dom.kpiSection, {
      stationName: APP.activeStation,
      rows,
      colors: PRODUCT_COLORS,
    });
    return;
  }
  dom.kpiSection.innerHTML = '<div class="kpi-chart-meta">站點：' + escapeHtml(APP.activeStation) + '</div>';
}

function renderKpi() {
  const productsInStation = getProductsInStation(APP.activeStation);
  const rows = [];
  for (const product of productsInStation) {
    const station = product.stations.get(APP.activeStation);
    if (!station) continue;
    rows.push({
      productName: product.name,
      siteCount: getRawdataSiteCount(station),
      itemCount: station.stats.length,
      stationSeconds: station.stationTotalTime,
      stationMinutes: Number((station.stationTotalTime / 60).toFixed(3)),
      touchDownCount: station.touchDownCount,
      touchDownAvgSeconds: station.touchDownCount > 0 ? Number((station.stationTotalTime / station.touchDownCount).toFixed(3)) : 0,
      stationName: station.name,
    });
  }

  if (!rows.length) {
    destroyKpiCharts();
    dom.kpiSection.innerHTML = "";
    dom.kpiSection.classList.add("hidden");
    return;
  }

  if (APP.kpiCollapsed) {
    dom.kpiSection.classList.add("hidden");
    return;
  }

  if (rows.length > 1) {
    destroyKpiCharts();
    renderKpiComparisonCharts(rows);
    dom.kpiSection.classList.remove("hidden");
    return;
  }

  destroyKpiCharts();
  dom.kpiSection.classList.add("kpi-grid");
  const row = rows[0];
  const cards = [
    ["產品名稱", row.productName],
    ["TEST SITE 數", String(row.siteCount)],
    ["Test Item 種類數", String(row.itemCount)],
    ["測試站點時間", formatDuration(row.stationSeconds)],
    ["Touch Down 數", String(row.touchDownCount)],
    ["站點", row.stationName],
  ];
  dom.kpiSection.innerHTML = cards.map(
    ([title, value]) => `
      <div class="kpi-card">
        <div class="kpi-title">${title}</div>
        <div class="kpi-value">${escapeHtml(value)}</div>
      </div>
    `,
  ).join("");
  dom.kpiSection.classList.remove("hidden");
}

function makeScenarioOverrideKey(productName, stationName, testItem) {
  return `${String(productName || "").trim()}||${String(stationName || "").trim()}||${String(testItem || "").trim()}`;
}

function getScenarioOverride(productName, stationName, testItem) {
  return APP.scenarioOverrides.get(makeScenarioOverrideKey(productName, stationName, testItem)) || null;
}

function applyScenarioOverride(productName, stationName, testItem, field, nextValue, baseValue) {
  const key = makeScenarioOverrideKey(productName, stationName, testItem);
  const current = APP.scenarioOverrides.get(key) || {};
  if (Number.isFinite(nextValue) && nextValue >= 0 && Math.abs(nextValue - baseValue) > 1e-9) current[field] = nextValue;
  else delete current[field];
  if (!Number.isFinite(current.mean) && !Number.isFinite(current.range)) APP.scenarioOverrides.delete(key);
  else APP.scenarioOverrides.set(key, current);
}

function getScenarioMean(stat, productName, stationName) {
  const override = getScenarioOverride(productName, stationName, stat.testItem);
  return Number.isFinite(override?.mean) ? override.mean : stat.mean;
}

function getScenarioRange(stat, productName, stationName) {
  const override = getScenarioOverride(productName, stationName, stat.testItem);
  return Number.isFinite(override?.range) ? override.range : stat.range;
}

function getScenarioEffectiveMean(stat, productName, stationName) {
  const scenarioMean = getScenarioMean(stat, productName, stationName);
  const scenarioRange = getScenarioRange(stat, productName, stationName);
  const baseRange = Number(stat.range);
  const rangeFactor = Number.isFinite(baseRange) && baseRange > 0 ? scenarioRange / baseRange : 1;
  const effective = scenarioMean * (Number.isFinite(rangeFactor) && rangeFactor > 0 ? rangeFactor : 1);
  return Number.isFinite(effective) && effective >= 0 ? effective : 0;
}

function getScenarioStationTotalTime(productName, stationName) {
  const product = getProductByName(productName);
  const station = product?.stations.get(stationName);
  if (!station) return 0;
  const delta = station.stats.reduce((acc, stat) => acc + (getScenarioEffectiveMean(stat, productName, stationName) - stat.mean) * stat.count, 0);
  return Math.max(0, station.stationTotalTime + delta);
}

function getItemRatioBaseTotal(productName, stationName) {
  const product = getProductByName(productName);
  const station = product?.stations.get(stationName);
  if (!station) return 0;
  return station.stats.reduce((acc, stat) => {
    const mean = Number(stat.mean);
    if (!Number.isFinite(mean)) return acc;
    return acc + mean;
  }, 0);
}

function getItemBaseTtRatio(stat, productName, stationName, baseTotal = null) {
  const total = Number.isFinite(baseTotal) ? baseTotal : getItemRatioBaseTotal(productName, stationName);
  if (!Number.isFinite(total) || total <= 0) return 0;
  const mean = Number(stat.mean);
  if (!Number.isFinite(mean)) return 0;
  return (mean / total) * 100;
}

function getItemRatioScenarioTotal(productName, stationName) {
  const product = getProductByName(productName);
  const station = product?.stations.get(stationName);
  if (!station) return 0;
  return station.stats.reduce((acc, stat) => {
    const scenarioMean = getScenarioEffectiveMean(stat, productName, stationName);
    if (!Number.isFinite(scenarioMean)) return acc;
    return acc + scenarioMean;
  }, 0);
}

function getScenarioTtRatio(stat, productName, stationName, ratioBaseTotal = null) {
  const stationTotal = Number.isFinite(ratioBaseTotal) ? ratioBaseTotal : getItemRatioBaseTotal(productName, stationName);
  if (!Number.isFinite(stationTotal) || stationTotal <= 0) return 0;
  const scenarioMean = getScenarioEffectiveMean(stat, productName, stationName);
  return (scenarioMean / stationTotal) * 100;
}

function metricValueWithScenario(stat, metric, productName, stationName, ratioBaseTotal = null) {
  if (!stat) return 0;
  if (metric === "count") return stat.count;
  if (metric === "mean") return Number(getScenarioMean(stat, productName, stationName).toFixed(6));
  if (metric === "range") return Number(getScenarioRange(stat, productName, stationName).toFixed(6));
  return Number(getScenarioTtRatio(stat, productName, stationName, ratioBaseTotal).toFixed(6));
}

function sortStats(stats, sortKey, sortDir) {
  const sign = sortDir === "asc" ? 1 : -1;
  return stats.slice().sort((a, b) => {
    if (sortKey === "testItem") return a.testItem.localeCompare(b.testItem) * sign;
    const av = a[sortKey] ?? 0;
    const bv = b[sortKey] ?? 0;
    if (av === bv) return a.testItem.localeCompare(b.testItem);
    return (av - bv) * sign;
  });
}

function resolveGroupName(stationName, testItem) {
  const stationKey = String(stationName || "").trim().toUpperCase();
  const stationMap = APP.groupingMapByStation.get(stationKey);
  const mapped = stationMap?.get(String(testItem || "").trim());
  return mapped || "未分組";
}

function buildGroupStats(productName, stationName) {
  const product = getProductByName(productName);
  const station = product?.stations.get(stationName);
  if (!product || !station) return [];
  const groupMap = new Map();
  for (const stat of station.stats) {
    const groupName = String(stat.group || "").trim() || resolveGroupName(station.name, stat.testItem);
    const row = groupMap.get(groupName) ?? {
      group: groupName,
      count: 0,
      meanWeightedSum: 0,
      medianWeightedSum: 0,
      range: 0,
      min: Number.POSITIVE_INFINITY,
      minSite: "Unknown",
      minTd: "Unknown",
      max: Number.NEGATIVE_INFINITY,
      maxSite: "Unknown",
      maxTd: "Unknown",
    };
    row.count += stat.count;
    row.meanWeightedSum += stat.mean * stat.count;
    row.medianWeightedSum += stat.median * stat.count;
    row.range = Math.max(row.range, stat.range);
    if (stat.min < row.min) {
      row.min = stat.min;
      row.minSite = stat.minSite;
      row.minTd = stat.minTd;
    }
    if (stat.max > row.max) {
      row.max = stat.max;
      row.maxSite = stat.maxSite;
      row.maxTd = stat.maxTd;
    }
    groupMap.set(groupName, row);
  }
  const stationTotal = station.stationTotalTime > 0 ? station.stationTotalTime : 0;
  const fileCount = station.rawTxtFiles?.length || 1;
  return Array.from(groupMap.values())
    .map((row) => {
      const mean = row.count > 0 ? row.meanWeightedSum / row.count : 0;
      const median = row.count > 0 ? row.medianWeightedSum / row.count : 0;
      const ttRatio = stationTotal > 0 ? (mean / stationTotal) * 100 : 0;
      return {
        group: row.group,
        count: row.count,
        mean,
        median,
        range: row.range,
        min: Number.isFinite(row.min) ? row.min : 0,
        max: Number.isFinite(row.max) ? row.max : 0,
        minSite: row.minSite,
        minTd: row.minTd,
        maxSite: row.maxSite,
        maxTd: row.maxTd,
        ttRatio,
      };
    })
    .sort((a, b) => (b.mean !== a.mean ? b.mean - a.mean : a.group.localeCompare(b.group)));
}

function buildGroupedItemRows(stats, productName, stationName, ratioBaseTotal) {
  const groupMap = new Map();
  for (const stat of stats) {
    const groupName = String(stat.group || "").trim() || resolveGroupName(stationName, stat.testItem);
    const row = groupMap.get(groupName) || {
      group: groupName,
      items: [],
      count: 0,
      baseTotal: 0,
      scenarioTotal: 0,
      min: Number.POSITIVE_INFINITY,
      minSite: "Unknown",
      minTd: "Unknown",
      max: Number.NEGATIVE_INFINITY,
      maxSite: "Unknown",
      maxTd: "Unknown",
    };
    row.items.push(stat);
    row.count += stat.count;
    row.baseTotal += stat.mean * stat.count;
    row.scenarioTotal += getScenarioEffectiveMean(stat, productName, stationName) * stat.count;
    if (stat.min < row.min) {
      row.min = stat.min;
      row.minSite = stat.minSite;
      row.minTd = stat.minTd;
    }
    if (stat.max > row.max) {
      row.max = stat.max;
      row.maxSite = stat.maxSite;
      row.maxTd = stat.maxTd;
    }
    groupMap.set(groupName, row);
  }
  return Array.from(groupMap.values())
    .map((row) => ({
      ...row,
      ttRatio: ratioBaseTotal > 0 ? (row.baseTotal / ratioBaseTotal) * 100 : 0,
      scenarioTtRatio: ratioBaseTotal > 0 ? (row.scenarioTotal / ratioBaseTotal) * 100 : 0,
      min: Number.isFinite(row.min) ? row.min : 0,
      max: Number.isFinite(row.max) ? row.max : 0,
    }))
    .sort((a, b) => (b.baseTotal !== a.baseTotal ? b.baseTotal - a.baseTotal : a.group.localeCompare(b.group)));
}

function makeGroupScenarioOverrideKey(productName, stationName, groupName) {
  return `${String(productName || "").trim()}||${String(stationName || "").trim()}||${String(groupName || "").trim()}`;
}

function getGroupScenarioOverride(productName, stationName, groupName) {
  return APP.groupScenarioOverrides.get(makeGroupScenarioOverrideKey(productName, stationName, groupName)) || null;
}

function applyGroupScenarioOverride(productName, stationName, groupName, field, nextValue, baseValue) {
  const key = makeGroupScenarioOverrideKey(productName, stationName, groupName);
  const current = APP.groupScenarioOverrides.get(key) || {};
  if (Number.isFinite(nextValue) && nextValue >= 0 && Math.abs(nextValue - baseValue) > 1e-9) current[field] = nextValue;
  else delete current[field];
  if (!Number.isFinite(current.mean) && !Number.isFinite(current.range)) APP.groupScenarioOverrides.delete(key);
  else APP.groupScenarioOverrides.set(key, current);
}

function getGroupScenarioAggregateFromItems(productName, stationName, groupName) {
  const product = getProductByName(productName);
  const station = product?.stations.get(stationName);
  if (!product || !station) return { count: 0, mean: 0, range: 0, effectiveMean: 0 };
  const targetGroup = String(groupName || "").trim();
  if (!targetGroup) return { count: 0, mean: 0, range: 0, effectiveMean: 0 };

  let count = 0;
  let weightedMeanSum = 0;
  let effectiveTotal = 0;
  let maxRange = 0;
  for (const stat of station.stats) {
    const itemGroup = String(stat.group || "").trim() || resolveGroupName(station.name, stat.testItem);
    if (itemGroup !== targetGroup) continue;
    const itemCount = Number(stat.count);
    if (!Number.isFinite(itemCount) || itemCount <= 0) continue;
    const scenarioMean = getScenarioMean(stat, productName, stationName);
    const scenarioRange = getScenarioRange(stat, productName, stationName);
    const baseRange = Number(stat.range);
    const rangeFactor = Number.isFinite(baseRange) && baseRange > 0 ? scenarioRange / baseRange : 1;
    const effective = scenarioMean * (Number.isFinite(rangeFactor) && rangeFactor > 0 ? rangeFactor : 1);
    count += itemCount;
    weightedMeanSum += scenarioMean * itemCount;
    effectiveTotal += (Number.isFinite(effective) && effective >= 0 ? effective : 0) * itemCount;
    maxRange = Math.max(maxRange, Number.isFinite(scenarioRange) && scenarioRange >= 0 ? scenarioRange : 0);
  }

  return {
    count,
    mean: count > 0 ? weightedMeanSum / count : 0,
    range: maxRange,
    effectiveMean: count > 0 ? effectiveTotal / count : 0,
  };
}

function getGroupScenarioMean(stat, productName, stationName) {
  const override = getGroupScenarioOverride(productName, stationName, stat.group);
  if (Number.isFinite(override?.mean)) return override.mean;
  const fromItems = getGroupScenarioAggregateFromItems(productName, stationName, stat.group);
  return fromItems.count > 0 ? fromItems.mean : stat.mean;
}

function getGroupScenarioRange(stat, productName, stationName) {
  const override = getGroupScenarioOverride(productName, stationName, stat.group);
  if (Number.isFinite(override?.range)) return override.range;
  const fromItems = getGroupScenarioAggregateFromItems(productName, stationName, stat.group);
  return fromItems.count > 0 ? fromItems.range : stat.range;
}

function getGroupScenarioEffectiveMean(stat, productName, stationName) {
  const override = getGroupScenarioOverride(productName, stationName, stat.group);
  const hasGroupOverride = Number.isFinite(override?.mean) || Number.isFinite(override?.range);
  if (!hasGroupOverride) {
    const fromItems = getGroupScenarioAggregateFromItems(productName, stationName, stat.group);
    if (fromItems.count > 0) return fromItems.effectiveMean;
  }
  const scenarioMean = getGroupScenarioMean(stat, productName, stationName);
  const scenarioRange = getGroupScenarioRange(stat, productName, stationName);
  const baseRange = Number(stat.range);
  const rangeFactor = Number.isFinite(baseRange) && baseRange > 0 ? scenarioRange / baseRange : 1;
  const effective = scenarioMean * (Number.isFinite(rangeFactor) && rangeFactor > 0 ? rangeFactor : 1);
  return Number.isFinite(effective) && effective >= 0 ? effective : 0;
}

function getGroupScenarioStationTotalTime(productName, stationName) {
  const stats = buildGroupStats(productName, stationName);
  if (!stats.length) return 0;
  return stats.reduce((acc, stat) => acc + getGroupScenarioEffectiveMean(stat, productName, stationName) * stat.count, 0);
}

function getGroupScenarioTtRatio(stat, productName, stationName, scenarioStationTotal = null) {
  const stationTotal = Number.isFinite(scenarioStationTotal) ? scenarioStationTotal : getGroupScenarioStationTotalTime(productName, stationName);
  if (!Number.isFinite(stationTotal) || stationTotal <= 0) return 0;
  return (getGroupScenarioEffectiveMean(stat, productName, stationName) * stat.count / stationTotal) * 100;
}

function hasGroupScenarioOverrideForProduct(productName) {
  const productPrefix = `${String(productName || "").trim()}||`;
  for (const key of APP.groupScenarioOverrides.keys()) {
    if (String(key).startsWith(productPrefix)) return true;
  }
  return false;
}

function sortGroupStats(stats, sortKey, sortDir) {
  const sign = sortDir === "asc" ? 1 : -1;
  return stats.slice().sort((a, b) => {
    if (sortKey === "group") return a.group.localeCompare(b.group) * sign;
    const av = a[sortKey] ?? 0;
    const bv = b[sortKey] ?? 0;
    if (av === bv) return a.group.localeCompare(b.group);
    return (av - bv) * sign;
  });
}

function syncGroupScenarioCells() {
  const product = getActiveProduct();
  const station = getActiveStationData();
  if (!product || !station || !dom.groupStatsTbody) return;
  const statMap = new Map(buildGroupStats(product.name, station.name).map((s) => [s.group, s]));
  const scenarioStationTotal = getGroupScenarioStationTotalTime(product.name, station.name);
  const rows = dom.groupStatsTbody.querySelectorAll("tr[data-group-scenario-row='true']");
  for (const row of rows) {
    const groupName = row.getAttribute("data-group-scenario-name");
    if (!groupName) continue;
    const stat = statMap.get(groupName);
    if (!stat) continue;
    const ratioCell = row.querySelector("[data-group-scenario-tt-ratio='true']");
    if (ratioCell) ratioCell.textContent = fmt(getGroupScenarioTtRatio(stat, product.name, station.name, scenarioStationTotal));
  }
}

function renderItemTable() {
  const product = getActiveProduct();
  const station = getActiveStationData();
  if (!product || !station) {
    dom.tableSection.classList.add("hidden");
    APP.tableCollapsed = true;
    syncTableCollapsedUI();
    return;
  }
  const baseRatioTotal = getItemRatioBaseTotal(product.name, station.name);
  const statsWithComputedRatio = station.stats.map((s) => ({
    ...s,
    ttRatio: getItemBaseTtRatio(s, product.name, station.name, baseRatioTotal),
  }));
  const sorted = sortStats(statsWithComputedRatio, APP.tableSort.key, APP.tableSort.dir);
  const ratioBaseTotal = baseRatioTotal;
  const groupedRows = buildGroupedItemRows(sorted, product.name, station.name, ratioBaseTotal);
  dom.statsTbody.innerHTML = groupedRows
    .map((group) => {
      const groupKey = makeGroupExpandKey(station.name, group.group);
      const groupExpanded = APP.tableExpanded.has(groupKey);
      const groupRow = `
      <tr class="group-row" data-group-row="true" data-group-name="${escapeHtml(group.group)}">
        <td class="expand-cell"><button type="button" class="expand-btn" data-expand-key="${escapeHtml(groupKey)}" aria-expanded="${groupExpanded ? "true" : "false"}">${groupExpanded ? "−" : "+"}</button></td>
        <td class="col-group" title="${escapeHtml(group.group)}"><strong>${escapeHtml(group.group)}</strong></td>
        <td class="col-testitem">-</td>
        <td>${group.count}</td>
        <td>${fmt(group.baseTotal)}</td>
        <td>-</td>
        <td>-</td>
        <td>${fmt(group.ttRatio)}</td>
        <td>-</td>
        <td>-</td>
        <td data-group-scenario-tt-ratio="true">${fmt(group.scenarioTtRatio)}</td>
        <td>${fmt(group.min)}</td>
        <td>${escapeHtml(formatSiteTdSource(group.minSite, group.minTd))}</td>
        <td>${fmt(group.max)}</td>
        <td>${escapeHtml(formatSiteTdSource(group.maxSite, group.maxTd))}</td>
      </tr>`;
      if (!groupExpanded) return groupRow;
      const children = group.items.map((s) => {
        const rowKey = makeTableExpandKey(station.name, s.testItem);
        const canExpand = Boolean(s.maxDetailLine);
        const expanded = APP.tableExpanded.has(rowKey);
        const scenarioMean = getScenarioMean(s, product.name, station.name);
        const scenarioRange = getScenarioRange(s, product.name, station.name);
        const scenarioRatio = getScenarioTtRatio(s, product.name, station.name, ratioBaseTotal);
        const baseRow = `
        <tr class="group-child-row" data-scenario-row="true" data-scenario-item="${escapeHtml(s.testItem)}">
          <td class="expand-cell">${APP.enableAnomalyDetail && canExpand ? `<button type="button" class="expand-btn" data-expand-key="${escapeHtml(rowKey)}" aria-expanded="${expanded ? "true" : "false"}">${expanded ? "−" : "+"}</button>` : ""}</td>
          <td class="col-group"></td>
          <td class="col-testitem" title="${escapeHtml(s.testItem)}"><span class="group-child-label">${escapeHtml(s.testItem)}</span></td>
          <td>${s.count}</td>
          <td>${fmt(s.mean)}</td>
          <td>${fmt(s.median)}</td>
          <td>${fmt(s.range)}</td>
          <td>${fmt(s.ttRatio)}</td>
          <td><input type="number" min="0" step="0.000001" class="scenario-input" data-scenario-field="mean" data-scenario-product="${escapeHtml(product.name)}" data-scenario-station="${escapeHtml(station.name)}" data-scenario-item="${escapeHtml(s.testItem)}" value="${escapeHtml(fmt(scenarioMean))}"></td>
          <td><input type="number" min="0" step="0.000001" class="scenario-input" data-scenario-field="range" data-scenario-product="${escapeHtml(product.name)}" data-scenario-station="${escapeHtml(station.name)}" data-scenario-item="${escapeHtml(s.testItem)}" value="${escapeHtml(fmt(scenarioRange))}"></td>
          <td data-scenario-tt-ratio="true">${fmt(scenarioRatio)}</td>
          <td>${fmt(s.min)}</td>
          <td>${escapeHtml(formatSiteTdSource(s.minSite, s.minTd))}</td>
          <td>${fmt(s.max)}</td>
          <td>${escapeHtml(formatSiteTdSource(s.maxSite, s.maxTd))}</td>
        </tr>`;
        if (!(APP.enableAnomalyDetail && canExpand && expanded)) return baseRow;
        return `${baseRow}
        <tr class="detail-row">
          <td></td>
          <td colspan="14" class="detail-cell"><code>${escapeHtml(s.maxDetailLine)}</code></td>
        </tr>`;
      }).join("");
      return `${groupRow}${children}`;
    })
    .join("");
  renderSortHeaderState();
  syncTableCollapsedUI();
  dom.tableSection.classList.remove("hidden");
}

function renderGroupTable() {
  const product = getActiveProduct();
  const station = getActiveStationData();
  if (!product || !station || !dom.groupStatsTbody) {
    dom.tableSection.classList.add("hidden");
    APP.tableCollapsed = true;
    syncTableCollapsedUI();
    return;
  }
  const sorted = sortGroupStats(buildGroupStats(product.name, station.name), APP.groupTableSort.key, APP.groupTableSort.dir);
  const scenarioStationTotal = getGroupScenarioStationTotalTime(product.name, station.name);
  dom.groupStatsTbody.innerHTML = sorted
    .map((s) => {
      const scenarioMean = getGroupScenarioMean(s, product.name, station.name);
      const scenarioRange = getGroupScenarioRange(s, product.name, station.name);
      const scenarioRatio = getGroupScenarioTtRatio(s, product.name, station.name, scenarioStationTotal);
      return `
      <tr data-group-scenario-row="true" data-group-scenario-name="${escapeHtml(s.group)}">
        <td></td>
        <td title="${escapeHtml(s.group)}">${escapeHtml(s.group)}</td>
        <td>${s.count}</td>
        <td>${fmt(s.mean)}</td>
        <td>${fmt(s.median)}</td>
        <td>${fmt(s.range)}</td>
        <td>${fmt(s.ttRatio)}</td>
        <td><input type="number" min="0" step="0.000001" class="scenario-input" data-group-scenario-field="mean" data-group-scenario-product="${escapeHtml(product.name)}" data-group-scenario-station="${escapeHtml(station.name)}" data-group-scenario-name="${escapeHtml(s.group)}" value="${escapeHtml(fmt(scenarioMean))}"></td>
        <td><input type="number" min="0" step="0.000001" class="scenario-input" data-group-scenario-field="range" data-group-scenario-product="${escapeHtml(product.name)}" data-group-scenario-station="${escapeHtml(station.name)}" data-group-scenario-name="${escapeHtml(s.group)}" value="${escapeHtml(fmt(scenarioRange))}"></td>
        <td data-group-scenario-tt-ratio="true">${fmt(scenarioRatio)}</td>
        <td>${fmt(s.min)}</td>
        <td>${escapeHtml(formatSiteTdSource(s.minSite, s.minTd))}</td>
        <td>${fmt(s.max)}</td>
        <td>${escapeHtml(formatSiteTdSource(s.maxSite, s.maxTd))}</td>
      </tr>`;
    })
    .join("");
  renderGroupSortHeaderState();
  syncTableCollapsedUI();
  dom.tableSection.classList.remove("hidden");
}

function renderTable() {
  renderItemTable();
}

function syncScenarioCells() {
  const product = getActiveProduct();
  const station = getActiveStationData();
  if (!product || !station || !dom.statsTbody) return;
  const statMap = new Map(station.stats.map((s) => [s.testItem, s]));
  const ratioBaseTotal = getItemRatioBaseTotal(product.name, station.name);
  const rows = dom.statsTbody.querySelectorAll("tr[data-scenario-row='true']");
  for (const row of rows) {
    const item = row.getAttribute("data-scenario-item");
    if (!item) continue;
    const stat = statMap.get(item);
    if (!stat) continue;
    const ratioCell = row.querySelector("[data-scenario-tt-ratio='true']");
    if (ratioCell) ratioCell.textContent = fmt(getScenarioTtRatio(stat, product.name, station.name, ratioBaseTotal));
  }
  const groupedRows = buildGroupedItemRows(station.stats, product.name, station.name, ratioBaseTotal);
  const groupedMap = new Map(groupedRows.map((row) => [row.group, row]));
  const groupRows = dom.statsTbody.querySelectorAll("tr[data-group-row='true']");
  for (const row of groupRows) {
    const groupName = row.getAttribute("data-group-name");
    if (!groupName) continue;
    const group = groupedMap.get(groupName);
    const ratioCell = row.querySelector("[data-group-scenario-tt-ratio='true']");
    if (ratioCell) ratioCell.textContent = fmt(group?.scenarioTtRatio || 0);
  }
}

function normalizeFilterValue(value) {
  return String(value || "").trim().toLowerCase();
}

function getChartFilteredProductsInStation(stationName = APP.activeStation) {
  let products = getProductsInStation(stationName);
  const productFilters = Array.isArray(APP.chartFilters.product) ? APP.chartFilters.product : [];
  const processFilters = Array.isArray(APP.chartFilters.process) ? APP.chartFilters.process.map(normalizeFilterValue).filter(Boolean) : [];
  const densityFilters = Array.isArray(APP.chartFilters.density) ? APP.chartFilters.density.map(normalizeFilterValue).filter(Boolean) : [];
  const voltageFilters = Array.isArray(APP.chartFilters.voltage) ? APP.chartFilters.voltage.map(normalizeFilterValue).filter(Boolean) : [];
  if (productFilters.length > 0) {
    const productSet = new Set(productFilters);
    products = products.filter((p) => productSet.has(p.name));
  }
  if (processFilters.length > 0) {
    const filterSet = new Set(processFilters);
    products = products.filter((p) => filterSet.has(normalizeFilterValue(p.process)));
  }
  if (densityFilters.length > 0) {
    const filterSet = new Set(densityFilters);
    products = products.filter((p) => filterSet.has(normalizeFilterValue(p.density)));
  }
  if (voltageFilters.length > 0) {
    const filterSet = new Set(voltageFilters);
    products = products.filter((p) => filterSet.has(normalizeFilterValue(p.voltage)));
  }
  return products;
}

function getCheckedChartProductFilters() {
  if (!dom.chartFilterProductMenu) return [];
  return Array.from(dom.chartFilterProductMenu.querySelectorAll("input[data-chart-product-filter]:checked"))
    .map((node) => node.getAttribute("data-chart-product-filter") || "")
    .filter(Boolean);
}

function syncChartProductFilterButton(totalCount = null) {
  if (!dom.chartFilterProductBtn) return;
  const selected = Array.isArray(APP.chartFilters.product) ? APP.chartFilters.product : [];
  const total = totalCount ?? getProductsInStation(APP.activeStation).length;
  if (selected.length === 0 || (total > 0 && selected.length >= total)) {
    dom.chartFilterProductBtn.textContent = "全部產品";
    dom.chartFilterProductBtn.title = "全部產品";
    return;
  }
  if (selected.length === 1) {
    dom.chartFilterProductBtn.textContent = selected[0];
    dom.chartFilterProductBtn.title = selected[0];
    return;
  }
  dom.chartFilterProductBtn.textContent = `${selected.length} 項產品`;
  dom.chartFilterProductBtn.title = selected.join(", ");
}

function closeChartProductFilterMenu() {
  if (!dom.chartFilterProductMenu || !dom.chartFilterProductBtn) return;
  dom.chartFilterProductMenu.classList.add("hidden");
  dom.chartFilterProductBtn.setAttribute("aria-expanded", "false");
}

function getChartFilterDomByKey(key) {
  if (key === "process" && dom.chartFilterProcessBtn && dom.chartFilterProcessMenu) {
    return { button: dom.chartFilterProcessBtn, menu: dom.chartFilterProcessMenu };
  }
  if (key === "density" && dom.chartFilterDensityBtn && dom.chartFilterDensityMenu) {
    return { button: dom.chartFilterDensityBtn, menu: dom.chartFilterDensityMenu };
  }
  if (key === "voltage" && dom.chartFilterVoltageBtn && dom.chartFilterVoltageMenu) {
    return { button: dom.chartFilterVoltageBtn, menu: dom.chartFilterVoltageMenu };
  }
  return null;
}

function closeAllChartMultiFilterMenus() {
  for (const key of ["process", "density", "voltage"]) {
    const targetDom = getChartFilterDomByKey(key);
    if (!targetDom) continue;
    targetDom.menu.classList.add("hidden");
    targetDom.button.setAttribute("aria-expanded", "false");
  }
}

function capitalizeFilterKey(key) {
  return key ? key[0].toUpperCase() + key.slice(1) : "";
}

function getCheckedChartMultiFilters(key) {
  const targetDom = getChartFilterDomByKey(key);
  if (!targetDom) return [];
  return Array.from(targetDom.menu.querySelectorAll("input[data-chart-filter-item]:checked"))
    .map((node) => node.getAttribute("data-chart-filter-item") || "")
    .filter(Boolean);
}

function syncChartMultiFilterButton(key, allLabel, totalCount = null) {
  const targetDom = getChartFilterDomByKey(key);
  if (!targetDom) return;
  const selected = Array.isArray(APP.chartFilters[key]) ? APP.chartFilters[key] : [];
  const total = totalCount ?? 0;
  if (selected.length === 0 || (total > 0 && selected.length >= total)) {
    targetDom.button.textContent = allLabel;
    targetDom.button.title = allLabel;
    return;
  }
  if (selected.length === 1) {
    targetDom.button.textContent = selected[0];
    targetDom.button.title = selected[0];
    return;
  }
  targetDom.button.textContent = `${selected.length} 項`;
  targetDom.button.title = selected.join(", ");
}

function renderChartProductFilterOptions(productsInStation) {
  if (!dom.chartFilterProductMenu) return;
  const options = productsInStation.map((p) => p.name);
  const allowed = new Set(options);
  let selected = (Array.isArray(APP.chartFilters.product) ? APP.chartFilters.product : []).filter((name) => allowed.has(name));
  if (selected.length === 0 && options.length > 0) selected = [...options];
  APP.chartFilters.product = selected;
  dom.chartFilterProductMenu.innerHTML = options
    .map(
      (name) => `
        <label class="chart-multi-item">
          <input type="checkbox" data-chart-product-filter="${escapeHtml(name)}" ${selected.includes(name) ? "checked" : ""}>
          <span>${escapeHtml(name)}</span>
        </label>
      `,
    )
    .join("");
  syncChartProductFilterButton(options.length);
}

function renderChartMultiFilterOptions(key, options, allLabel) {
  const targetDom = getChartFilterDomByKey(key);
  if (!targetDom) return;
  const allowed = new Set(options);
  let selected = (Array.isArray(APP.chartFilters[key]) ? APP.chartFilters[key] : []).filter((name) => allowed.has(name));
  if (selected.length === 0 && options.length > 0) selected = [...options];
  APP.chartFilters[key] = selected;
  targetDom.menu.innerHTML = options
    .map(
      (value) => `
        <label class="chart-multi-item">
          <input type="checkbox" data-chart-filter-item="${escapeHtml(value)}" ${selected.includes(value) ? "checked" : ""}>
          <span>${escapeHtml(value)}</span>
        </label>
      `,
    )
    .join("");
  syncChartMultiFilterButton(key, allLabel, options.length);
}

function renderChartFilterOptions() {
  const productsInStation = getProductsInStation(APP.activeStation);
  renderChartProductFilterOptions(productsInStation);

  const processPairs = Array.from(new Set(productsInStation.map((p) => (p.process || "").trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b));
  renderChartMultiFilterOptions("process", processPairs, "全部 Process");

  const densityPairs = Array.from(new Set(productsInStation.map((p) => (p.density || "").trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b));
  renderChartMultiFilterOptions("density", densityPairs, "全部 Density");

  const voltagePairs = Array.from(new Set(productsInStation.map((p) => (p.voltage || "").trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b));
  renderChartMultiFilterOptions("voltage", voltagePairs, "全部 Voltage");
}

function renderChartSortOptions() {
  if (!dom.chartSortProduct) return;
  const productsInStation = getChartFilteredProductsInStation(APP.activeStation);
  dom.chartSortProduct.innerHTML = productsInStation
    .map((p) => `<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)}</option>`)
    .join("");
  if (!productsInStation.some((p) => p.name === APP.chartSortProduct)) APP.chartSortProduct = APP.activeProduct;
  dom.chartSortProduct.value = APP.chartSortProduct || productsInStation[0]?.name || "";
}

function buildChartLabels(items, labelKey = "testItem") {
  return items.map((s) => {
    const text = String(s?.[labelKey] || "");
    return text.length > 32 ? `${text.slice(0, 32)}...` : text;
  });
}

function getTopByMetric(stats, metricKey, valueResolver = null, labelKey = "testItem") {
  const resolver = typeof valueResolver === "function" ? valueResolver : (s) => s?.[metricKey] ?? 0;
  return stats
    .slice()
    .sort((a, b) => {
      const labelA = String(a?.[labelKey] || "");
      const labelB = String(b?.[labelKey] || "");
      const diff = resolver(b) - resolver(a);
      return diff !== 0 ? diff : labelA.localeCompare(labelB);
    })
    .slice(0, 15);
}

function renderMetricChart(canvasId, metricKey, label, colorFallback) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const productsInStation = getChartFilteredProductsInStation(APP.activeStation);
  if (!productsInStation.length) return null;

  const sortProduct = getProductByName(APP.chartSortProduct) ?? productsInStation[0];
  const sortStation = sortProduct?.stations.get(APP.activeStation);
  const sortScenarioTotal = getScenarioStationTotalTime(sortProduct.name, APP.activeStation);
  const top = getTopByMetric(
    sortStation?.stats ?? [],
    metricKey,
    (stat) => metricValueWithScenario(stat, metricKey, sortProduct.name, APP.activeStation, sortScenarioTotal),
  );
  const labels = buildChartLabels(top);
  const rawItems = top.map((item) => item.testItem);
  const datasets = productsInStation.map((product, idx) => {
    const station = product.stations.get(APP.activeStation);
    const statMap = new Map((station?.stats ?? []).map((s) => [s.testItem, s]));
    const scenarioStationTotal = getScenarioStationTotalTime(product.name, APP.activeStation);
    return {
      label: product.name,
      data: rawItems.map((item) => metricValueWithScenario(statMap.get(item), metricKey, product.name, APP.activeStation, scenarioStationTotal)),
      backgroundColor: PRODUCT_COLORS[idx % PRODUCT_COLORS.length] || colorFallback,
    };
  });

  return new Chart(canvas, {
    type: "bar",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "#cbd5e1" }, title: { display: true, text: label } } },
      scales: {
        x: { ticks: { color: "#94a3b8" }, grid: { color: "#1e293b" } },
        y: { ticks: { color: "#94a3b8" }, grid: { color: "#1e293b" } },
      },
    },
  });
}

function groupMetricValueWithScenario(stat, metric, productName, stationName, scenarioStationTotal = null) {
  if (!stat) return 0;
  if (metric === "count") return stat.count;
  if (metric === "mean") return Number(getGroupScenarioMean(stat, productName, stationName).toFixed(6));
  if (metric === "range") return Number(getGroupScenarioRange(stat, productName, stationName).toFixed(6));
  return Number(getGroupScenarioTtRatio(stat, productName, stationName, scenarioStationTotal).toFixed(6));
}

function renderGroupMetricChart(canvasId, metricKey, label, colorFallback) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const productsInStation = getChartFilteredProductsInStation(APP.activeStation);
  if (!productsInStation.length) return null;

  const sortProduct = getProductByName(APP.chartSortProduct) ?? productsInStation[0];
  const sortStats = buildGroupStats(sortProduct.name, APP.activeStation);
  const sortScenarioTotal = getGroupScenarioStationTotalTime(sortProduct.name, APP.activeStation);
  const top = getTopByMetric(
    sortStats,
    metricKey,
    (stat) => groupMetricValueWithScenario(stat, metricKey, sortProduct.name, APP.activeStation, sortScenarioTotal),
    "group",
  );
  const labels = buildChartLabels(top, "group");
  const rawGroups = top.map((item) => item.group);
  const datasets = productsInStation.map((product, idx) => {
    const groupStats = buildGroupStats(product.name, APP.activeStation);
    const statMap = new Map(groupStats.map((s) => [s.group, s]));
    const scenarioStationTotal = getGroupScenarioStationTotalTime(product.name, APP.activeStation);
    return {
      label: product.name,
      data: rawGroups.map((groupName) => groupMetricValueWithScenario(statMap.get(groupName), metricKey, product.name, APP.activeStation, scenarioStationTotal)),
      backgroundColor: PRODUCT_COLORS[idx % PRODUCT_COLORS.length] || colorFallback,
    };
  });

  return new Chart(canvas, {
    type: "bar",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "#cbd5e1" }, title: { display: true, text: label } } },
      scales: {
        x: { ticks: { color: "#94a3b8" }, grid: { color: "#1e293b" } },
        y: { ticks: { color: "#94a3b8" }, grid: { color: "#1e293b" } },
      },
    },
  });
}

function renderStationReductionChart() {
  const canvas = document.getElementById("tt-reduction-chart");
  if (!canvas) return null;
  const rows = getProducts()
    .filter((product) => {
      const productFilters = Array.isArray(APP.chartFilters.product) ? APP.chartFilters.product : [];
      const processFilters = Array.isArray(APP.chartFilters.process) ? APP.chartFilters.process.map(normalizeFilterValue).filter(Boolean) : [];
      const densityFilters = Array.isArray(APP.chartFilters.density) ? APP.chartFilters.density.map(normalizeFilterValue).filter(Boolean) : [];
      const voltageFilters = Array.isArray(APP.chartFilters.voltage) ? APP.chartFilters.voltage.map(normalizeFilterValue).filter(Boolean) : [];
      if (productFilters.length > 0 && !productFilters.includes(product.name)) return false;
      if (processFilters.length > 0 && !processFilters.includes(normalizeFilterValue(product.process))) return false;
      if (densityFilters.length > 0 && !densityFilters.includes(normalizeFilterValue(product.density))) return false;
      if (voltageFilters.length > 0 && !voltageFilters.includes(normalizeFilterValue(product.voltage))) return false;
      return true;
    })
    .map((product) => {
      let baselineTotal = 0;
      let scenarioTotal = 0;
      for (const station of product.stations.values()) {
        const baseSeconds = station?.stationTotalTime || 0;
        if (baseSeconds <= 0) continue;
        baselineTotal += baseSeconds;
        scenarioTotal += getScenarioStationTotalTime(product.name, station.name);
      }
      if (baselineTotal <= 0) return null;
      const reductionPctRaw = ((baselineTotal - scenarioTotal) / baselineTotal) * 100;
      const reductionPct = Math.max(0, reductionPctRaw);
      return {
        productName: product.name,
        baselineTotal,
        scenarioTotal,
        reductionPct: Number(reductionPct.toFixed(6)),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.productName.localeCompare(b.productName));

  if (!rows.length) return null;

  return new Chart(canvas, {
    type: "bar",
    data: {
      labels: rows.map((row) => row.productName),
      datasets: [{
        label: "所有站點總時間縮減比例 (%)",
        data: rows.map((row) => row.reductionPct),
        backgroundColor: rows.map((_, idx) => PRODUCT_COLORS[idx % PRODUCT_COLORS.length] || "#f97316"),
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: "#cbd5e1" }, title: { display: true, text: "整體測試時間縮減比例 By Product" } },
        tooltip: {
          callbacks: {
            label: (context) => {
              const productName = String(context.label || "");
              const row = rows.find((item) => item.productName === productName);
              if (!row) return "";
              if (row.scenarioTotal > row.baselineTotal) {
                const increasedPct = ((row.scenarioTotal - row.baselineTotal) / row.baselineTotal) * 100;
                return `${productName}：模擬後增加 ${increasedPct.toFixed(2)}%（舊 ${fmt(row.baselineTotal)}s → 新 ${fmt(row.scenarioTotal)}s；圖上依規則顯示 0%）`;
              }
              return `${productName}：降低 ${row.reductionPct.toFixed(2)}%（舊 ${fmt(row.baselineTotal)}s → 新 ${fmt(row.scenarioTotal)}s）`;
            },
          },
        },
      },
      scales: {
        x: { ticks: { color: "#94a3b8" }, grid: { color: "#1e293b" } },
        y: {
          beginAtZero: true,
          ticks: { color: "#94a3b8", callback: (value) => `${value}%` },
          grid: { color: "#1e293b" },
          title: { display: true, text: "降低百分比 (%)", color: "#94a3b8" },
        },
      },
    },
  });
}

function renderGroupStationReductionChart(
  canvasId = "group-tt-reduction-chart",
  titleText = "Scenario vs Baseline（By 產品；全部站點合計）",
  options = {},
) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const requireOverrides = options.requireOverrides === true;
  const rows = getProducts()
    .filter((product) => {
      const productFilters = Array.isArray(APP.chartFilters.product) ? APP.chartFilters.product : [];
      const processFilters = Array.isArray(APP.chartFilters.process) ? APP.chartFilters.process.map(normalizeFilterValue).filter(Boolean) : [];
      const densityFilters = Array.isArray(APP.chartFilters.density) ? APP.chartFilters.density.map(normalizeFilterValue).filter(Boolean) : [];
      const voltageFilters = Array.isArray(APP.chartFilters.voltage) ? APP.chartFilters.voltage.map(normalizeFilterValue).filter(Boolean) : [];
      if (productFilters.length > 0 && !productFilters.includes(product.name)) return false;
      if (processFilters.length > 0 && !processFilters.includes(normalizeFilterValue(product.process))) return false;
      if (densityFilters.length > 0 && !densityFilters.includes(normalizeFilterValue(product.density))) return false;
      if (voltageFilters.length > 0 && !voltageFilters.includes(normalizeFilterValue(product.voltage))) return false;
      return true;
    })
    .map((product) => {
      let baselineTotal = 0;
      let scenarioTotal = 0;
      const hasOverride = hasGroupScenarioOverrideForProduct(product.name);
      for (const station of product.stations.values()) {
        const baseSeconds = station?.stationTotalTime || 0;
        if (baseSeconds <= 0) continue;
        baselineTotal += baseSeconds;
        scenarioTotal += hasOverride ? getGroupScenarioStationTotalTime(product.name, station.name) : baseSeconds;
      }
      if (baselineTotal <= 0) return null;
      const reductionPctRaw = hasOverride ? ((baselineTotal - scenarioTotal) / baselineTotal) * 100 : 0;
      const reductionPct = Math.max(0, reductionPctRaw);
      return {
        productName: product.name,
        baselineTotal,
        scenarioTotal,
        reductionPct: Number(reductionPct.toFixed(6)),
        hasOverride,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.productName.localeCompare(b.productName));
  const displayRows = requireOverrides ? rows.filter((row) => row.hasOverride) : rows;

  if (!displayRows.length) return null;

  return new Chart(canvas, {
    type: "bar",
    data: {
      labels: displayRows.map((row) => row.productName),
      datasets: [{
        label: "所有站點總時間縮減比例 (%)",
        data: displayRows.map((row) => row.reductionPct),
        backgroundColor: displayRows.map((_, idx) => PRODUCT_COLORS[idx % PRODUCT_COLORS.length] || "#f97316"),
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: "#cbd5e1" }, title: { display: true, text: titleText } },
        tooltip: {
          callbacks: {
            label: (context) => {
              const productName = String(context.label || "");
              const row = displayRows.find((item) => item.productName === productName);
              if (!row) return "";
              if (row.scenarioTotal > row.baselineTotal) {
                const increasedPct = ((row.scenarioTotal - row.baselineTotal) / row.baselineTotal) * 100;
                return `${productName}：模擬後增加 ${increasedPct.toFixed(2)}%（舊 ${fmt(row.baselineTotal)}s → 新 ${fmt(row.scenarioTotal)}s；圖上依規則顯示 0%）`;
              }
              return `${productName}：降低 ${row.reductionPct.toFixed(2)}%（舊 ${fmt(row.baselineTotal)}s → 新 ${fmt(row.scenarioTotal)}s）`;
            },
          },
        },
      },
      scales: {
        x: { ticks: { color: "#94a3b8" }, grid: { color: "#1e293b" } },
        y: {
          beginAtZero: true,
          ticks: { color: "#94a3b8", callback: (value) => `${value}%` },
          grid: { color: "#1e293b" },
          title: { display: true, text: "降低百分比 (%)", color: "#94a3b8" },
        },
      },
    },
  });
}

function renderCharts() {
  for (const key of Object.keys(APP.charts)) {
    if (APP.charts[key]) {
      APP.charts[key].destroy();
      APP.charts[key] = null;
    }
  }
  if (!getChartFilteredProductsInStation(APP.activeStation).length) {
    dom.chartSection.classList.add("hidden");
    return;
  }
  syncChartTabUI();
  syncChartCollapsedUI();
  if (APP.chartCollapsed) {
    dom.chartSection.classList.remove("hidden");
    return;
  }
  if (APP.activeChartTab === "group") {
    APP.charts.groupCount = renderGroupMetricChart("group-count-chart", "count", "Group Count", "#3b82f6");
    APP.charts.groupMean = renderGroupMetricChart("group-mean-chart", "mean", "Group Mean (s)", "#10b981");
    APP.charts.groupRange = renderGroupMetricChart("group-range-chart", "range", "Group Range (s)", "#f59e0b");
    APP.charts.groupRatio = renderGroupMetricChart("group-tt-ratio-chart", "ttRatio", "Group TT Ratio/站點 (%)", "#a855f7");
  } else {
    APP.charts.count = renderMetricChart("count-chart", "count", "Count", "#3b82f6");
    APP.charts.mean = renderMetricChart("mean-chart", "mean", "Mean (s)", "#10b981");
    APP.charts.range = renderMetricChart("range-chart", "range", "Range (s)", "#f59e0b");
    APP.charts.ratio = renderMetricChart("tt-ratio-chart", "ttRatio", "TT Ratio/站點 (%)", "#a855f7");
    APP.charts.reduction = renderStationReductionChart();
    APP.charts.ratioByGroup = renderGroupMetricChart("tt-ratio-by-group-chart", "ttRatio", "TT Ratio/站點 (%) by Group", "#a855f7");
  }
  dom.chartSection.classList.remove("hidden");
}

function renderSiteTdChart() {
  const station = getActiveStationData();
  if (!station || !station.siteTdMap || station.siteTdMap.size === 0) {
    if (window.SiteTdHeatmapReact && dom.siteTdHeatmap) window.SiteTdHeatmapReact.clear(dom.siteTdHeatmap);
    dom.siteTdSection.classList.add("hidden");
    return;
  }
  dom.siteTdSection.classList.remove("hidden");
  syncSiteTdCollapsedUI();
  if (APP.siteTdCollapsed) {
    if (window.SiteTdHeatmapReact && dom.siteTdHeatmap) window.SiteTdHeatmapReact.clear(dom.siteTdHeatmap);
    return;
  }
  if (window.SiteTdHeatmapReact && dom.siteTdHeatmap) window.SiteTdHeatmapReact.render(dom.siteTdHeatmap, station.siteTdMap);
}

function exportXlsx() {
  if (!hasAnalyzedData()) {
    showMessage("目前沒有可匯出的分析資料。", "error");
    return;
  }
  if (typeof XLSX === "undefined") {
    showMessage("XLSX 匯出元件尚未載入。", "error");
    return;
  }

  const entries = [];
  for (const product of getProducts()) {
    for (const station of product.stations.values()) {
      if (station.stats.length > 0) entries.push({ product: product.name, station });
    }
  }
  const sourceLabel = APP.sourceMode === "txt" ? "Direct TXT Upload" : "Folder home/*/rawdata";
  const summaryRows = [["Field", ...entries.map((e) => `${e.product}_${e.station.name}`)]];
  const summaryFields = [
    { key: "Product", getValue: (entry) => entry.product },
    { key: "Source", getValue: () => sourceLabel },
    { key: "Root", getValue: (entry) => entry.station.rootFolderName || APP.rootName || "" },
    {
      key: "LOTNO",
      getValue: (entry) => {
        const fromRoot = parseRootMeta(entry.station.rootFolderName || "")?.lotNo;
        const fromParsed = String(entry.station.parsedMeta?.lotNo || "").trim();
        return fromRoot || fromParsed || "-";
      },
    },
    {
      key: "WAFER ID",
      getValue: (entry) => {
        const fromRoot = parseRootMeta(entry.station.rootFolderName || "")?.waferId;
        const fromParsed = String(entry.station.parsedMeta?.waferId || "").trim();
        return fromRoot || fromParsed || "-";
      },
    },
    { key: "Station", getValue: (entry) => entry.station.name },
    { key: "TouchDownCount", getValue: (entry) => String(entry.station.touchDownCount) },
    { key: "StationTotalTime(HH:MM:SS)", getValue: (entry) => formatDuration(entry.station.stationTotalTime) },
    { key: "StationTotalTimeSeconds", getValue: (entry) => fmt(entry.station.stationTotalTime) },
  ];
  for (const field of summaryFields) summaryRows.push([field.key, ...entries.map((entry) => field.getValue(entry))]);

  const wb = XLSX.utils.book_new();
  const usedSheetNames = new Set();
  appendSheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), "Summary", usedSheetNames);

  for (const entry of entries) {
    const itemRows = [[
      "Test Nos",
      "Test Item",
      "Group",
      "Count",
      "Mean(s)",
      "Median(s)",
      "Range(s)",
      "TT Ratio/站點(%)",
      "Min(s)",
      "Min Source(SITE/TD)",
      "Max(s)",
      "Max Source(SITE/TD)",
      "Max Detail RawLine",
      "Unit",
    ]];
    for (const s of entry.station.stats) {
      const baseRatio = getItemBaseTtRatio(s, entry.product, entry.station.name);
      itemRows.push([
        s.testNos.join("|"),
        s.testItem,
        String(s.group || resolveGroupName(entry.station.name, s.testItem)),
        String(s.count),
        fmt(s.mean),
        fmt(s.median),
        fmt(s.range),
        fmt(baseRatio),
        fmt(s.min),
        formatSiteTdSource(s.minSite, s.minTd),
        fmt(s.max),
        formatSiteTdSource(s.maxSite, s.maxTd),
        s.maxDetailLine || "",
        s.unit || "S",
      ]);
    }
    appendSheet(wb, XLSX.utils.aoa_to_sheet(itemRows), `${entry.product}_${entry.station.name}_TestItem_Stats`, usedSheetNames);

    const siteTdRows = [["TouchDown", "Site", "Time(s)", "Time(HH:MM:SS)"]];
    if (entry.station.siteTdMap && entry.station.siteTdMap.size > 0) {
      const siteLabels = Array.from(entry.station.siteTdMap.keys()).sort((a, b) => (a === "Unknown" ? 1 : b === "Unknown" ? -1 : Number(a) - Number(b)));
      const tdSet = new Set();
      for (const tdMap of entry.station.siteTdMap.values()) for (const td of tdMap.keys()) tdSet.add(td);
      const tdLabels = Array.from(tdSet).sort((a, b) => Number(a) - Number(b));
      for (const td of tdLabels) {
        for (const site of siteLabels) {
          const value = (entry.station.siteTdMap.get(site) ?? new Map()).get(td);
          if (value === undefined) continue;
          siteTdRows.push([`TD ${td}`, `SITE ${site}`, fmt(value), formatDuration(value)]);
        }
      }
    }
    appendSheet(wb, XLSX.utils.aoa_to_sheet(siteTdRows), `${entry.product}_${entry.station.name}_Site_TouchDown`, usedSheetNames);
  }

  const dashboardRows = [
    ["Key", "Value"],
    ["DashboardState", JSON.stringify(buildDashboardStateSnapshot())],
  ];
  appendSheet(wb, XLSX.utils.aoa_to_sheet(dashboardRows), "Dashboard_State", usedSheetNames);

  const productNames = getProducts().map((p) => p.name).filter(Boolean);
  const safeName = sanitizeFileName(productNames.join("_") || APP.manualProductName || "rawdata");
  XLSX.writeFile(wb, `${safeName}_test_time_stats.xlsx`);
  showMessage("XLSX 匯出完成。", "success");
}

function appendSheet(workbook, worksheet, desiredName, usedNames) {
  const sheetName = createUniqueSheetName(desiredName, usedNames);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  usedNames.add(sheetName);
}

function createUniqueSheetName(value, usedNames) {
  const maxLen = 31;
  const base = sanitizeSheetName(value).slice(0, maxLen) || "Sheet";
  if (!usedNames.has(base)) return base;
  let idx = 1;
  while (idx < 1000) {
    const suffix = `_${idx}`;
    const candidate = `${base.slice(0, maxLen - suffix.length)}${suffix}`;
    if (!usedNames.has(candidate)) return candidate;
    idx += 1;
  }
  return `Sheet_${Date.now()}`.slice(0, maxLen);
}

function sanitizeFileName(value) {
  return String(value || "")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, "_");
}

function sanitizeSheetName(value) {
  return String(value || "")
    .replace(/[\[\]\*\/?\\:]/g, "_")
    .replace(/[\x00-\x1F]/g, "_")
    .trim();
}

function setProgress(percent) {
  dom.progressBar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
}

function fmt(n) {
  return Number.isFinite(n) ? n.toFixed(2) : "-";
}

function formatDuration(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "-";
  const rounded = Math.round(totalSeconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const seconds = rounded % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function parseRawTxtFilename(filename) {
  const m = filename.match(RAW_TXT_FILENAME_REGEX);
  if (!m) return null;
  return { lotNo: m[1], waferNo: Number.parseInt(m[2], 10), datetimeRaw: m[3], site: Number.parseInt(m[4], 10) };
}

function parseTestTimeLineMeta(line) {
  const m = String(line || "").match(LINE_PREFIX_META_REGEX);
  if (!m) return { systemDut: "", x: "", y: "", td: "" };
  const rawTd = String(m[4] || "").trim();
  const tdNum = Number.parseInt(rawTd, 10);
  return {
    systemDut: String(m[1] || "").trim(),
    x: String(m[2] || "").trim(),
    y: String(m[3] || "").trim(),
    td: Number.isFinite(tdNum) ? String(tdNum) : rawTd,
  };
}

function makeTableExpandKey(stationName, testItem) {
  return `${String(stationName || "").trim()}||${String(testItem || "").trim()}`;
}

function makeGroupExpandKey(stationName, groupName) {
  return `group||${String(stationName || "").trim()}||${String(groupName || "").trim()}`;
}

function extractMaxDetailRawLine(maxRecord) {
  if (!maxRecord || !Array.isArray(maxRecord.lines)) return "";
  const lines = maxRecord.lines;
  const endIndex = Number.isInteger(maxRecord.lineIndex) ? maxRecord.lineIndex : -1;
  if (endIndex < 0 || endIndex >= lines.length) return "";
  const td = String(maxRecord.td || "").trim();
  const testNo = String(maxRecord.testNo || "").trim();
  const testItem = String(maxRecord.testItem || "").trim();
  if (!td || !testNo || !testItem) return "";

  const headerIndex = findTestItemHeaderLine(lines, endIndex, td, testNo, testItem);
  if (headerIndex < 0) return "";
  const detail = findMaxTimingLineBetween(lines, headerIndex + 1, endIndex - 1, td);
  return detail?.rawLine || "";
}

function findTestItemHeaderLine(lines, fromIndex, td, testNo, testItem) {
  const escapedItem = escapeRegExp(testItem);
  const escapedNo = escapeRegExp(testNo);
  const testRefRegex = new RegExp(`\\b${escapedNo}\\s*,\\s*${escapedItem}\\b`);
  for (let i = fromIndex - 1; i >= 0; i -= 1) {
    const line = String(lines[i] || "");
    if (!line.includes("////")) continue;
    const meta = parseTestTimeLineMeta(line);
    if (String(meta.td || "").trim() !== td) continue;
    if (testRefRegex.test(line)) return i;
  }
  return -1;
}

function findMaxTimingLineBetween(lines, startIdx, endIdx, td) {
  const regex = /(?:^|[;,\s])(T|Terase|Tpgm|Twc|Tbusy|Twp)\s*=\s*([+-]?\d*\.?\d+)\s*(ms|s)\b/ig;
  let best = null;
  for (let i = Math.max(0, startIdx); i <= endIdx && i < lines.length; i += 1) {
    const line = String(lines[i] || "");
    if (!line.startsWith("T:")) continue;
    const meta = parseTestTimeLineMeta(line);
    if (String(meta.td || "").trim() !== td) continue;

    let localBestSec = null;
    let m = regex.exec(line);
    while (m) {
      const rawValue = Number.parseFloat(m[2]);
      const unit = String(m[3] || "").toLowerCase();
      if (Number.isFinite(rawValue)) {
        const sec = unit === "ms" ? rawValue / 1000 : rawValue;
        if (localBestSec === null || sec > localBestSec) localBestSec = sec;
      }
      m = regex.exec(line);
    }
    regex.lastIndex = 0;
    if (localBestSec === null) continue;
    if (!best || localBestSec > best.valueSec) {
      best = { valueSec: localBestSec, rawLine: line.trim() };
    }
  }
  return best;
}

function formatSiteTdSource(site, td) {
  const siteLabel = site && site !== "Unknown" ? String(site) : "?";
  const tdLabel = td && td !== "Unknown" ? String(td) : "?";
  return `SITE ${siteLabel} / TD ${tdLabel}`;
}

function parseSourceCell(text) {
  const raw = String(text || "").trim();
  const siteMatch = raw.match(/SITE\s*([^\s/]+)/i);
  const tdMatch = raw.match(/TD\s*([^\s/]+)/i);
  return {
    site: siteMatch ? siteMatch[1] : "Unknown",
    td: tdMatch ? tdMatch[1] : "Unknown",
  };
}

function normalizeTtRatioValue(value, headerName) {
  if (!Number.isFinite(value)) return 0;
  const header = String(headerName || "").toLowerCase();
  const isPercentHeader = header.includes("(%)") || header.includes("%");
  return isPercentHeader ? value : value * 100;
}

function getCellByHeader(row, idxMap, aliases, fallbackIndex) {
  for (const alias of aliases) {
    if (!idxMap.has(alias)) continue;
    const idx = idxMap.get(alias);
    return row[idx];
  }
  return row[fallbackIndex];
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatValueList(values) {
  if (!values || values.length === 0) return "-";
  return values.join(", ");
}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function switchEntryPage(target) {
  const isGuide = target === "guide";
  APP.entryMode = isGuide ? "guide" : "analysis";
  dom.analysisPage?.classList.toggle("hidden", isGuide);
  dom.guidePage?.classList.toggle("hidden", !isGuide);

  if (dom.entryTabAnalysis) {
    const active = !isGuide;
    dom.entryTabAnalysis.classList.toggle("is-active", active);
    dom.entryTabAnalysis.setAttribute("aria-selected", active ? "true" : "false");
  }
  if (dom.entryTabGuide) {
    dom.entryTabGuide.classList.toggle("is-active", isGuide);
    dom.entryTabGuide.setAttribute("aria-selected", isGuide ? "true" : "false");
  }
  applyEntryModeUI();
}

function applyEntryModeUI() {
  syncSourceModeUI();
  renderScopeSelection();
  updateAnalyzeState();
}

function syncSourceModeUI() {
  const selected = getSelectedSourceMode();
  APP.sourceMode = selected;
  const isXlsx = selected === "xlsx";
  if (dom.pickBtn) {
    if (selected === "folder") dom.pickBtn.textContent = "📂 選擇資料夾";
    else if (selected === "txt") dom.pickBtn.textContent = "📄 選擇 TXT 檔案";
    else dom.pickBtn.textContent = "📊 匯入XLSX";
  }
  if (dom.analyzeBtn) dom.analyzeBtn.textContent = isXlsx ? "▶ 載入XLSX分析" : "▶ 開始分析";
  if (dom.anomalyDetailToggle) {
    dom.anomalyDetailToggle.disabled = isXlsx;
    if (isXlsx && dom.anomalyDetailToggle.checked) {
      dom.anomalyDetailToggle.checked = false;
      APP.enableAnomalyDetail = false;
      if (hasAnalyzedData()) renderTable();
    }
  }
  if (dom.rawKeywordAnalysisToggle) {
    dom.rawKeywordAnalysisToggle.disabled = isXlsx;
    if (isXlsx && dom.rawKeywordAnalysisToggle.checked) {
      dom.rawKeywordAnalysisToggle.checked = false;
      APP.enableRawKeywordAnalysis = false;
      APP.rawKeywordResults = [];
      renderRawKeywordResults([]);
    }
  }
  if (dom.sourceRuleText) {
    if (selected === "folder") {
      dom.sourceRuleText.innerHTML = "規則：會讀取符合 <code>產品主目錄/RW_*_LOTNO_WAFERID_站點_YYYYMMDDHHMMSS/home/*/rawdata</code> 的 .TXT，掃描後可在下方勾選產品/站點再分析。";
    } else if (selected === "txt") {
      dom.sourceRuleText.innerHTML = "規則：直接解析你選擇的單一/多個 TXT 文字檔；若無法自動辨識產品欄位，可在下方測試資訊手動補齊。";
    } else {
      dom.sourceRuleText.innerHTML = "規則：請選擇由本工具匯出的 <code>.xlsx</code>，可一次匯入多檔，系統會自動合併為多產品比較分析。此功能不包含關鍵字分析。";
    }
  }
}

function stripAiWakeupSection(markdown) {
  let cleaned = String(markdown || "");
  cleaned = cleaned.replace(/<!--[\s\S]*?AI SESSION CONTEXT[\s\S]*?-->\s*/gi, "");
  cleaned = cleaned.replace(/##\s*🤖\s*AI\s*快速喚醒區[\s\S]*?(?=\n##\s+|$)/gi, "");
  return cleaned.trim();
}

async function initializeGuidePage() {
  if (!dom.guideContent) return;
  const markdown = stripAiWakeupSection(`
# Rawdata 分析工具（使用者說明）

## 系統介紹

本工具用於分析 NOR Flash CP 測試資料，提供：
- 站點與產品維度的統計比較
- 單一統計報表中的 Group 分層展開（Group → Test Item）
- 模擬欄位調整後的即時圖表變化

重點頁面包含：
1. **統計圖表**
2. **統計報表**
3. **Site / Touch Down 熱圖**

---

## 操作方式

1. 匯入資料（資料夾、TXT 或匯入既有 XLSX）。
   - 多產品資料夾建議格式：

\`\`\`text
資料夾根目錄/
├─ AAG106/
│  ├─ RW_*_LOTNO_WAFERID_站點_YYYYMMDDHHMMSS/
│  │  └─ home/*/rawdata/*.TXT
│  └─ ...
├─ EAG119/
│  ├─ RW_*_LOTNO_WAFERID_站點_YYYYMMDDHHMMSS/
│  │  └─ home/*/rawdata/*.TXT
│  └─ ...
└─ FAG102/
   └─ RW_*_LOTNO_WAFERID_站點_YYYYMMDDHHMMSS/
      └─ home/*/rawdata/*.TXT
\`\`\`

2. 選擇要分析的產品與站點後按「開始分析」。
3. 在「統計圖表」可查看：
   - 測試項圖表
   - 群組化圖表
4. 在「統計報表」中先看 Group 彙總列，再按 \`+\` 展開該 Group 的 Test Item 詳細值與模擬欄位。
5. 需要模擬時，在展開後的 Test Item 輸入「模擬 Mean / 模擬 Range」，圖表會同步更新。
6. 需要回到原始值時，按「重置模擬」。

### 步驟三(Option)：關鍵字分析（功能目的）

- 目的 1：快速從大量 RAWDATA 中，鎖定你指定關鍵字的命中內容，減少人工逐行檢查時間。
- 目的 2：把命中結果直接對應到站點、Site、UTL_DUT、BIN，讓異常現象可直接定位到測試脈絡。
- 目的 3：可搭配 BIN 篩選，專注在特定 Bin 的命中事件，提升問題追查效率。
- 目的 4：此功能定位為「分析輔助視窗」，主要用於快速排查與比對，不影響既有統計與模擬流程。

---

---

## 統計報表介紹

### Group 分層顯示
- 第一層：\`Group\` 彙總列（依 Mapping 將 Test Item 併入群組）
- 第二層：展開後顯示 \`Test Item\` 明細與模擬欄位

### Group 統計邏輯
- Group 總測試時間（欄位顯示在 \`Mean(s)\`）：
  - \`Group TT Total(s) = Σ(Mean_i × Count_i)\`
- Group TT Ratio/站點(%)：
  - \`Group TT Ratio(%) = Group TT Total / Σ(Mean_j × Count_j) × 100\`
- 其中 \`i\` 為該 Group 內的 Test Item，\`j\` 為該站點全部 Test Item。

### Test Item 模擬統計邏輯
- \`Scenario Effective Mean = Scenario Mean × (Scenario Range / Base Range)\`（Base Range = 0 時倍率視為 1）
- \`Scenario TT Ratio(%) = Scenario Effective Mean × Count / Σ(Base Mean × Count) × 100\`
- 分母固定為 Baseline 站點總量，因此只會反映被調整項目，不會因分母連動影響其他項。

---

## 重要說明

1. 模擬值只影響畫面計算，不會改動原始資料。
2. 群組化規則已內建於程式靜態檔，不需讀取外部 Mapping 檔。
3. 匯出結果以系統當前支援內容為準；若未看到預期欄位，請先確認目前版本說明。

---

## 常見問題

### Q1：為什麼統計報表的 Group 會出現「未分組」？
A：代表該站點下的 Test Item 沒命中內建對照規則，或名稱不完全一致。

### Q2：為什麼降低百分比圖沒有 bar？
A：通常是尚未在對應報表輸入模擬值，或篩選條件把產品過濾掉。

### Q3：我只改一個產品，為什麼看不到其他產品 bar？
A：目前圖表會保留所有產品。未輸入模擬值的產品會以 \`0%\` 顯示；有輸入模擬值的產品會顯示對應縮減比例。

### Q4：為什麼 Group 列沒有模擬輸入框？
A：Group 僅做彙總，模擬調整在展開後的 Test Item 層操作，Group 會即時反映彙總結果。

### Q5：如何快速恢復原始結果？
A：按「重置模擬」即可。

---

## 版本歷史

| 版本 | 日期 | 說明 |
|---|---|---|
| 1.0 | 2026-05-27 | 初版上線 |
| 1.5 | 2026-05-29 | 新增模擬欄位、降低百分比圖、多產品比較 |
| 1.6 | 2026-05-29 | 新增群組化圖表與群組化報表（雙標籤） |
| 1.7 | 2026-05-29 | 新增群組化報表專用降低百分比圖，並修正僅顯示有模擬變更產品的 bar |
| 1.8 | 2026-05-29 | 統計報表改為 Group 分層展開（Group→Test Item），移除群組化報表模擬圖與報表分頁，補充統計公式 |
| 1.9 | 2026-06-01 | 新增步驟三(Option)關鍵字分析用途說明與操作目的描述 |
`);

  if (window.marked && typeof window.marked.parse === "function") {
    dom.guideContent.innerHTML = window.marked.parse(markdown);
  } else {
    dom.guideContent.textContent = markdown;
  }
  bindZoomableImages(dom.guideContent);
}
