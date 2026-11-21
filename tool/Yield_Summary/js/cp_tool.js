(function() {
  const stepOptions = [
    "DS00", "DS01", "DS03", "DS04", "DS05", "DS06", "DS07", "DS08",
    "DS09", "DS10", "S1P1", "SPRE", "SFIN"
  ];

  const paramOptions = [
    "01", "02", "03", "04", "05", "06", "07", "08", "09", "0A", "0B", "0C", "0D", "0E", "0F", "0G", "0J", "0K", "0L",
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

  const NON_FAIL_ITEMS = new Set([
    'STEP_ID', 'WAFER_ID', 'PROD_GROUP', 'LOT_ID', 'PROGRAM_ID',
    'YIELD', '01', '02', '03', '04', '05', '06', '07'
  ]);

  let rawData = null;
  let processedData = null;
  let transposedData = null;
  let cpSort = { key: null, direction: 1 };
  let cpSummaryGroupBy = 'step_id';

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

    const selectAllBtn = document.getElementById('cp-steps-select-all');
    const deselectAllBtn = document.getElementById('cp-steps-deselect-all');
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => {
        container.querySelectorAll('.cp-step-cb').forEach(cb => {
          cb.checked = true;
        });
      });
    }
    if (deselectAllBtn) {
      deselectAllBtn.addEventListener('click', () => {
        container.querySelectorAll('.cp-step-cb').forEach(cb => {
          cb.checked = false;
        });
      });
    }

    const byStepBtn = document.getElementById('cp-summary-by-step');
    const byLotBtn = document.getElementById('cp-summary-by-lot');
    if (byStepBtn) {
      byStepBtn.addEventListener('click', () => setSummaryGroupBy('step_id'));
    }
    if (byLotBtn) {
      byLotBtn.addEventListener('click', () => setSummaryGroupBy('lot_id'));
    }
    
    // 啟動自動測試連線，並每 5 秒自動偵測一次
    testConnection();
    setInterval(testConnection, 5000);
  }

  function switchTabCP() {
    updateUIState();
    if (rawData && transposedData) {
      renderTable();
      renderSummaryPanel();
    }
  }

  async function testConnection() {
    let wecToken;
    try {
      wecToken = await window.getWecToken('cp');
    } catch (err) {
      setConnStatus(false, err.message);
      return;
    }
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
        headers: { 'wecToken': wecToken },
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
    const alertBox = document.getElementById('https-proxy-alert');
    if (ok) {
      dot.style.backgroundColor = '#10b981';
      label.style.color = '#10b981';
      if (alertBox) alertBox.style.display = 'none';
    } else {
      dot.style.backgroundColor = '#e31a22';
      label.style.color = '#778da9';
      if (alertBox && isSecure) alertBox.style.display = 'block';
    }
    label.innerText = text;
  }

  function updateUIState() {
    const exportBtn = document.getElementById('export-btn');
    const tableView = document.getElementById('table-view');
    const failsafeView = document.getElementById('failsafe-view');
    const cpSummaryPanel = document.getElementById('cp-summary-panel');

    if (rawData && transposedData) {
      tableView.style.display = 'block';
      failsafeView.style.display = 'none';
      if (cpSummaryPanel) cpSummaryPanel.style.display = 'flex';
      exportBtn.disabled = false;
      exportBtn.style.backgroundColor = '#e31a22';
    } else {
      tableView.style.display = 'none';
      failsafeView.style.display = 'flex';
      if (cpSummaryPanel) cpSummaryPanel.style.display = 'none';
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

    let wecToken;
    try {
      wecToken = await window.getWecToken('cp');
    } catch (err) {
      setStatus(`TOKEN FAILED: ${err.message}`, "#e31a22");
      alert(err.message);
      return;
    }

    setStatus("FETCHING CP DATA...", "#e31a22");
    rawData = null;
    transposedData = null;

    try {
      const lots = lotInput.split(',').map(l => l.trim()).filter(l => l);
      let allRecords = [];

      for (const lot of lots) {
        const qi = buildQiParams(lot, selectedSteps);
        
        let data;
        if (paramOptions.length > 25) {
          data = await fetchInBatches(qi, wecToken);
        } else {
          data = await fetchSingle(qi, wecToken);
        }
        if (data && data.length > 0) {
          allRecords.push(...data);
        }
      }

      if (allRecords.length > 0) {
        rawData = allRecords;
        // reset CP sort state when new data is loaded
        cpSort.key = null; cpSort.direction = 1;
        processCPData(rawData);
        renderTable();
        renderSummaryPanel();
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

  function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function buildQiParams(lot, steps) {
    const start = document.getElementById('start-date').value;
    const end = document.getElementById('end-date').value;
    const endDateStr = end || formatLocalDate(new Date());
    let startDateStr = start;

    if (!startDateStr) {
      const baseEnd = new Date(`${endDateStr}T00:00:00`);
      baseEnd.setDate(baseEnd.getDate() - 30);
      startDateStr = formatLocalDate(baseEnd);
    }

    return {
      "DatePickerStart": `${startDateStr} 00:00:00`,
      "DatePickerEnd": `${endDateStr} 23:59:59`,
      "stepId": steps,
      "lotId": lot,
      "catName": paramOptions
    };
  }

  async function fetchSingle(qi, wecToken) {
    const url = `${API_URL}?widgetID=${WIDGET_ID}&qi=${encodeURIComponent(JSON.stringify(qi))}`;
    const resp = await fetch(url, { headers: { 'wecToken': wecToken } });
    if (!resp.ok) throw new Error(`HTTP Error ${resp.status}`);
    return await resp.json();
  }

  async function fetchInBatches(qi, wecToken) {
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
        const batchData = await fetchSingle(batchQi, wecToken);
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
      // reset CP sort state when manually pasted failsafe data is loaded
      cpSort.key = null; cpSort.direction = 1;
      processCPData(rawData);
      renderTable();
      renderSummaryPanel();
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
      const key = `${r.step_id}_${r.lot_id}_${r.wafer_id}`;
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

    const rows = Array.from(rowsMap.values()).map(row => {
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
    });

    // 預設依 step_id、再依 lot_id（同批依 wafer_id）排序
    rows.sort(compareCPDefaultRows);

    transposedData = {
      params: orderedParams,
      rows
    };

    document.getElementById('data-count-msg').innerText = `${data.length} RECORDS | ${transposedData.rows.length} TRANSPOSED ROWS`;
  }

  // CP sorting helpers
  function cpValueCompare(aVal, bVal, direction) {
    const emptyA = aVal === '' || aVal === null || aVal === undefined;
    const emptyB = bVal === '' || bVal === null || bVal === undefined;
    if (emptyA && emptyB) return 0;
    if (emptyA) return 1; // empty values go to bottom
    if (emptyB) return -1;

    const aNum = Number(aVal);
    const bNum = Number(bVal);
    const aIsNum = !isNaN(aNum) && isFinite(aNum);
    const bIsNum = !isNaN(bNum) && isFinite(bNum);
    if (aIsNum && bIsNum) {
      return (aNum - bNum) * direction;
    }

    const aStr = String(aVal);
    const bStr = String(bVal);
    return aStr.localeCompare(bStr, undefined, { numeric: true, sensitivity: 'base' }) * direction;
  }

  function compareCPDefaultRows(a, b) {
    const stepCmp = cpValueCompare(a.step_id, b.step_id, 1);
    if (stepCmp !== 0) return stepCmp;
    const lotCmp = cpValueCompare(a.lot_id, b.lot_id, 1);
    if (lotCmp !== 0) return lotCmp;
    return cpValueCompare(a.wafer_id, b.wafer_id, 1);
  }

  function isFailItemParam(paramId) {
    if (paramId === null || paramId === undefined) return false;
    const normalized = String(paramId).trim().toUpperCase();
    return normalized !== '' && !NON_FAIL_ITEMS.has(normalized);
  }

  function calcStats(values) {
    if (!values || values.length === 0) return null;
    let sum = 0;
    let min = values[0];
    let max = values[0];
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      sum += v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    return {
      count: values.length,
      avg: sum / values.length,
      max,
      min
    };
  }

  function computeCPSummary(groupBy) {
    if (!transposedData || !transposedData.rows || transposedData.rows.length === 0) {
      return [];
    }

    const groupsMap = new Map();
    transposedData.rows.forEach(row => {
      const rawKey = row[groupBy];
      const groupKey = (rawKey !== undefined && rawKey !== null && String(rawKey).trim() !== '')
        ? String(rawKey).trim()
        : 'UNKNOWN';
      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, []);
      }
      groupsMap.get(groupKey).push(row);
    });

    const yieldParamKey = transposedData.params.find(
      p => String(p).trim().toUpperCase() === 'YIELD'
    );
    const failParamKeys = transposedData.params.filter(isFailItemParam);

    const summaries = Array.from(groupsMap.entries()).map(([groupKey, groupRows]) => {
      const yieldVals = [];
      if (yieldParamKey !== undefined) {
        groupRows.forEach(r => {
          const val = r[yieldParamKey];
          if (typeof val === 'number' && Number.isFinite(val)) {
            yieldVals.push(val);
          }
        });
      }

      const failItems = [];
      failParamKeys.forEach(param => {
        const vals = [];
        groupRows.forEach(r => {
          const val = r[param];
          if (typeof val === 'number' && Number.isFinite(val)) {
            vals.push(val);
          }
        });
        if (vals.length > 0) {
          const stats = calcStats(vals);
          failItems.push({
            param,
            avg: stats.avg,
            max: stats.max,
            min: stats.min
          });
        }
      });

      failItems.sort((a, b) => {
        if (b.avg !== a.avg) return b.avg - a.avg;
        if (b.max !== a.max) return b.max - a.max;
        return cpValueCompare(a.param, b.param, 1);
      });

      return {
        groupKey,
        rowCount: groupRows.length,
        yieldStats: calcStats(yieldVals),
        top5: failItems.slice(0, 5)
      };
    });

    summaries.sort((a, b) => cpValueCompare(a.groupKey, b.groupKey, 1));
    return summaries;
  }

  function setSummaryGroupBy(mode) {
    cpSummaryGroupBy = mode === 'lot_id' ? 'lot_id' : 'step_id';
    const byStepBtn = document.getElementById('cp-summary-by-step');
    const byLotBtn = document.getElementById('cp-summary-by-lot');
    if (byStepBtn) byStepBtn.classList.toggle('active', cpSummaryGroupBy === 'step_id');
    if (byLotBtn) byLotBtn.classList.toggle('active', cpSummaryGroupBy === 'lot_id');
    renderSummaryPanel();
  }

  function createStatCard(badgeText, badgeClass, valClass, stats) {
    const card = document.createElement('div');
    card.className = 'summary-stat-card font-mono';

    const mainLine = document.createElement('div');
    mainLine.className = 'summary-stat-main';

    const badge = document.createElement('span');
    badge.className = badgeClass;
    badge.textContent = badgeText;

    const avgSpan = document.createElement('span');
    avgSpan.className = valClass;
    avgSpan.textContent = `Avg ${stats.avg.toFixed(4)}`;

    mainLine.appendChild(badge);
    mainLine.appendChild(avgSpan);

    const rangeLine = document.createElement('div');
    rangeLine.className = 'summary-stat-range';
    rangeLine.textContent = `Max ${stats.max.toFixed(4)} / Min ${stats.min.toFixed(4)}`;

    card.appendChild(mainLine);
    card.appendChild(rangeLine);
    return card;
  }

  function renderSummaryPanel() {
    const headerRow = document.getElementById('cp-summary-headers');
    const rowsBody = document.getElementById('cp-summary-rows');
    const metaEl = document.getElementById('cp-summary-meta');
    if (!headerRow || !rowsBody) return;

    headerRow.innerHTML = '';
    rowsBody.innerHTML = '';

    if (!transposedData || !transposedData.rows || transposedData.rows.length === 0) {
      if (metaEl) metaEl.textContent = '';
      return;
    }

    const groupLabel = cpSummaryGroupBy === 'lot_id' ? 'LOT_ID' : 'STEP_ID';
    const headers = [groupLabel, 'YIELD (AVG / MAX / MIN)', 'TOP 1 FAIL', 'TOP 2 FAIL', 'TOP 3 FAIL', 'TOP 4 FAIL', 'TOP 5 FAIL'];
    headers.forEach(text => {
      const th = document.createElement('th');
      th.textContent = text;
      headerRow.appendChild(th);
    });

    const summaries = computeCPSummary(cpSummaryGroupBy);
    if (metaEl) {
      const unit = cpSummaryGroupBy === 'lot_id' ? 'LOTS' : 'STEPS';
      metaEl.textContent = `${summaries.length} ${unit} · ${transposedData.rows.length} ROWS (排除 01~07 與 Yield)`;
    }

    summaries.forEach(item => {
      const tr = document.createElement('tr');

      const tdGroup = document.createElement('td');
      const keyDiv = document.createElement('div');
      keyDiv.className = 'summary-group-key font-mono';
      keyDiv.textContent = item.groupKey;
      const countDiv = document.createElement('div');
      countDiv.className = 'summary-group-count';
      countDiv.textContent = `${item.rowCount} rows`;
      tdGroup.appendChild(keyDiv);
      tdGroup.appendChild(countDiv);
      tr.appendChild(tdGroup);

      const tdYield = document.createElement('td');
      if (item.yieldStats) {
        tdYield.appendChild(
          createStatCard('YIELD', 'summary-badge-yield', 'summary-yield-val', item.yieldStats)
        );
      } else {
        const emptySpan = document.createElement('span');
        emptySpan.className = 'summary-empty';
        emptySpan.textContent = '-';
        tdYield.appendChild(emptySpan);
      }
      tr.appendChild(tdYield);

      for (let i = 0; i < 5; i++) {
        const tdFail = document.createElement('td');
        const failItem = item.top5[i];
        if (failItem) {
          tdFail.appendChild(
            createStatCard(failItem.param, 'summary-badge-fail', 'summary-fail-val', failItem)
          );
        } else {
          const emptySpan = document.createElement('span');
          emptySpan.className = 'summary-empty';
          emptySpan.textContent = '-';
          tdFail.appendChild(emptySpan);
        }
        tr.appendChild(tdFail);
      }

      rowsBody.appendChild(tr);
    });
  }

  function createHeaderCell(h) {
    const th = document.createElement('th');
    const btn = document.createElement('button');
    btn.type = 'button';
    const symbol = cpSort.key === h ? (cpSort.direction === 1 ? '↑' : '↓') : '↕';
    btn.innerText = `${h} ${symbol}`;
    const aria = cpSort.key === h ? (cpSort.direction === 1 ? 'sorted ascending' : 'sorted descending') : 'not sorted';
    btn.setAttribute('aria-label', `${h} column, ${aria}`);
    btn.style.background = 'transparent';
    btn.style.border = 'none';
    btn.style.color = 'inherit';
    btn.style.cursor = 'pointer';
    btn.addEventListener('click', function() {
      if (cpSort.key === h) {
        cpSort.direction = -cpSort.direction;
      } else {
        cpSort.key = h;
        cpSort.direction = 1;
      }
      renderTable();
    });
    th.appendChild(btn);
    return th;
  }

  function renderTable() {
    const headerRow = document.getElementById('table-headers');
    const rowsBody = document.getElementById('table-rows');
    headerRow.innerHTML = '';
    rowsBody.innerHTML = '';

    if (!transposedData) return;

    const baseHeaders = ['step_id', 'wafer_id', 'prod_group', 'lot_id', 'program_id'];
    const allHeaders = baseHeaders.concat(transposedData.params);
    allHeaders.forEach(h => {
      headerRow.appendChild(createHeaderCell(h));
    });

    let rowsToRender = transposedData.rows;
    if (cpSort.key) {
      rowsToRender = transposedData.rows.slice().sort((a, b) => {
        const primary = cpValueCompare(a[cpSort.key], b[cpSort.key], cpSort.direction);
        return primary !== 0 ? primary : compareCPDefaultRows(a, b);
      });
    }

    const limit = Math.min(rowsToRender.length, 50);
    for (let i = 0; i < limit; i++) {
      const r = rowsToRender[i];
      const tr = document.createElement('tr');
      baseHeaders.forEach(h => {
        const td = document.createElement('td');
        td.innerText = r[h];
        tr.appendChild(td);
      });
      transposedData.params.forEach(p => {
        const td = document.createElement('td');
        td.className = 'font-mono';
        td.innerText = r[p] !== '' ? (typeof r[p] === 'number' ? r[p].toFixed(4) : r[p]) : '';
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
