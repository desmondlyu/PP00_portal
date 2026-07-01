const $ = (id) => document.getElementById(id);

let pollingTimeoutId = null;
let currentRunId = null;
let lastDocxUrl = null;

// 取得 API 基礎網址
function getApiBase() {
  const configured = window.APP_CONFIG && window.APP_CONFIG.apiBase;
  if (configured) return configured.replace(/\/$/, "");
  if (window.location && window.location.origin && window.location.origin !== "null") {
    return window.location.origin.replace(/\/$/, "");
  }
  return "";
}

// 取得 Mask 版本列表
function getMaskVersions() {
  const rows = [...document.querySelectorAll("#maskTable tbody tr")];
  const result = [];
  for (const tr of rows) {
    const tds = tr.querySelectorAll("td");
    if (tds.length < 3) continue;
    const ver = tds[0].querySelector("input").value.trim();
    const desc = tds[1].querySelector("input").value.trim();
    const isCurrent = tds[2].querySelector("input").checked;
    if (ver || desc) result.push({ ver, desc, isCurrent });
  }
  return result;
}

// 取得批號記錄
function getLots() {
  const rows = [...document.querySelectorAll("#lotTable tbody tr")];
  const result = [];
  for (const tr of rows) {
    const inputs = tr.querySelectorAll("input");
    const row = {
      fab: inputs[0]?.value.trim() || "",
      lotNo: inputs[1]?.value.trim() || "",
      maskVer: inputs[2]?.value.trim() || "",
      route: inputs[3]?.value.trim() || "",
      wat: inputs[4]?.value.trim() || "",
      cp1: inputs[5]?.value.trim() || "",
    };
    if (Object.values(row).some((v) => v)) result.push(row);
  }
  return result;
}

// 新增 Mask 版本欄位列
function addMaskRow() {
  const tbody = document.querySelector("#maskTable tbody");
  if (!tbody) return;
  const row = document.createElement("tr");
  row.innerHTML = `
    <td><input type="text" value="" placeholder="版本號"></td>
    <td><input type="text" value="" placeholder="版本描述"></td>
    <td class="text-center"><input type="radio" name="maskCurrent"></td>
  `;
  tbody.appendChild(row);
}

// 設定狀態文字與指示燈
function setStatus(msg, type = "idle") {
  const statusText = $("statusText");
  const indicator = $("statusIndicator");
  
  if (statusText) statusText.textContent = msg;
  if (indicator) {
    indicator.className = `indicator ${type}`;
  }
}

// Loading Modal 控制
function showLoadingModal(stepText = "初始化中…") {
  const modal = $("loadingModal");
  if (modal) modal.style.display = "flex";
  updateLoadingStep(stepText);
}
function hideLoadingModal() {
  const modal = $("loadingModal");
  if (modal) modal.style.display = "none";
}
function updateLoadingStep(logs) {
  const el = $("loadingStep");
  if (!el) return;
  // 取最後一行 【...】 作為目前步驟
  const match = logs.match(/【[^】]+】[^\n]*/g);
  el.textContent = match ? match[match.length - 1] : logs;
}

// 寫入日誌
function log(msg) {
  const logBox = $("logBox");
  if (!logBox) return;
  const ts = new Date().toLocaleTimeString();
  logBox.textContent += `[${ts}] ${msg}\n`;
  logBox.scrollTop = logBox.scrollHeight;
}

// 觸發後端生成任務
async function triggerGenerate() {
  if (!$("excelFile").files[0]) {
    alert("請選擇 CP Summary Excel (必填)！");
    return;
  }
  if (!$("pdfFile").files[0]) {
    alert("請選擇 Datasheet PDF (必填)！");
    return;
  }

  // 每次重新啟動生成時，將狀態重置
  lastDocxUrl = null;
  setStatus("正在建立產生報告任務...", "running");
  log("發送產生報告請求至後端...");
  
  try {
    const apiBase = getApiBase();
    const fd = new FormData();
    fd.append("productNo", $("productNo").value.trim() || "FAG102B");
    fd.append("productFunc", $("productFunc").value.trim());
    fd.append("manager", $("manager").value.trim());
    fd.append("author", $("author").value.trim());
    fd.append("maskVersions", JSON.stringify(getMaskVersions()));
    fd.append("lots", JSON.stringify(getLots()));
    fd.append("stations", JSON.stringify(["DS00", "S1P1", "DS05", "SFIN", "DS03", "SPRE"]));
    
    if ($("excelFile").files[0]) fd.append("excel", $("excelFile").files[0]);
    if ($("pdfFile").files[0]) fd.append("pdf", $("pdfFile").files[0]);
    if ($("czExcelFile")?.files[0]) fd.append("czExcel", $("czExcelFile").files[0]);
    if ($("coverFile")?.files[0]) fd.append("cover", $("coverFile").files[0]);
    
    const res = await fetch(`${apiBase}/api/reports/generate`, {
      method: "POST",
      body: fd
    });
    
    if (!res.ok) {
      const errDetail = await res.text();
      throw new Error(errDetail || `HTTP 錯誤 ${res.status}`);
    }
    
    const data = await res.json();
    if (data.ok && data.runId) {
      startPolling(data.runId);
    } else {
      throw new Error(data.error || "後端未返回正確的任務 ID");
    }
  } catch (err) {
    hideLoadingModal();
    setStatus(`任務建立失敗: ${err.message}`, "failed");
    log(`錯誤: ${err.message}`);
  }
}

