importScripts("tgzReader.js", "tgzAnalysisCore.js");

let cancelled = false;

function throwIfCancelled() {
  if (cancelled) throw new DOMException("TGZ 分析已取消。", "AbortError");
}

function serializeStationResult(accumulator, memberNames) {
  const result = TgzAnalysisCore.finalizeStation(accumulator);
  return {
    ...result,
    siteTdMap: Array.from(result.siteTdMap.entries()).map(([site, tdMap]) => [
      site,
      Array.from(tdMap.entries()),
    ]),
    memberNames,
  };
}

async function consumeFile(file, accumulator, memberNames) {
  let currentMember = null;
  let decoder = null;
  let pendingLine = "";
  let lineNumber = 0;
  const context = [];

  const consumeLine = (line) => {
    throwIfCancelled();
    const normalized = line.endsWith("\r") ? line.slice(0, -1) : line;
    if (accumulator.includeDetail) {
      context.push(normalized);
      if (context.length > 512) context.splice(0, context.length - 512);
    }
    TgzAnalysisCore.consumeLine(accumulator, {
      fileName: currentMember.name,
      line: normalized,
      context,
    });
    lineNumber += 1;
    if (lineNumber % 10000 === 0) {
      self.postMessage({ type: "progress", fileName: file.name, memberName: currentMember.name, lineNumber });
    }
  };

  const consumeText = (text) => {
    const source = pendingLine + text;
    const lines = source.split(/\r?\n/);
    pendingLine = lines.pop() ?? "";
    for (const line of lines) {
      consumeLine(line);
    }
  };

  await forEachTgzRawdataTextMemberChunked(file, {
    signal: { get aborted() { return cancelled; } },
    onStart(member) {
      currentMember = member;
      decoder = new TextDecoder();
      pendingLine = "";
      lineNumber = 0;
      context.length = 0;
      memberNames.push(member.name);
      accumulator.fileCount += 1;
      self.postMessage({
        type: "member-start",
        fileName: file.name,
        memberName: member.name,
        memberSize: member.size,
      });
    },
    onChunk(chunk) {
      consumeText(decoder.decode(chunk, { stream: true }));
    },
    onEnd() {
      consumeText(decoder.decode());
      if (pendingLine) {
        const lastLine = pendingLine;
        pendingLine = "";
        consumeLine(lastLine);
      }
      self.postMessage({
        type: "member-complete",
        fileName: file.name,
        memberName: currentMember?.name || "",
      });
      currentMember = null;
    },
  });
}

async function runAnalysis(entries, runOptions = {}) {
  let completedFiles = 0;
  const stationResults = [];

  for (const entry of entries) {
    throwIfCancelled();
    const accumulator = TgzAnalysisCore.createStationAccumulator(1, {
      includeDetail: Boolean(runOptions.includeDetail),
    });
    accumulator.fileCount = 0;
    const memberNames = [];

    for (const file of entry.files) {
      throwIfCancelled();
      self.postMessage({ type: "file-start", fileName: file.name, completedFiles });
      await consumeFile(file, accumulator, memberNames);
      completedFiles += 1;
      self.postMessage({ type: "file-complete", fileName: file.name, completedFiles });
    }

    if (!accumulator.fileCount) throw new Error(`${entry.productName}/${entry.stationName} 找不到 RAWDATA TXT。`);
    stationResults.push({
      productName: entry.productName,
      stationName: entry.stationName,
      result: serializeStationResult(accumulator, memberNames),
    });
  }

  self.postMessage({ type: "complete", stationResults, completedFiles });
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
    await runAnalysis(message.entries || [], message.options || {});
  } catch (error) {
    self.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : String(error),
      name: error?.name || "Error",
    });
  }
};
