# DL → Excel Web-Based App 實作計畫 (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將 Datalog 解析與 Excel 生成功能完全轉移至本機網頁，打造極簡 Swiss 風格轉換入口。

**Architecture:** 採用純前端靜態單頁應用 (SPA) 結構，將 UI 佈局 (CSS/DOM) 與業務邏輯 (JS Parser) 進行物理分離。引入本地 `xlsx` 和 `jszip` 實現離線 Excel 寫入與 ZIP 批次打包。

**Tech Stack:** Vanilla HTML5, Vanilla CSS (Swiss Minimalism + Dark Tech Theme), JavaScript, SheetJS (xlsx.full.min.js), JSZip (jszip.min.js)

---

### Task 1: 建立依賴目錄並下載本地 JS 庫 (100% 離線支援)

**Files:**
- Create: `libs/xlsx.full.min.js`
- Create: `libs/jszip.min.js`

- [ ] **Step 1: 下載 SheetJS 本地庫**
  Run in PowerShell:
  ```powershell
  mkdir -Force libs
  Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js" -OutFile "libs/xlsx.full.min.js"
  ```
  Expected: `libs/xlsx.full.min.js` 下載完成且檔案大小約為 1MB 以上。

- [ ] **Step 2: 下載 JSZip 本地庫**
  Run in PowerShell:
  ```powershell
  Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js" -OutFile "libs/jszip.min.js"
  ```
  Expected: `libs/jszip.min.js` 下載完成且檔案大小約為 90KB 以上。

- [ ] **Step 3: Git Commit**
  Run:
  ```bash
  git add libs/xlsx.full.min.js libs/jszip.min.js
  git commit -m "chore: add offline vendors (SheetJS, JSZip)"
  ```

---

### Task 2: 實作核心解析器與防呆模組 (TDD 模式)

**Files:**
- Create: `test_parser.js`
- Create: `parser.js`

- [ ] **Step 1: 撰寫解析器測試檔 `test_parser.js`**
  將以下程式碼寫入 `test_parser.js`：
  ```javascript
  const { parseSingleFile, checkColumnsMatch } = require('./parser.js');
  const assert = require('assert');

  function testSingleFile() {
    const dummyContent = `Header Line 1\nHeader Line 2\nHeader Line 3\nHeader Line 4\nHeader Line 5\n  COL_A   COL_B   COL_C/COL_D<COL_E>\n  1.2     3       abc\n  4.5     6       def`;
    const result = parseSingleFile(dummyContent, "test.log");
    assert.deepStrictEqual(result.headers, ["COL_A", "COL_B", "COL_C", "COL_D", "COL_E"]);
    assert.strictEqual(result.rows.length, 2);
    assert.strictEqual(typeof result.rows[0]["COL_A"], "number");
    assert.strictEqual(typeof result.rows[0]["COL_B"], "number");
    assert.strictEqual(typeof result.rows[0]["COL_E"], "string");
    assert.strictEqual(result.rows[0]["COL_A"], 1.2);
    assert.strictEqual(result.rows[0]["COL_E"], "abc");
    console.log("✔ testSingleFile passed!");
  }

  function testMismatches() {
    const file1 = { headers: ["A", "B"], fileName: "f1.log" };
    const file2 = { headers: ["A", "B", "C"], fileName: "f2.log" };
    const check = checkColumnsMatch([file1, file2]);
    assert.strictEqual(check.match, false);
    assert.ok(check.details.includes("f2.log"));
    console.log("✔ testMismatches passed!");
  }

  testSingleFile();
  testMismatches();
  ```

- [ ] **Step 2: 執行測試並確認失敗**
  Run: `node test_parser.js`
  Expected: FAIL (提示 `parser.js` 找不到)

- [ ] **Step 3: 實作 `parser.js` 核心邏輯**
  將以下程式碼寫入 `parser.js`：
  ```javascript
  function parseSingleFile(fileContent, fileName = "") {
    const lines = fileContent.split(/\r?\n/);
    const dataLines = lines.slice(5);
    if (dataLines.length < 1) {
      throw new Error("檔案內容不足，無法解析");
    }
    
    const headerLine = dataLines[0];
    const splitPattern = /[ /<>]+/;
    let tokens = headerLine.trim().split(splitPattern);
    if (tokens.length > 0 && tokens[0] === "") {
      tokens.shift();
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
      const line = dataLines[i].trim();
      if (!line) continue;
      let rowTokens = line.split(splitPattern);
      if (rowTokens.length > 0 && rowTokens[0] === "") {
        rowTokens.shift();
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
  ```

- [ ] **Step 4: 再次執行測試確認通過**
  Run: `node test_parser.js`
  Expected: PASS (`✔ testSingleFile passed!` 與 `✔ testMismatches passed!`)

- [ ] **Step 5: Git Commit**
  Run:
  ```bash
  git add parser.js test_parser.js
  git commit -m "feat: implement datalog parser with unit tests"
  ```

---

### Task 3: 實作網頁介面 UI 與 DOM 互動流程

**Files:**
- Create: `index.html`

- [ ] **Step 1: 撰寫 `index.html` 基礎佈局與 CSS 樣式**
  將包含「瑞士極簡設計」+「科技漸層」的 CSS 設計與 HTML 骨架寫入 `index.html`，並正確引入本地庫：
  ```html
  <script src="libs/xlsx.full.min.js"></script>
  <script src="libs/jszip.min.js"></script>
  <script src="parser.js"></script>
  ```

- [ ] **Step 2: 實作 Drag & Drop 檔案上傳與多檔案快取邏輯**
  實作 JS 控制：使用者拖入或選取多個 datalog 檔案時，透過 `FileReader` 進行非同步讀取，調用 `parseSingleFile` 解析，並存在記憶體陣列中。

- [ ] **Step 3: 實作防呆結構比對與 Modal 狀態轉換**
  在 JavaScript 中，如果選擇多檔且「合併模式」，調用 `checkColumnsMatch`。若不匹配，在狀態列顯示紅字警告並不顯示欄位選擇對話框；若匹配，以彈性動畫彈出「欄位選擇器 Modal」，支援全選、搜尋、取消全選。

- [ ] **Step 4: 實作 SheetJS Excel 匯出與 JSZip 打包下載邏輯**
  - **合併模式**：生成 `xlsx` 工作表，欄位 A 填入檔名，其他欄位照選定輸出，最後調用 `XLSX.writeFile`。
  - **分開模式**：對每份檔案各別產生 Excel 工作表，加入 `JSZip` 實體中，最後使用 `jszip.generateAsync` 產生 ZIP blob，觸發下載。

- [ ] **Step 5: 本機測試與整合驗證**
  在瀏覽器開啟 `index.html`，手動拖入 1 個、2 個與不匹配欄位的 datalog 測試檔，確認：
  *   單檔：秒速轉出正確 xlsx。
  *   合併檔：防呆有啟動，合併 xlsx 包含 Source 欄位。
  *   分開檔：自動下載對齊的 zip 檔案。

- [ ] **Step 6: Git Commit**
  Run:
  ```bash
  git add index.html
  git commit -m "feat: complete user interface and export wiring"
  ```
