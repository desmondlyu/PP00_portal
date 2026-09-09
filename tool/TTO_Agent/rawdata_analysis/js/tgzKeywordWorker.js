importScripts("tgzReader.js");

let cancelled = false;

function throwIfCancelled() {
  if (cancelled) throw new DOMException("關鍵字分析已取消。", "AbortError");
}

function toIntOrEmpty(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const number = Number.parseInt(text, 10);
  return Number.isFinite(number) ? String(number) : "";
}

function makeXyTdKey(x, y, td) {
  const xKey = toIntOrEmpty(x);
  const yKey = toIntOrEmpty(y);
  const tdKey = toIntOrEmpty(td);
  return xKey && yKey && tdKey ? `${xKey},${yKey},${tdKey}` : "";
}

function makeTdDutKey(td, dut) {
  const tdKey = toIntOrEmpty(td);
  const dutKey = toIntOrEmpty(dut);
  return tdKey && dutKey ? `${tdKey},${dutKey}` : "";
}

function normalizeBinToken(value) {
  const text = String(value || "").trim().toUpperCase();
  if (!text) return "";
  const number = text.match(/\d+/)?.[0];
  return number ? `BIN${Number.parseInt(number, 10)}` : text;
}

function parseLineMeta(line) {
  const match = String(line || "").match(/^[^:]+:([^:]+):([^:,]+),([^:]+):([^:]+):/);
  if (!match) return { x: "", y: "", td: "" };
  const td = toIntOrEmpty(match[4]);
  return {
    x: String(match[2] || "").trim(),
    y: String(match[3] || "").trim(),
    td: td || String(match[4] || "").trim(),
  };
}

function parseXyFromRawLine(line) {
  const meta = parseLineMeta(line);
  if (meta.x && meta.y) return meta;
  const fallback = String(line || "").match(/:(-?\d+)\s*,\s*(-?\d+):/);
  return {
    x: fallback?.[1] || "",
    y: fallback?.[2] || "",
    td: meta.td || "",
  };
}

function consumeLine(state, line) {
  throwIfCancelled();
  const text = String(line || "");
  if (/Get_XY_SYSDUT_Info\s+Start/i.test(text)) state.inGetXySection = true;
  if (/Get_XY_SYSDUT_Info\s+End/i.test(text) || /All DUTs BinOut/i.test(text)) {
    state.inGetXySection = false;
  }

  const meta = parseLineMeta(text);
  if (state.inGetXySection && /xloc\s*=/i.test(text) && /yloc\s*=/i.test(text) && /utl_dut\s*=/i.test(text)) {
    const x = text.match(/xloc\s*=\s*(-?\d+)/i)?.[1] || meta.x;
    const y = text.match(/yloc\s*=\s*(-?\d+)/i)?.[1] || meta.y;
    const dut = text.match(/utl_dut\s*=\s*(\d+)/i)?.[1] || "";
    const key = makeXyTdKey(x, y, meta.td);
    if (key && dut) state.xyToDut.set(key, dut);
  }

  const direct = text.match(/DUT\s*0*(\d+).*?BIN\s*0*(\d+)/i);
  const reverse = text.match(/BIN\s*0*(\d+).*?DUT\s*0*(\d+)/i);
  if (direct || reverse) {
    const dut = direct?.[1] || reverse?.[2];
    const bin = direct?.[2] || reverse?.[1];
    const key = makeTdDutKey(meta.td, dut);
    if (key) state.dutToBin.set(key, `BIN${Number.parseInt(bin, 10)}`);
  }

  if (!text.toLowerCase().includes(state.keywordLower)) return;
  const { x, y, td } = parseXyFromRawLine(text);
  state.candidates.push({ rawLine: text.trim(), x, y, td });
}

