(function() {
  const INTERNAL_API = "http://report/api/DataAPI/getReportData";
  const PROXY_API = "http://localhost:8780/api/DataAPI/getReportData";
  const isSecure = window.location.protocol === 'https:';
  const API_URL = isSecure ? PROXY_API : INTERNAL_API;
  const WIDGET_ID = "2057b9c974b6479b931afa92cd065412";
  const WEC_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyTmFtZSI6IllQTFUiLCJwYXNzd29yZCI6bnVsbCwiZXhwaXJlVGltZSI6IjIwMjUtMDctMTUgMTY6MTE6MzYiLCJkb21haW4iOiIiLCJ1c2VyQ29udGV4dCI6eyJ1c2VyTmFtZSI6IllQTFUiLCJ1c2VyRGVwdCI6IlBQMzIiLCJ1c2VyQ2hpbmVzZU5hbWUiOiLlkYLlhYPoqZUiLCJ1c2VyUGhvbmVObyI6IjczODY4IiwidXNlckVtYWlsIjoiWVBMVUBXSU5CT05ELkNPTSIsImFwcE5hbWUiOiJSZXBvcnQiLCJsb2NhdGlvbiI6MCwic2VjdXJpdHlMZXZlbCI6MiwiaXBBZGRyZXNzIjoiMTAuMy4yMDguMTA1In19.e1ND3hm08CUagIMAML0DThkB6u0gY4GcL6a1JzoiLBc";

  let rawData = null;
  let summaryBase = null;
  let ftSummaryData = null;

  // MSS 資料庫映射記憶
  const mssMapping = {};
  const mssMonitor = {};
  const mssSheets = new Set();

  const excludeList = ['T-00069', 'T-00990', 'T-00991', 'T-00992', 'T-00993', 'T-00994', 'T-00071', 'T-00074'];
  const excludeList2 = ['T-000069', 'T-000990', 'T-000991', 'T-000992', 'T-000993', 'T-000994', 'T-000071', 'T-000074'];

  function initFT() {
    const mssFileInput = document.getElementById('mss-file');
    if (mssFileInput) {
      mssFileInput.addEventListener('change', onMssUpload);
    }
  }

  function switchTabFT() {
    updateUIState();
  }

  function updateUIState() {
    const exportBtn = document.getElementById('export-btn');
    const tableView = document.getElementById('table-view');
    const failsafeView = document.getElementById('failsafe-view');

    if (rawData) {
      tableView.style.display = 'block';
      failsafeView.style.display = 'none';
      exportBtn.disabled = false;
      exportBtn.style.backgroundColor = '#e31a22';
    } else {
      tableView.style.display = 'none';
      failsafeView.style.display = 'flex';
      exportBtn.disabled = true;
      exportBtn.style.backgroundColor = '#71717a';
    }
  }

  async function onFetchData() {
    const lotInput = document.getElementById('lot-input').value.trim();
    if (!lotInput) {
      alert("請輸入 Lot No");
      return;
    }

    setStatus("FETCHING FT DATA...", "#e31a22");
    rawData = null;

    try {
      const lots = lotInput.split(',').map(l => l.trim()).filter(l => l);
      const qi = { "TextLot": lots };
      const url = `${API_URL}?widgetID=${WIDGET_ID}&qi=${encodeURIComponent(JSON.stringify(qi))}`;
      
      const resp = await fetch(url, { headers: { 'wecToken': WEC_TOKEN } });
      if (!resp.ok) throw new Error(`HTTP Error ${resp.status}`);
      
      const data = await resp.json();
      let records = data;
      if (Array.isArray(data) && data.length > 0 && data[0].Value) {
        records = data[0].Value;
      }
      
      if (records && records.length > 0) {
        rawData = records;
        
        const startVal = document.getElementById('start-date').value;
        const endVal = document.getElementById('end-date').value;
        if (startVal && endVal) {
          const start = new Date(startVal + "T00:00:00");
          const end = new Date(endVal + "T23:59:59");
          rawData = rawData.filter(r => {
            const t = new Date(r.START_TIME);
            return t >= start && t <= end;
          });
        }

        if (rawData.length > 0) {
          processFTData(rawData);
          renderTable();
          setStatus("SUCCESS", "#10b981");
        } else {
          setStatus("NO DATA IN DATE RANGE", "#e31a22");
        }
      } else {
        setStatus("NO DATA FOUND", "#e31a22");
      }
    } catch (err) {
      setStatus(`FETCH FAILED: ${err.message}`, "#e31a22");
      alert(isSecure 
        ? '資料獲取失敗。請確認已啟動 proxy.bat 且位於公司內網。' 
        : '資料獲取失敗，請確認內網或 CORS。');
    } finally {
      updateUIState();
    }
  }

  async function onMssUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setStatus("LOADING MSS DATA...", "#e31a22");
    
    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        let totalRecords = 0;

        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          if (json.length === 0) return;

          let monitorColIdx = -1;
          let headerRowIdx = -1;

          for (let r = 0; r < Math.min(json.length, 10); r++) {
            const row = json[r];
            if (!row) continue;
            for (let c = 0; c < row.length; c++) {
              if (row[c] && String(row[c]).trim().toUpperCase() === 'MONITOR') {
                monitorColIdx = c;
                headerRowIdx = r;
                break;
              }
            }
            if (monitorColIdx !== -1) break;
          }

          for (let r = headerRowIdx + 1; r < json.length; r++) {
            const row = json[r];
            if (!row) continue;
            const testNum = row[0];
            const testName = row[1];
            const vcc = row[4];
            const monitorVal = monitorColIdx !== -1 ? row[monitorColIdx] : '';

            if (testNum !== undefined && testNum !== null && !isNaN(parseFloat(testNum))) {
              const num = parseInt(testNum);
              if (num > 0) {
                const code = `T${String(num).padStart(5, '0')}`;
                const name = testName ? String(testName).trim() : '';
                const vccVal = vcc ? String(vcc).trim() : '';
                const isMonitor = monitorVal ? String(monitorVal).trim().toLowerCase() : '0';

                mssMapping[`${sheetName}_${code}`] = `${name}_${vccVal}`;
                mssMonitor[`${sheetName}_${code}`] = isMonitor;
                totalRecords++;
              }
            }
          }
          if (totalRecords > 0) {
            mssSheets.add(sheetName);
          }
        });

        document.getElementById('mss-info').innerText = `已載入 MSS ${totalRecords} 筆對應`;
        setStatus(`MSS LOADED`, "#10b981");
        
        if (rawData) {
          processFTData(rawData);
          renderTable();
        }
      } catch (err) {
        alert(`MSS 上傳解析錯誤: ${err.message}`);
        setStatus(`MSS ERROR`, "#e31a22");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function getMssSheetForStage(stage) {
    if (stage.startsWith('E') && mssSheets.has(stage.substring(1))) {
      return stage.substring(1);
    } else if (mssSheets.has(stage)) {
      return stage;
    }
    return null;
  }

  function processFTData(data) {
    const groups = {};
    data.forEach(r => {
      const prod = r.PRODUCT || "UNKNOWN";
      const lot = r.LOT_ID || "UNKNOWN";
      const stage = r.STAGE || "UNKNOWN";
      const key = `${prod}_${lot}_${stage}`;
      if (!groups[key]) {
        groups[key] = {
          PRODUCT: prod,
          LOT_ID: lot,
          STAGE: stage,
          grossSum: 0, grossCount: 0,
          binSum: 0, binCount: 0,
          yieldSum: 0, yieldCount: 0,
          items: []
        };
      }
      const g = groups[key];
      g.grossSum += parseFloat(r.GROSS) || 0; g.grossCount++;
      g.binSum += parseFloat(r.BIN1) || 0; g.binCount++;
      g.yieldSum += parseFloat(r.FINAL_YIELD) || 0; g.yieldCount++;
      g.items.push(r);
    });

    summaryBase = Object.values(groups).map(g => ({
      PRODUCT: g.PRODUCT,
      LOT_ID: g.LOT_ID,
      STAGE: g.STAGE,
      TOTAL: Math.round(g.grossSum / g.grossCount),
      PASS: Math.round(g.binSum / g.binCount),
      YIELD: g.yieldSum / g.yieldCount
    }));

    ftSummaryData = summaryBase.map(row => {
      const key = `${row.PRODUCT}_${row.LOT_ID}_${row.STAGE}`;
      const items = groups[key].items;

      const filtered = items.filter(r => {
        if (!r.ITEM_NAME) return false;
        const isCat = r.ITEM_NAME.startsWith('CAT-');
        const inExclude = excludeList.includes(r.ITEM_NAME) || excludeList2.includes(r.ITEM_NAME);
        return !isCat && !inExclude;
      });

      const latestMap = {};
      filtered.forEach(r => {
        const name = r.ITEM_NAME;
        if (!name) return;
        if (!latestMap[name] || parseInt(r.TIMES) > parseInt(latestMap[name].TIMES)) {
          latestMap[name] = r;
        } else if (parseInt(r.TIMES) === parseInt(latestMap[name].TIMES)) {
          if (r.START_TIME && latestMap[name].START_TIME && new Date(r.START_TIME) > new Date(latestMap[name].START_TIME)) {
            latestMap[name] = r;
          }
        }
      });

      let latestList = Object.values(latestMap);

      const mssSheet = getMssSheetForStage(row.STAGE);
      if (mssSheet) {
        latestList = latestList.filter(r => {
          if (!r.ITEM_NAME) return false;
          let code = r.ITEM_NAME.replace('-', '');
          if (r.ITEM_NAME.startsWith('T-')) {
            let numPart = r.ITEM_NAME.substring(2);
            if (numPart.length > 5) numPart = numPart.substring(1);
            code = `T${numPart}`;
          }
          const mKey = `${mssSheet}_${code}`;
          return mssMonitor[mKey] !== 'monitor';
        });
      }

      const sorted = latestList
        .map(r => ({
          ITEM_NAME: r.ITEM_NAME,
          PERC: parseFloat(r.ITEM_VALUE) || 0
        }))
        .sort((a, b) => b.PERC - a.PERC)
        .slice(0, 10);

      return {
        PRODUCT: row.PRODUCT,
        LOT_ID: row.LOT_ID,
        STAGE: row.STAGE,
        TOTAL: row.TOTAL,
        PASS: row.PASS,
        YIELD: `${row.YIELD.toFixed(2)}%`,
        topItems: sorted.map(item => {
          if (!item.ITEM_NAME) return { name: "UNKNOWN", value: item.PERC };
          let name = item.ITEM_NAME.replace('-', '');
          if (item.ITEM_NAME.startsWith('T-')) {
            let numPart = item.ITEM_NAME.substring(2);
            if (numPart.length > 5) numPart = numPart.substring(1);
            name = `T${numPart}`;
          }
          if (mssSheet && mssMapping[`${mssSheet}_${name}`]) {
            name = mssMapping[`${mssSheet}_${name}`];
          }
          return { name, value: item.PERC };
        })
      };
    });

    document.getElementById('data-count-msg').innerText = `${data.length} RECORDS | ${ftSummaryData.length} SUMMARY GROUPS`;
  }

  function renderTable() {
    const headerRow = document.getElementById('table-headers');
    const rowsBody = document.getElementById('table-rows');
    headerRow.innerHTML = '';
    rowsBody.innerHTML = '';

    if (!ftSummaryData || ftSummaryData.length === 0) return;

    const baseHeaders = ['PRODUCT', 'LOT_ID', 'STAGE', 'TOTAL', 'PASS', 'YIELD', 'TOP FAILURES (NAME: VALUE)'];
    baseHeaders.forEach(h => {
      const th = document.createElement('th');
      th.innerText = h;
      headerRow.appendChild(th);
    });

    ftSummaryData.forEach(r => {
      const tr = document.createElement('tr');
      ['PRODUCT', 'LOT_ID', 'STAGE', 'TOTAL', 'PASS', 'YIELD'].forEach(h => {
        const td = document.createElement('td');
        td.innerText = r[h];
        tr.appendChild(td);
      });

      const tdFailures = document.createElement('td');
      tdFailures.className = 'font-mono';
      tdFailures.innerHTML = r.topItems.map(item => `<span style="color:#e31a22">${item.name}</span>: ${item.value.toFixed(2)}`).join(' | ');
      tr.appendChild(tdFailures);
      rowsBody.appendChild(tr);
    });
  }

  function onExportExcel() {
    if (!rawData || !ftSummaryData) return;

    setStatus("EXPORTING FT EXCEL...", "#e31a22");

    const wb = XLSX.utils.book_new();
    const wsData = XLSX.utils.json_to_sheet(rawData);
    XLSX.utils.book_append_sheet(wb, wsData, "Data");

    const summaryRows = ftSummaryData.map(r => {
      const rowObj = {
        PRODUCT: r.PRODUCT,
        LOT_ID: r.LOT_ID,
        STAGE: r.STAGE,
        TOTAL: r.TOTAL,
        PASS: r.PASS,
        YIELD: r.YIELD
      };
      r.topItems.forEach(item => {
        rowObj[item.name] = item.value;
      });
      return rowObj;
    });

    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    const fileName = `VSC_FT_Summary_${document.getElementById('lot-input').value.trim().split(',')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);

    setStatus("EXPORT COMPLETED", "#10b981");
  }

  function onProcessFailsafe() {
    const text = document.getElementById('json-paste-area').value.trim();
    if (!text) {
      alert("請先貼上 API JSON 數據");
      return;
    }
    try {
      let parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].Value) {
        parsed = parsed[0].Value;
      } else if (parsed.Value && Array.isArray(parsed.Value)) {
        parsed = parsed.Value;
      }
      
      if (!Array.isArray(parsed)) {
        throw new Error("數據格式錯誤，應為 JSON Array");
      }
      rawData = parsed;
      processFTData(rawData);
      renderTable();
      updateUIState();
      setStatus("FAIL-SAFE LOAD SUCCESS", "#10b981");
    } catch (err) {
      alert(`解析失敗: ${err.message}`);
    }
  }

  function setStatus(msg, color) {
    document.getElementById('status-msg').innerText = msg;
    document.getElementById('status-msg').style.color = color;
  }

  // Expose globally
  window.initFT = initFT;
  window.switchTabFT = switchTabFT;
  window.onFetchFT = onFetchData;
  window.onExportFT = onExportExcel;
  window.onProcessFailsafeFT = onProcessFailsafe;
})();
