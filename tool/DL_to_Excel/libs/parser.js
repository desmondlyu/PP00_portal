function parseSingleFile(fileContent, fileName = "") {
  const lines = fileContent.split(/\r?\n/);
  const dataLines = lines.slice(5);
  if (dataLines.length < 1) {
    throw new Error("檔案內容不足，無法解析");
  }
  
  const headerLine = dataLines[0];
  const splitPattern = /[ /<>]+/;
  let tokens = headerLine.split(splitPattern);
  if (tokens.length > 0 && tokens[0] === "") {
    tokens.shift();
  }
  if (tokens.length > 0 && tokens[tokens.length - 1] === "") {
    tokens.pop();
  }
  
  const seen = {};
  const headers = tokens.map(tok => {
    if (seen[tok] !== undefined) {
      seen[tok]++;
      return `${tok}.${seen[tok]}`;
    } else {
      seen[tok] = 0;
      return tok;
    }
  });
  
  const rows = [];
  for (let i = 1; i < dataLines.length; i++) {
    const line = dataLines[i];
    if (line.trim() === "") continue;
    let rowTokens = line.split(splitPattern);
    if (rowTokens.length > 0 && rowTokens[0] === "") {
      rowTokens.shift();
    }
    if (rowTokens.length > 0 && rowTokens[rowTokens.length - 1] === "") {
      rowTokens.pop();
    }
    const rowObj = {};
    headers.forEach((h, idx) => {
      rowObj[h] = rowTokens[idx] !== undefined ? rowTokens[idx] : "";
    });
    rows.push(rowObj);
  }
  
  headers.forEach(h => {
    let allNumeric = true;
    for (let r = 0; r < rows.length; r++) {
      const val = rows[r][h];
      if (val === "") continue;
      if (isNaN(Number(val))) {
        allNumeric = false;
        break;
      }
    }
    if (allNumeric && rows.length > 0) {
      rows.forEach(r => {
        if (r[h] !== "") {
          r[h] = Number(r[h]);
        }
      });
    }
  });
  
  return { headers, rows, fileName };
}

function checkColumnsMatch(filesData) {
  if (filesData.length <= 1) return { match: true };
  const refHeaders = filesData[0].headers.join(",");
  const mismatches = [];
  for (let i = 1; i < filesData.length; i++) {
    const curHeaders = filesData[i].headers.join(",");
    if (refHeaders !== curHeaders) {
      const refLen = filesData[0].headers.length;
      const curLen = filesData[i].headers.length;
      const added = filesData[i].headers.filter(h => !filesData[0].headers.includes(h));
      const removed = filesData[0].headers.filter(h => !filesData[i].headers.includes(h));
      let diffStr = `欄位數 ${refLen} → ${curLen}`;
      if (removed.length > 0) diffStr += `; 少欄: ${removed.slice(0, 5).join(",")}`;
      if (added.length > 0) diffStr += `; 多欄: ${added.slice(0, 5).join(",")}`;
      mismatches.push(`• ${filesData[i].fileName}：${diffStr}`);
    }
  }
  return {
    match: mismatches.length === 0,
    details: mismatches.join("\n")
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseSingleFile, checkColumnsMatch };
}
