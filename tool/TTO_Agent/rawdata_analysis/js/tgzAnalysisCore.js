(function attachTgzAnalysisCore(global) {
  const TEST_TIME_REGEX = /<<<\s*Test Time\s*>>>\s*,\s*(\d+)\s*,\s*([^,]+?)\s*,\s*([+-]?\d*\.?\d+)\s*,\s*\(([^)]+)\)/i;
  const TOTAL_TEST_TIME_REGEX = /:(\d+):Total Test Time\s*=\s*([+-]?\d*\.?\d+)\s*\(S\)/i;
  const RAW_TXT_FILENAME_REGEX = /^([^_]+)_Wafer(\d+)_([0-9]{14})_S(\d+)\.txt$/i;
  const LINE_PREFIX_META_REGEX = /^[^:]+:([^:]+):([^:,]+),([^:]+):([^:]+):/;

  function parseRawTxtFilename(filename) {
    const match = String(filename || "").match(RAW_TXT_FILENAME_REGEX);
    if (!match) return null;
    return {
      lotNo: match[1],
      waferNo: Number.parseInt(match[2], 10),
      datetimeRaw: match[3],
      site: Number.parseInt(match[4], 10),
    };
  }

  function parseTestTimeLineMeta(line) {
    const match = String(line || "").match(LINE_PREFIX_META_REGEX);
    if (!match) return { systemDut: "", x: "", y: "", td: "" };
    const rawTd = String(match[4] || "").trim();
    const tdNum = Number.parseInt(rawTd, 10);
    return {
      systemDut: String(match[1] || "").trim(),
      x: String(match[2] || "").trim(),
      y: String(match[3] || "").trim(),
      td: Number.isFinite(tdNum) ? String(tdNum) : rawTd,
    };
  }

  function findMaxDetailLine(context, td, testNo, testItem) {
    const lines = Array.isArray(context) ? context : [];
    if (!lines.length) return "";
    const escapedItem = String(testItem || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escapedNo = String(testNo || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const testRefRegex = new RegExp(`\\b${escapedNo}\\s*,\\s*${escapedItem}\\b`);
    let headerIndex = -1;
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      if (!String(lines[index] || "").includes("////")) continue;
      const meta = parseTestTimeLineMeta(lines[index]);
      if (String(meta.td || "").trim() !== String(td || "").trim()) continue;
      if (testRefRegex.test(String(lines[index] || ""))) {
        headerIndex = index;
        break;
      }
    }
    if (headerIndex < 0) return "";

    const timingRegex = /(?:^|[;,\s])(T|Terase|Tpgm|Twc|Tbusy|Twp)\s*=\s*([+-]?\d*\.?\d+)\s*(ms|s)\b/ig;
    let best = null;
    for (let index = headerIndex + 1; index < lines.length; index += 1) {
      const line = String(lines[index] || "");
      if (!line.startsWith("T:")) continue;
      const meta = parseTestTimeLineMeta(line);
      if (String(meta.td || "").trim() !== String(td || "").trim()) continue;
      let match = timingRegex.exec(line);
      let localBest = null;
      while (match) {
        const rawValue = Number.parseFloat(match[2]);
        if (Number.isFinite(rawValue)) {
          const seconds = String(match[3]).toLowerCase() === "ms" ? rawValue / 1000 : rawValue;
          if (localBest === null || seconds > localBest) localBest = seconds;
        }
        match = timingRegex.exec(line);
      }
      timingRegex.lastIndex = 0;
      if (localBest !== null && (!best || localBest > best.valueSec)) {
        best = { valueSec: localBest, rawLine: line.trim() };
      }
    }
    return best?.rawLine || "";
  }

  function createStationAccumulator(fileCount = 1, { includeDetail = false } = {}) {
    return {
      fileCount: Math.max(1, Number(fileCount) || 1),
      includeDetail,
      itemMap: new Map(),
      tdMaxMap: new Map(),
      siteTdMap: new Map(),
    };
  }

  function consumeLine(accumulator, { fileName, line, context = [] }) {
    const text = String(line || "");
    const fileMeta = parseRawTxtFilename(fileName);
    const siteKey = fileMeta ? String(fileMeta.site) : "Unknown";

    const tdMatch = text.match(TOTAL_TEST_TIME_REGEX);
    if (tdMatch) {
      const td = String(Number.parseInt(tdMatch[1], 10));
      const tdTime = Number.parseFloat(tdMatch[2]);
      if (Number.isFinite(tdTime)) {
        const currentMax = accumulator.tdMaxMap.get(td);
        if (currentMax === undefined || tdTime > currentMax) accumulator.tdMaxMap.set(td, tdTime);
        const siteEntry = accumulator.siteTdMap.get(siteKey) || new Map();
        const siteCurrentMax = siteEntry.get(td);
        if (siteCurrentMax === undefined || tdTime > siteCurrentMax) siteEntry.set(td, tdTime);
        accumulator.siteTdMap.set(siteKey, siteEntry);
      }
    }

    const match = text.match(TEST_TIME_REGEX);
    if (!match) return;
    const testNo = match[1].trim();
    const testItem = match[2].trim();
    const value = Number.parseFloat(match[3]);
    const unit = match[4].trim();
    if (!Number.isFinite(value)) return;
    const lineMeta = parseTestTimeLineMeta(text);
    const row = accumulator.itemMap.get(testItem) || {
      testNos: new Set(),
      testItem,
      values: [],
      unit,
      minRecord: null,
      maxRecord: null,
      maxValue: null,
      maxDetailLine: "",
    };
    row.testNos.add(testNo);
    row.values.push(value);
    const record = {
      value,
      site: siteKey,
      td: lineMeta.td || "Unknown",
      systemDut: lineMeta.systemDut,
      x: lineMeta.x,
      y: lineMeta.y,
      testNo,
      testItem,
    };
    if (row.minRecord === null || value < row.minRecord.value) row.minRecord = record;
    if (row.maxRecord === null || value > row.maxRecord.value) row.maxRecord = record;
    if (row.maxValue === null || value > row.maxValue) {
      row.maxValue = value;
      row.maxDetailLine = accumulator.includeDetail
        ? findMaxDetailLine(context, lineMeta.td || "Unknown", testNo, testItem)
        : "";
    }
    accumulator.itemMap.set(testItem, row);
  }

  function finalizeStation(accumulator) {
    const stationTotalTime = Array.from(accumulator.tdMaxMap.values()).reduce((sum, value) => sum + value, 0);
    const stats = [];
    for (const payload of accumulator.itemMap.values()) {
      const values = payload.values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
      if (!values.length) continue;
      const count = values.length;
      const sum = values.reduce((total, value) => total + value, 0);
      const mean = sum / count;
      const median = count % 2 === 0
        ? (values[count / 2 - 1] + values[count / 2]) / 2
        : values[Math.floor(count / 2)];
      const min = values[0];
      const max = values[count - 1];
      const minRecord = payload.minRecord;
      const maxRecord = payload.maxRecord;
      stats.push({
        testNos: Array.from(payload.testNos).sort((a, b) => Number(a) - Number(b)),
        testItem: payload.testItem,
        count,
        mean,
        median,
        range: max - min,
        min,
        max,
        ttRatio: stationTotalTime > 0 ? ((count / accumulator.fileCount * mean) / stationTotalTime) * 100 : 0,
        perSiteTotal: count / accumulator.fileCount * mean,
        unit: payload.unit,
        minSite: minRecord?.site || "Unknown",
        minTd: minRecord?.td || "Unknown",
        maxSite: maxRecord?.site || "Unknown",
        maxTd: maxRecord?.td || "Unknown",
        maxDetailLine: payload.maxDetailLine || "",
      });
    }
    return {
      stats: stats.sort((a, b) => (b.mean !== a.mean ? b.mean - a.mean : a.testItem.localeCompare(b.testItem))),
      touchDownCount: accumulator.tdMaxMap.size,
      stationTotalTime,
      siteTdMap: accumulator.siteTdMap,
    };
  }

  const api = { createStationAccumulator, consumeLine, finalizeStation, parseRawTxtFilename, parseTestTimeLineMeta };
  global.TgzAnalysisCore = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window === "undefined" ? globalThis : window);