async function scanFile(
  file,
  keywordLower,
  targetBin,
  stationName,
  results,
  completedFiles,
  totalFiles,
  completedMembers,
  totalMembers,
) {
  let memberName = "";
  let decoder = null;
  let pendingLine = "";
  let state = null;
  let lineNumber = 0;
  let lastReportedLine = 0;

  const emitProgress = () => {
    self.postMessage({
      type: "progress",
      fileName: file.name,
      memberName,
      lineNumber,
      completedFiles,
      totalFiles,
      completedMembers,
      totalMembers,
    });
    lastReportedLine = lineNumber;
  };

  const consumeScannedLine = (line) => {
    consumeLine(state, line);
    lineNumber += 1;
    if (lineNumber % 10000 === 0) emitProgress();
  };

  const consumeText = (text) => {
    const lines = (pendingLine + text).split(/\r?\n/);
    pendingLine = lines.pop() || "";
    for (const line of lines) consumeScannedLine(line);
  };

  await forEachTgzRawdataTextMemberChunked(file, {
    signal: { get aborted() { return cancelled; } },
    onStart(member) {
      memberName = member.name;
      decoder = new TextDecoder();
      pendingLine = "";
      lineNumber = 0;
      lastReportedLine = 0;
      state = {
        inGetXySection: false,
        xyToDut: new Map(),
        dutToBin: new Map(),
        candidates: [],
        keywordLower,
      };
      self.postMessage({
        type: "member-start",
        fileName: file.name,
        memberName,
        completedFiles,
        totalFiles,
        completedMembers,
        totalMembers,
      });
    },
    onChunk(chunk) {
      consumeText(decoder.decode(chunk, { stream: true }));
    },
    onEnd() {
      consumeText(decoder.decode());
      if (pendingLine) {
        consumeScannedLine(pendingLine);
        pendingLine = "";
      }
      if (lineNumber > lastReportedLine) emitProgress();

      const fileMeta = memberName.match(/^([^_]+)_Wafer(\d+)_([0-9]{14})_S(\d+)\.txt$/i);
      const site = Number.isFinite(Number.parseInt(fileMeta?.[4], 10))
        ? String(Number.parseInt(fileMeta[4], 10))
        : "Unknown";
      for (const candidate of state.candidates) {
        const xyTdKey = makeXyTdKey(candidate.x, candidate.y, candidate.td);
        const utlDut = xyTdKey ? (state.xyToDut.get(xyTdKey) || "N/A") : "N/A";
        const tdDutKey = utlDut !== "N/A" ? makeTdDutKey(candidate.td, utlDut) : "";
        const bin = normalizeBinToken(tdDutKey ? (state.dutToBin.get(tdDutKey) || "N/A") : "N/A") || "N/A";
        if (targetBin && bin !== targetBin) continue;
        results.push({
          station: stationName,
          site,
          td: toIntOrEmpty(candidate.td) || "N/A",
          bin,
          utlDut: utlDut === "N/A" ? "N/A" : String(utlDut),
          x: toIntOrEmpty(candidate.x) || "N/A",
          y: toIntOrEmpty(candidate.y) || "N/A",
          rawLine: candidate.rawLine,
        });
      }
      self.postMessage({
        type: "member-complete",
        fileName: file.name,
        memberName,
        completedFiles,
        totalFiles,
        completedMembers: completedMembers + 1,
        totalMembers,
      });
    },
  });
}

self.onmessage = async (event) => {
  const message = event.data || {};
  if (message.type === "cancel") {
    cancelled = true;
    return;
  }
  if (message.type !== "start") return;

  cancelled = false;
  try {
    const results = [];
    const totalFiles = (message.entries || []).reduce((total, entry) => total + entry.files.length, 0);
    const totalMembers = Number(message.totalMembers) || 0;
    let completedFiles = 0;
    let completedMembers = 0;
    for (const entry of message.entries || []) {
      for (const file of entry.files) {
        await scanFile(
          file,
          String(message.keyword || "").toLowerCase(),
          String(message.targetBin || ""),
          entry.stationName,
          results,
          completedFiles,
          totalFiles,
          completedMembers,
          totalMembers,
        );
        completedFiles += 1;
        completedMembers += 1;
        self.postMessage({
          type: "file-complete",
          fileName: file.name,
          completedFiles,
          totalFiles,
          completedMembers,
          totalMembers,
        });
      }
    }
    self.postMessage({ type: "complete", results, completedFiles, totalFiles, completedMembers, totalMembers });
  } catch (error) {
    self.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : String(error),
      name: error?.name || "Error",
    });
  }
};