// 開始輪詢後端任務狀態 (使用遞迴 setTimeout 防止 Race Condition)
function startPolling(runId) {
  if (pollingTimeoutId) clearTimeout(pollingTimeoutId);
  currentRunId = runId;
  
  setStatus("處理中，正在執行 Python Pipeline...", "running");
  log(`啟動非同步任務輪詢，Run ID: ${runId}`);
  showLoadingModal("初始化中…");
  
  async function poll() {
    if (currentRunId !== runId) return; // 若任務已改變則終止此輪詢
    
    let shouldContinue = true;
    try {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/api/reports/status/${runId}`);
      if (!res.ok) throw new Error(`HTTP 錯誤 ${res.status}`);
      
      const data = await res.json();
      
      // 即時更新日誌
      const logBox = $("logBox");
      if (logBox && data.logs) {
        logBox.textContent = data.logs;
        logBox.scrollTop = logBox.scrollHeight;
        updateLoadingStep(data.logs);
      }
      
      if (data.status === "completed") {
        shouldContinue = false;
        hideLoadingModal();
        setStatus("報告產生成功！", "completed");
        log("任務執行成功，開始下載 Word 報告...");
        
        lastDocxUrl = data.docxUrl;
        downloadDocx();
      } else if (data.status === "failed") {
        shouldContinue = false;
        hideLoadingModal();
        setStatus(`執行失敗: ${data.error || "未知錯誤"}`, "failed");
        log(`錯誤: ${data.error}`);
      }
    } catch (err) {
      log(`輪詢錯誤: ${err.message}`);
      // 網路瞬斷或暫時性錯誤時，維持輪詢
      shouldContinue = true;
    } finally {
      if (shouldContinue && currentRunId === runId) {
        pollingTimeoutId = setTimeout(poll, 1000);
      } else {
        pollingTimeoutId = null;
      }
    }
  }
  
  // 啟動第一次輪詢
  pollingTimeoutId = setTimeout(poll, 1000);
}

// 渲染 summary 圖表分頁切換介面 (包含防禦性判斷)
function renderPreviewTabs(charts) {
  const container = $("previewContainer");
  if (!container) return;
  
  // 篩選出以 summary_ 開頭的 4 張圖表 (加入防禦性安全欄位檢查)
  const summaryCharts = (charts || []).filter(c => 
    c && c.name && typeof c.name === "string" && c.name.toLowerCase().startsWith("summary_")
  );
  
  if (summaryCharts.length === 0) {
    container.innerHTML = `
      <div class="preview-placeholder">
        <span class="placeholder-icon">📈</span>
        <p>報告生成完成，但未產出 CP Summary 預覽圖表。</p>
      </div>
    `;
    return;
  }
  
  let tabsHtml = `<div class="tabs">`;
  let contentHtml = "";
  
  summaryCharts.forEach((chart, index) => {
    let label = chart.name.replace(/^summary_/, "").replace(/\.png$/i, "");
    if (label === "NHPH") label = "NH/PH Split";
    else if (label === "NLPL") label = "NL/PL Split";
    else if (label === "GCCD") label = "GC CD Split";
    else if (label === "AACD") label = "AA CD Split";
    
    const activeClass = index === 0 ? "active" : "";
    tabsHtml += `<button class="tab ${activeClass}" data-index="${index}">${label}</button>`;
    
    const displayStyle = index === 0 ? "block" : "none";
    contentHtml += `
      <div class="tab-content ${activeClass}" id="tab-content-${index}" style="display: ${displayStyle}">
        <img src="${chart.url}" alt="${label}" />
      </div>
    `;
  });
  
  tabsHtml += `</div>`;
  container.innerHTML = tabsHtml + contentHtml;
  
  // 頁籤點擊事件切換
  const tabButtons = container.querySelectorAll(".tab");
  const tabContents = container.querySelectorAll(".tab-content");
  
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = btn.getAttribute("data-index");
      
      tabButtons.forEach(b => b.classList.remove("active"));
      tabContents.forEach(c => {
        c.classList.remove("active");
        c.style.display = "none";
      });
      
      btn.classList.add("active");
      const targetContent = container.querySelector(`#tab-content-${idx}`);
      if (targetContent) {
        targetContent.classList.add("active");
        targetContent.style.display = "block";
      }
    });
  });
}

// 下載產出的 Word 檔
function downloadDocx() {
  if (!lastDocxUrl) {
    alert("報告尚未生成完成，或目前沒有可用下載。");
    return;
  }
  const apiBase = getApiBase();
  const downloadUrl = `${apiBase}${lastDocxUrl}`;
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = `${$("productNo").value.trim() || "FAG102B"}_工程報告.docx`;
  a.click();
}

const TEMPLATE_FOLDER_PATH = "\\\\wectinfo02\\PP00\\yplu\\Software\\工程實驗報告範本";

async function copyTemplatePath() {
  try {
    await navigator.clipboard.writeText(TEMPLATE_FOLDER_PATH);
    alert("已複製範本路徑，請貼到檔案總管開啟。");
  } catch {
    alert(`請手動複製此路徑：\n${TEMPLATE_FOLDER_PATH}`);
  }
}

// 註冊事件監聽
$("addMaskBtn").addEventListener("click", addMaskRow);

$("exportBtn").addEventListener("click", () => {
  triggerGenerate();
});

$("copyTemplatePathBtn")?.addEventListener("click", copyTemplatePath);

// 初始化狀態
setStatus("已就緒：請匯入 CP Summary / PDF 並配置參數。", "idle");
log("控制台系統已載入。舊版純前端計算與 Canvas 引擎已廢除。");
