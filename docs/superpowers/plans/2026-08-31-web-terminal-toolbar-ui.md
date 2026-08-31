# Web Terminal 工具列 UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將 Web Terminal 的連線、錄製與回放控制集中到終端機上方兩列工具列，並隱藏三個保留功能的 UI。

**Architecture:** 只修改 `tool/web_terminal/index.html`。既有控制項 id、事件綁定與 JavaScript 保持不變，透過 DOM 重新分組與 CSS class 統一視覺樣式；隱藏控制項使用原生 `hidden` 和 `aria-hidden`。

**Tech Stack:** HTML、CSS、既有原生 JavaScript、PowerShell 靜態檢查。

---

### Task 1: 建立兩列分組工具列樣式

**Files:**
- Modify: `tool/web_terminal/index.html` 的 `<style>` 區塊

- [ ] **Step 1: 新增工具列分組樣式**

在既有 `.control-bar` 後加入下列 CSS，讓工具列可換行、兩列有清楚的組別背景，並統一按鈕與欄位高度：

```css
.control-bar {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  padding: 10px 16px;
}
.toolbar-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.025);
}
.toolbar-group-label {
  min-width: 94px;
  color: #8b949e;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.toolbar-btn,
.toolbar-select,
.toolbar-input {
  min-height: 32px;
  box-sizing: border-box;
}
.toolbar-btn {
  gap: 6px;
  padding: 6px 11px;
  border-radius: 7px;
  font-size: 0.8rem;
  white-space: nowrap;
}
.toolbar-select,
.toolbar-input {
  padding: 6px 9px;
  border: 1px solid var(--border-color);
  border-radius: 7px;
  background: #07090e;
  color: #fff;
  font-family: inherit;
  outline: none;
}
.toolbar-input {
  width: 142px;
}
.toolbar-select:focus,
.toolbar-input:focus {
  border-color: var(--accent-color);
}
@media (max-width: 760px) {
  .toolbar-group-label {
    flex-basis: 100%;
  }
}
```

- [ ] **Step 2: 保留原有特殊狀態樣式**

保留 `btnLog` 的紅色錄製狀態樣式與 `btnClear` 的危險操作樣式；可將既有 inline style 收斂到 `.toolbar-btn` 與既有 `btn-danger`，但不改變錄製狀態或清除行為，也不新增元件或依賴。

- [ ] **Step 3: 檢查 CSS 只影響本頁工具列**

確認新增 selector 只使用 `.control-bar`、`.toolbar-*` 與既有按鈕 class，不修改終端機畫面、比較區或頁首狀態 badge。

### Task 2: 重排既有控制項並隱藏保留功能

**Files:**
- Modify: `tool/web_terminal/index.html` 的 navbar 與 `.control-bar` HTML

- [ ] **Step 1: 將流程控制項移入工具列**

把現有 `btnRecordFlow`、`btnPlayFlow`、`txtPlayCount`、`filePlayback` 從 navbar 移到 `.control-bar` 第二列；保留原 id、`accept=".json"`、`min="1"`、placeholder 與既有 inline focus 行為。

- [ ] **Step 2: 建立連線列**

在 `.control-bar` 第一列保留並整理：

```html
<div class="toolbar-row">
  <span class="toolbar-group-label">🔌 連線</span>
  <button id="btnConnectCH340" class="btn btn-primary toolbar-btn" type="button">🔌 連結 CH340</button>
  <button id="btnBrowseAll" class="btn toolbar-btn" type="button">🖥️ 所有 Port</button>
  <label class="toolbar-group-label" for="baudRateSelect">⚡ BAUD RATE</label>
  <select id="baudRateSelect" class="toolbar-select">
    <option value="115200">115200</option>
    <option value="9600">9600</option>
    <option value="57600">57600</option>
    <option value="921600">921600</option>
  </select>
</div>
```

- [ ] **Step 3: 建立流程列**

在 `.control-bar` 第二列放置 `btnLog`、`btnClear`、`btnRecordFlow`、`btnPlayFlow`、`txtPlayCount`，並使用以下語意：

```html
<div class="toolbar-row">
  <span class="toolbar-group-label">🎥 流程</span>
  <button id="btnLog" class="toolbar-btn" type="button" title="開始或停止 LOG 錄製">⏺ 錄製 LOG</button>
  <button id="btnClear" class="btn btn-danger toolbar-btn" type="button" title="清除即時終端機畫面">🧹 清除螢幕</button>
  <button id="btnRecordFlow" class="toolbar-btn" type="button">🎬 錄製測試流程</button>
  <button id="btnPlayFlow" class="toolbar-btn" type="button">▶️ 回放測試流程</button>
  <label class="toolbar-group-label" for="txtPlayCount">🔁 迴圈次數</label>
  <input type="number" id="txtPlayCount" class="toolbar-input" min="1" placeholder="例如 1">
  <input type="file" id="filePlayback" accept=".json" hidden>
</div>
```

- [ ] **Step 4: 隱藏三個保留控制項**

保留元素與 id，只補上原生隱藏屬性：

```html
<label class="checkbox-label" hidden aria-hidden="true">
  <input type="checkbox" id="chkLocalEcho">
  Local Echo
</label>
<label class="checkbox-label" hidden aria-hidden="true">
  <input type="checkbox" id="chkAutoScroll" checked>
  Auto Scroll
</label>
<button id="btnOfflineMode" class="btn" type="button" hidden aria-hidden="true">🖥️ 啟動離線選單</button>
```

- [ ] **Step 5: 確認頁首只保留品牌與狀態**

保留 logo、`statusBadge` 與既有頁首結構；不要移除 `statusBadge`、字體縮放控制或比較區控制。

### Task 3: 執行靜態檢查並提交 UI 變更

**Files:**
- Test: `tool/web_terminal/index.html`（以 PowerShell 讀取驗證，不建立測試框架）

- [ ] **Step 1: 執行 DOM id 與預設值檢查**

在專案根目錄執行：

```powershell
$p = Get-Content -Raw 'tool\web_terminal\index.html'
$ids = 'btnRecordFlow','btnPlayFlow','txtPlayCount','filePlayback','btnConnectCH340','btnBrowseAll','baudRateSelect','btnLog','btnClear','btnOfflineMode','chkLocalEcho','chkAutoScroll'
foreach ($id in $ids) {
  if (([regex]::Matches($p, "id=`"$id`"")).Count -ne 1) { throw "id count failed: $id" }
}
if ($p -notmatch 'id="chkLocalEcho"[^>]*>') { throw 'Local Echo missing' }
if ($p -match 'id="chkLocalEcho"[^>]*checked') { throw 'Local Echo must be unchecked' }
if ($p -notmatch 'id="chkAutoScroll"[^>]*checked') { throw 'Auto Scroll must be checked' }
if ($p -notmatch 'id="btnOfflineMode"[^>]*hidden') { throw 'Offline menu must be hidden' }
Write-Output 'Web Terminal static checks passed'
```

預期輸出：

```text
Web Terminal static checks passed
```

- [ ] **Step 2: 檢查 Git diff**

```powershell
git --no-pager diff --check
git --no-pager diff -- tool/web_terminal/index.html
```

確認只有 HTML/CSS UI 變更，沒有 JavaScript 行為變更。

- [ ] **Step 3: 提交**

```powershell
git add -- tool/web_terminal/index.html
git commit -m "feat: redesign web terminal toolbar" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

- [ ] **Step 4: 推送目前分支**

```powershell
git push origin main
```

預期 `main` 推送成功，且不包含其他既有未提交檔案。
