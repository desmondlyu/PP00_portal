(function() {
  const stepOptions = [
    "DS00", "DS01", "DS03", "DS04", "DS05", "DS06", "DS07", "DS08",
    "DS09", "DS10", "S1P1", "SPRE", "SFIN"
  ];

  const paramOptions = [
    "01", "02", "03", "04", "05", "06", "07", "09", "0A", "0B", "0C", "0D", "0E", "0F", "0G", "0J", "0K", "0L",
    "0M", "0N", "0O", "0P", "0Q", "0R", "0S", "0T", "0U", "0V", "0W", "0X", "0Y", "0Z",
    "1A", "1B", "1C", "1D", "1E", "1F", "1G", "1H", "1J", "1K", "1L", "1M", "1N", "1O", "1P", "1Q", "1R", "1S", "1T", "1V",
    "1W", "1X", "1Y", "1Z", "2A", "2B", "2C", "2D", "2E", "2F", "2G", "2H", "2L", "2M", "2N", "2O", "2P", "2Q", "2R", "2S",
    "2T", "2U", "2V", "2W", "2X", "2Y", "2Z", "3A", "3B", "3C", "3D", "3E", "3F", "3G", "3H", "3I", "3J", "3K", "3L", "3M",
    "3N", "3O", "3P", "3Q", "3R", "3S", "3T", "3V", "3W", "3X", "3Y", "3Z", "4A", "4B", "4C", "4D", "4E", "4G", "4H", "4I",
    "4J", "4K", "4L", "4M", "4N", "4O", "4P", "4Q", "4R", "4S", "4T", "4U", "4V", "4W", "4X", "4Y", "4Z", "5A", "5B", "5C",
    "5D", "5E", "5F", "5G", "5H", "5I", "5J", "5K", "5L", "5M", "5N", "5O", "5P", "5Q", "5R", "5S", "5T", "5U", "5V", "5W",
    "5X", "5Y", "5Z", "6A", "6B", "6D", "6E", "6F", "6G", "6H", "6I", "6J", "6K", "6M", "8Z", "9A", "9B", "9C", "9D", "9E",
    "9F", "Yield"
  ];

  const INTERNAL_API = "http://report/api/DataAPI/getReportData";
  const PROXY_API = "http://localhost:8780/api/DataAPI/getReportData";
  const isSecure = window.location.protocol === 'https:';
  const API_URL = isSecure ? PROXY_API : INTERNAL_API;
  const WIDGET_ID = "46141686285147519809e1924b6be1ea";
  const WEC_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyTmFtZSI6IllQTFUiLCJwYXNzd29yZCI6bnVsbCwiZXhwaXJlVGltZSI6IjIwMjUtMDgtMjUgMTI6MjQ6NTUiLCJkb21haW4iOiIiLCJ1c2VyQ29udGV4dCI6eyJ1c2VyTmFtZSI6IllQTFUiLCJ1c2VyRGVwdCI6IlBQMzIiLCJ1c2VyQ2hpbmVzZU5hbWUiOiLlkYLlhYPoqZUiLCJ1c2VyUGhvbmVObyI6IjczODY4IiwidXNlckVtYWlsIjoiWVBMVUBXSU5CT05ELkNPTSIsImFwcE5hbWUiOiJSZXBvcnQiLCJsb2NhdGlvbiI6MCwic2VjdXJpdHlMZXZlbCI6MiwiaXBBZGRyZXNzIjoiMTAuMy4yMDguMTA1In19.--R6DrwUgwUe7630XlHXrKQEF3MZ5eycWVSt0Es5rrQ";

  let rawData = null;
  let processedData = null;
  let transposedData = null;

  function initCP() {
    const container = document.getElementById('cp-steps-container');
    container.innerHTML = '';
    stepOptions.forEach(step => {
      const label = document.createElement('label');
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.gap = '6px';
      label.style.textTransform = 'none';
      label.style.color = '#ffffff';
      label.style.fontSize = '12px';
      label.style.fontWeight = 'normal';
      label.style.marginBottom = '0';
      label.innerHTML = `<input type="checkbox" value="${step}" checked class="cp-step-cb"> ${step}`;
      container.appendChild(label);
    });
    
    // 啟動自動測試連線
    testConnection();
  }

  function switchTabCP() {
    updateUIState();
  }

  async function testConnection() {
    try {
      const testQi = {
        "DatePickerStart": "2025-08-01 00:00:00",
        "DatePickerEnd": "2025-08-01 23:59:59",
        "stepId": ["S1P1"],
        "lotId": "TEST000000000",
        "catName": ["01"]
      };
      const url = `${API_URL}?widgetID=${WIDGET_ID}&qi=${encodeURIComponent(JSON.stringify(testQi))}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const resp = await fetch(url, {
        headers: { 'wecToken': WEC_TOKEN },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (resp.status === 200) {
        setConnStatus(true, "Ready (API Connected)");
      } else {
        setConnStatus(false, `API Error ${resp.status}`);
      }
    } catch (err) {
      if (isSecure) {
        setConnStatus(false, "需啟動 proxy.bat");
      } else {
        setConnStatus(false, "CORS / Offline");
      }
    }
  }

  function setConnStatus(ok, text) {
    const dot = document.getElementById('conn-status-dot');
    const label = document.getElementById('conn-status-text');
    if (ok) {
      dot.style.backgroundColor = '#10b981';
      label.style.color = '#10b981';
    } else {
      dot.style.backgroundColor = '#e31a22';
      label.style.color = '#778da9';
    }
    label.innerText = text;
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
      alert("請輸入 Lot ID");
      return;
    }

    const cbs = document.querySelectorAll('.cp-step-cb:checked');
    const selectedSteps = Array.from(cbs).map(cb => cb.value);
    if (selectedSteps.length === 0) {
      alert("請至少選擇一個站點");
      return;
    }

    setStatus("FETCHING CP DATA...", "#e31a22");
    rawData = null;

    try {
      const lots = lotInput.split(',').map(l => l.trim()).filter(l => l);
      let allRecords = [];

      for (const lot of lots) {
        const qi = buildQiParams(lot, selectedSteps);
        
        let data;
        if (paramOptions.length > 25) {
          data = await fetchInBatches(qi);
        } else {
          data = await fetchSingle(qi);
        }
        if (data && data.length > 0) {
          allRecords.push(...data);
        }
      }

      if (allRecords.length > 0) {
        rawData = allRecords;
        processCPData(rawData);
        renderTable();
        setStatus("SUCCESS", "#10b981");
      } else {
        setStatus("NO DATA FOUND", "#e31a22");
      }
    } catch (err) {
      setStatus(`FETCH FAILED: ${err.message}`, "#e31a22");
      alert(isSecure 
        ? '資料獲取失敗。請確認已啟動 proxy.bat 且位於公司內網。' 
        : '資料獲取失敗，請確認是否為 CORS 跨網域限制或未處於內網。');
    } finally {
      updateUIState();
    }
  }

  function buildQiParams(lot, steps) {
    const start = document.getElementById('start-date').value;
    const end = document.getElementById('end-date').value;
    let dateStart, dateEnd;

    if (start && end) {
      dateStart = `${start} 00:00:00`;
      dateEnd = `${end} 23:59:59`;
    } else {
      const today = new Date();
      const past30 = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateStart = past30.toISOString().slice(0,10) + " 00:00:00";
      dateEnd = today.toISOString().slice(0,10) + " 23:59:59";
    }

    return {
      "DatePickerStart": dateStart,
      "DatePickerEnd": dateEnd,
      "stepId": steps,
      "lotId": lot,
      "catName": paramOptions
    };
  }

  async function fetchSingle(qi) {
    const url = `${API_URL}?widgetID=${WIDGET_ID}&qi=${encodeURIComponent(JSON.stringify(qi))}`;
    const resp = await fetch(url, { headers: { 'wecToken': WEC_TOKEN } });
    if (!resp.ok) throw new Error(`HTTP Error ${resp.status}`);
    return await resp.json();
  }

  async function fetchInBatches(qi) {
    const batchSize = 15;
    let allData = [];
    const params = qi.catName;

    for (let i = 0; i < params.length; i += batchSize) {
      const batch = params.slice(i, i + batchSize);
      const batchQi = { ...qi, catName: batch };
      
      const currentBatch = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(params.length / batchSize);
      setStatus(`PROCESSING BATCH ${currentBatch}/${totalBatches}...`, "#e31a22");

      try {
        const batchData = await fetchSingle(batchQi);
        if (Array.isArray(batchData)) {
          allData.push(...batchData);
        }
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        console.warn(`Batch ${currentBatch} failed:`, err);
      }
    }
    return allData;
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
      processCPData(rawData);
      renderTable();
      updateUIState();
      setStatus("FAIL-SAFE LOAD SUCCESS", "#10b981");
    } catch (err) {
      alert(`解析失敗: ${err.message}`);
    }
  }

  function processCPData(data) {
    processedData = data.map(r => ({
      step_id: r.step_id,
      wafer_id: r.wafer_id,
      prod_group: r.prod_group,
      lot_id: r.lot_id,
      program_id: r.program_id,
      param_id: r.param_id,
      value: parseFloat(r.value)
    }));

    const rowsMap = new Map();
    const allParamsSet = new Set();

    processedData.forEach(r => {
      const key = `${r.step_id}_${r.wafer_id}`;
      if (!rowsMap.has(key)) {
        rowsMap.set(key, {
          step_id: r.step_id,
          wafer_id: r.wafer_id,
          prod_group: r.prod_group,
          lot_id: r.lot_id,
          program_id: r.program_id,
          values: {}
        });
      }
      rowsMap.get(key).values[r.param_id] = r.value;
      allParamsSet.add(r.param_id);
    });

    const priority = ['Yield', '01', '02', '03', '04', '05', '07'];
    const available = Array.from(allParamsSet);
    
    const avgMap = {};
    available.forEach(p => {
      if (!priority.includes(p)) {
        const vals = processedData.filter(r => r.param_id === p).map(r => r.value).filter(v => !isNaN(v));
        const sum = vals.reduce((a, b) => a + b, 0);
        avgMap[p] = vals.length > 0 ? (sum / vals.length) : 0;
      }
    });

    const nonPriority = available
      .filter(p => !priority.includes(p))
      .sort((a, b) => (avgMap[b] || 0) - (avgMap[a] || 0));

    const orderedParams = priority.filter(p => available.includes(p)).concat(nonPriority);

    transposedData = {
      params: orderedParams,
      rows: Array.from(rowsMap.values()).map(row => {
        const res = {
          step_id: row.step_id,
          wafer_id: row.wafer_id,
          prod_group: row.prod_group,
          lot_id: row.lot_id,
          program_id: row.program_id
        };
        orderedParams.forEach(p => {
          res[p] = row.values[p] !== undefined ? row.values[p] : '';
        });
        return res;
      })
    };

    document.getElementById('data-count-msg').innerText = `${data.length} RECORDS | ${transposedData.rows.length} TRANSPOSED ROWS`;
  }

  function renderTable() {
    const headerRow = document.getElementById('table-headers');
    const rowsBody = document.getElementById('table-rows');
    headerRow.innerHTML = '';
    rowsBody.innerHTML = '';

    if (!transposedData) return;

    const baseHeaders = ['step_id', 'wafer_id', 'prod_group', 'lot_id', 'program_id'];
    baseHeaders.concat(transposedData.params).forEach(h => {
      const th = document.createElement('th');
      th.innerText = h;
      headerRow.appendChild(th);
    });

    const limit = Math.min(transposedData.rows.length, 50);
    for (let i = 0; i < limit; i++) {
      const r = transposedData.rows[i];
      const tr = document.createElement('tr');
      baseHeaders.forEach(h => {
        const td = document.createElement('td');
        td.innerText = r[h];
        tr.appendChild(td);
      });
      transposedData.params.forEach(p => {
        const td = document.createElement('td');
        td.className = 'font-mono';
        td.innerText = r[p] !== '' ? r[p].toFixed(4) : '';
        tr.appendChild(td);
      });
      rowsBody.appendChild(tr);
    }
  }

  function onExportExcel() {
    if (!rawData || !transposedData) return;

    setStatus("EXPORTING TO EXCEL...", "#e31a22");

    const wb = XLSX.utils.book_new();
    const wsRaw = XLSX.utils.json_to_sheet(rawData);
    XLSX.utils.book_append_sheet(wb, wsRaw, "原始資料");

    const wsTrans = XLSX.utils.json_to_sheet(transposedData.rows);
    XLSX.utils.book_append_sheet(wb, wsTrans, "轉置資料");

    const fileName = `VSC_CP_Summary_${document.getElementById('lot-input').value.trim().split(',')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);

    setStatus("EXPORT COMPLETED", "#10b981");
  }

  function setStatus(msg, color) {
    document.getElementById('status-msg').innerText = msg;
    document.getElementById('status-msg').style.color = color;
  }

  // Expose globally
  window.initCP = initCP;
  window.switchTabCP = switchTabCP;
  window.onFetchCP = onFetchData;
  window.onExportCP = onExportExcel;
  window.onProcessFailsafeCP = onProcessFailsafe;
})();
