# Offline Programmer Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在現有 Web Terminal 加入不連接 Writer 也能操作的 Programmer 離線模擬選單，並保留所有既有即時串口功能。

**Architecture:** 直接修改單檔 `tool\web_terminal\index.html`。以資料驅動的選單樹和小型狀態機處理主／子選單、返回與參數輸入；離線輸出沿用現有 `writeToTerminal()`，輸入事件先分流到離線狀態機，只有即時模式才進入 Web Serial。

**Tech Stack:** 原生 HTML、CSS、JavaScript、Web Serial API、瀏覽器手動 smoke test、Node.js 語法檢查。

---

## 檔案責任與變更範圍

- **Modify:** `C:\D_BACKUP\AI_Project\web_app\PP00_Portal\tool\web_terminal\index.html`
  - 控制列：新增離線模擬 checkbox 與狀態文字。
  - JavaScript：新增選單資料、離線狀態、渲染、輸入分流與模式切換。
  - 既有 Web Serial、錄製／回放、LOG、凍結比對與字體控制維持原流程。
- **Reference only:** `C:\D_BACKUP\AI_Project\web_app\PP00_Portal\function_tree.md`
  - 只收錄具明確說明的主／子選單文字與按鍵。
- **Reference only:** `C:\D_BACKUP\AI_Project\web_app\PP00_Portal\LP_ICIDCheck.c`
  - 用於確認 `mh_spi_menu`、返回與參數提示的操作語意；不可把硬體執行邏輯搬進瀏覽器。
- **No new runtime files or dependencies.**

### Task 1: 建立可驗證的離線選單資料模型

**Files:**
- Modify: `C:\D_BACKUP\AI_Project\web_app\PP00_Portal\tool\web_terminal\index.html`（JavaScript 狀態宣告區，約在 `let port = null` 附近）
- Reference: `C:\D_BACKUP\AI_Project\web_app\PP00_Portal\function_tree.md`
- Test: Node.js `vm` syntax check against the extracted module script

- [ ] **Step 1: 擷取現有 module script 並建立失敗前的語法檢查命令**

Run from `C:\D_BACKUP\AI_Project\web_app\PP00_Portal`:

```powershell
node -e "const fs=require('fs');const s=fs.readFileSync('tool\\web_terminal\\index.html','utf8');const m=s.match(/<script type=\"module\">([\s\S]*?)<\/script>/);if(!m)throw new Error('module script not found');new Function(m[1]);console.log('module syntax OK')"
```

Expected: `module syntax OK`.

- [ ] **Step 2: 新增選單節點的最小資料結構**

在既有狀態宣告附近加入以下結構；實作時將 `children` 內容依 `function_tree.md` 完整填入，只保留有明確說明的項目：

```js
const offlineMenu = {
  key: 'mh_spi_menu',
  title: 'WRITER Function',
  children: {
    '0': { key: '0', label: 'Read SPI ID' },
    '1': {
      key: '1',
      label: 'Scan Vt',
      children: {
        '1': { key: '1', label: 'Fast VT-scan to find abnormal block' },
        '2': { key: '2', label: 'Fast VT-scan to find abnormal address' },
        '4': { key: '4', label: 'whole chip VT (up to 128Mbit)' }
      }
    }
  }
};

let offlineMode = false;
let offlineMenuStack = [];
let offlineCurrentMenu = offlineMenu;
let offlineInput = '';
let offlineInputPrompt = null;
```

Each leaf must either omit `inputPrompt` for a no-parameter simulation or provide a concrete prompt string taken from the source menu flow. Do not invent hardware output fields.

- [ ] **Step 3: Add pure menu helper functions**

Add helpers with these exact contracts:

```js
function getOfflineMenuItems(menu) {
  return Object.values(menu.children ?? {});
}

function isOfflineLeaf(item) {
  return !item.children || Object.keys(item.children).length === 0;
}

function formatOfflineMenu(menu) {
  const lines = [`\n[OFFLINE] ${menu.title ?? menu.key}`];
  for (const item of getOfflineMenuItems(menu)) {
    lines.push(`(${item.key}) ${item.label}`);
  }
  lines.push('(q) 返回上一層');
  lines.push('> ');
  return lines.join('\n');
}
```

The helper must preserve keys such as `a`, `b`, `c`, `g`, `h`, `j`, `l`, `p`, `q`, `s`, `t`, `v`, `x`, and `z` as strings; do not coerce menu keys to decimal numbers.

- [ ] **Step 4: Re-run the syntax check**

Run the command from Step 1.

Expected: `module syntax OK`.

- [ ] **Step 5: Commit the data-model change**

```powershell
git add -- tool/web_terminal/index.html
git commit -m "feat: add offline programmer menu data"
```

### Task 2: Add offline mode controls and rendering

**Files:**
- Modify: `C:\D_BACKUP\AI_Project\web_app\PP00_Portal\tool\web_terminal\index.html`（control bar markup、status CSS 與 module script）

- [ ] **Step 1: Add the mode control beside the existing serial controls**

Add an accessible checkbox and status element in the control bar:

```html
<label class="checkbox-label">
  <input type="checkbox" id="chkOfflineMode">
  離線模擬
</label>
<span id="offlineModeStatus" style="color:#8b949e;">未啟用</span>
```

Do not disable the existing serial controls merely because the browser has no Web Serial support; preserve the current compatibility message and use the offline checkbox independently.

- [ ] **Step 2: Cache the new elements**

Add:

```js
const chkOfflineMode = document.getElementById('chkOfflineMode');
const offlineModeStatus = document.getElementById('offlineModeStatus');
```

- [ ] **Step 3: Implement mode status and initial menu rendering**

Add:

```js
function updateOfflineModeStatus() {
  offlineModeStatus.textContent = offlineMode ? 'OFFLINE：不執行硬體' : '未啟用';
  offlineModeStatus.style.color = offlineMode ? '#55e6a5' : '#8b949e';
}

function renderOfflineMenu() {
  writeToTerminal(formatOfflineMenu(offlineCurrentMenu));
}

function resetOfflineMenu() {
  offlineMenuStack = [];
  offlineCurrentMenu = offlineMenu;
  offlineInput = '';
  offlineInputPrompt = null;
}
```

- [ ] **Step 4: Wire checkbox transitions**

Use this transition behavior:

```js
chkOfflineMode.addEventListener('change', () => {
  offlineMode = chkOfflineMode.checked;
  resetOfflineMenu();
  updateOfflineModeStatus();
  if (offlineMode) {
    writeToTerminal('\n[OFFLINE] 已啟用離線模擬；不會連接或寫入 Writer。\n');
    renderOfflineMenu();
  } else {
    writeToTerminal('\n[OFFLINE] 已關閉，恢復即時終端機輸入。\n');
  }
});

updateOfflineModeStatus();
```

Do not call `connectPort()` from this handler and do not modify `port`, `reader`, `reconnectEnabled`, or `knownPort`.

- [ ] **Step 5: Run syntax validation**

Run the Node.js command from Task 1.

Expected: `module syntax OK`.

- [ ] **Step 6: Commit the control and rendering change**

```powershell
git add -- tool/web_terminal/index.html
git commit -m "feat: add offline mode control"
```

### Task 3: Implement keyboard navigation and safe simulation output

**Files:**
- Modify: `C:\D_BACKUP\AI_Project\web_app\PP00_Portal\tool\web_terminal\index.html`（既有 `terminalScreen` keydown listener 與離線 helpers）
- Reference: `C:\D_BACKUP\AI_Project\web_app\PP00_Portal\LP_ICIDCheck.c`

- [ ] **Step 1: Add explicit offline input handler**

Implement these functions:

```js
function normalizeOfflineKey(value) {
  return value.length === 1 ? value.toLowerCase() : value;
}

function showOfflineSimulation(item, parameter = '') {
  const detail = parameter ? `；參數：${parameter}` : '';
  writeToTerminal(
    `\n[OFFLINE] 已選取 (${item.key}) ${item.label}${detail}\n` +
    '[OFFLINE] 僅模擬選單與輸入，未執行任何硬體命令。\n'
  );
  renderOfflineMenu();
}

function handleOfflineKey(event) {
  if (event.key === 'Escape' || event.key.toLowerCase() === 'q') {
    event.preventDefault();
    if (offlineInputPrompt !== null) {
      offlineInput = '';
      offlineInputPrompt = null;
      writeToTerminal('\n[OFFLINE] 已取消參數輸入。\n');
      renderOfflineMenu();
      return true;
    }
    if (offlineMenuStack.length > 0) {
      offlineCurrentMenu = offlineMenuStack.pop();
      renderOfflineMenu();
    } else {
      writeToTerminal('\n[OFFLINE] 已返回 mh_spi_menu。\n');
      renderOfflineMenu();
    }
    return true;
  }

  if (offlineInputPrompt !== null) {
    if (event.key === 'Backspace') {
      event.preventDefault();
      offlineInput = offlineInput.slice(0, -1);
      return true;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const parameter = offlineInput.trim();
      if (!parameter) {
        writeToTerminal('\n[OFFLINE 錯誤] 參數不可為空。\n');
        return true;
      }
      const item = offlineCurrentMenu.children[offlineInputPrompt];
      offlineInput = '';
      offlineInputPrompt = null;
      showOfflineSimulation(item, parameter);
      return true;
    }
    if (event.key.length === 1) {
      event.preventDefault();
      offlineInput += event.key;
      writeToTerminal(event.key);
      return true;
    }
    return true;
  }

  if (event.key.length !== 1) return false;
  const key = normalizeOfflineKey(event.key);
  const item = offlineCurrentMenu.children?.[key];
  if (!item) {
    event.preventDefault();
    writeToTerminal(`\n[OFFLINE 錯誤] 無效選項：${event.key}\n`);
    renderOfflineMenu();
    return true;
  }

  event.preventDefault();
  if (item.children && Object.keys(item.children).length > 0) {
    offlineMenuStack.push(offlineCurrentMenu);
    offlineCurrentMenu = item;
    renderOfflineMenu();
  } else if (item.inputPrompt) {
    offlineInputPrompt = item.key;
    writeToTerminal(`\n[OFFLINE] ${item.inputPrompt}\n> `);
  } else {
    showOfflineSimulation(item);
  }
  return true;
}
```

The actual implementation must use the exact menu node from `offlineCurrentMenu.children[offlineInputPrompt]` and must not fabricate a return value.

- [ ] **Step 2: Put the offline branch first in the existing keydown listener**

At the start of the existing `terminalScreen.addEventListener('keydown', async (event) => { ... })` callback, add:

```js
if (offlineMode && handleOfflineKey(event)) {
  return;
}
```

This branch must execute before any call to `sendSerialData`, local echo handling, or flow recording. While offline mode is active, no keystroke can reach the serial writer.

- [ ] **Step 3: Guard connection entry points**

At the beginning of `connectPort(filterCH340 = false)`, add:

```js
if (offlineMode) {
  writeToTerminal('\n[OFFLINE] 請先關閉離線模擬，再連接 Writer。\n');
  return;
}
```

Keep all existing connect, disconnect, reconnect, and reader cancellation logic unchanged after this guard.

- [ ] **Step 4: Verify safe output manually**

Open `tool\web_terminal\index.html` in Chrome or Edge, enable `離線模擬`, enter `0`, then confirm the output contains the selected label and `未執行任何硬體命令`, and does not contain SPI ID data or a serial permission prompt.

- [ ] **Step 5: Run syntax validation**

Run:

```powershell
node -e "const fs=require('fs');const s=fs.readFileSync('tool\\web_terminal\\index.html','utf8');const m=s.match(/<script type=\"module\">([\s\S]*?)<\/script>/);if(!m)throw new Error('module script not found');new Function(m[1]);console.log('module syntax OK')"
```

Expected: `module syntax OK`.

- [ ] **Step 6: Commit the navigation change**

```powershell
git add -- tool/web_terminal/index.html
git commit -m "feat: simulate offline programmer navigation"
```

### Task 4: Complete menu coverage from the approved source tree

**Files:**
- Modify: `C:\D_BACKUP\AI_Project\web_app\PP00_Portal\tool\web_terminal\index.html`
- Reference: `C:\D_BACKUP\AI_Project\web_app\PP00_Portal\function_tree.md`

- [ ] **Step 1: Add every described main-menu node**

Populate `offlineMenu.children` with the described keys from `function_tree.md`, including `0`, `1`, `2`, `3`, `4`, `5`, `6`, `7`, `8`, `9`, `b`, `g`, `h`, `i`, `j`, `l`, `p`, `q`, `v`, `s`, `z`, `x`, and `t` where their source descriptions are explicit.

- [ ] **Step 2: Add every described child node**

For each described child, preserve the source key and wording. For items that require a source-level user input, add `inputPrompt` only when the prompt can be identified from `LP_ICIDCheck.c`; otherwise treat the leaf as a selection-only simulation and state that no hardware operation occurs.

- [ ] **Step 3: Exclude ambiguous source entries**

Do not add entries whose only source text is `未標註說明`, duplicate numbering without a distinguishable label, or an incomplete description. Do not silently relabel them as a different operation.

- [ ] **Step 4: Verify menu coverage with a static key check**

Run a small Node check after exposing the data through a temporary in-page debug-free extraction or by reviewing the object literal:

```powershell
node -e "const fs=require('fs');const s=fs.readFileSync('tool\\web_terminal\\index.html','utf8');for(const key of ['offlineMenu','mh_spi_menu','未執行任何硬體命令'])if(!s.includes(key))throw new Error('missing '+key);console.log('offline menu markers OK')"
```

Expected: `offline menu markers OK`.

- [ ] **Step 5: Commit complete source coverage**

```powershell
git add -- tool/web_terminal/index.html
git commit -m "feat: cover documented programmer menu items"
```

### Task 5: Run final regression verification

**Files:**
- Verify: `C:\D_BACKUP\AI_Project\web_app\PP00_Portal\tool\web_terminal\index.html`

- [ ] **Step 1: Run the JavaScript syntax check**

Expected: `module syntax OK`.

- [ ] **Step 2: Run the menu marker check**

Expected: `offline menu markers OK`.

- [ ] **Step 3: Perform browser smoke test**

Open the local file in Chrome or Edge and verify:

1. The initial state remains `Status: DISCONNECTED`.
2. Enabling `離線模擬` prints the offline banner and `mh_spi_menu`.
3. Entering a documented main-menu key opens its child menu.
4. Entering a documented leaf prints the selected label and explicit offline warning.
5. A blank parameter followed by `Enter` prints an error and does not simulate success.
6. `q` and `ESC` return to the previous menu.
7. An unknown key prints an error and leaves the current menu unchanged.
8. Clicking `連接 CH340` while offline prints the guard message and does not open a port picker.
9. Disabling offline mode restores the existing terminal input path.
10. Existing LOG, flow recording, flow playback, clear, freeze, compare, auto-scroll, and font zoom controls remain present.

- [ ] **Step 4: Inspect the final diff**

```powershell
git --no-pager diff -- tool/web_terminal/index.html
git --no-pager status --short
```

Expected: the working diff contains only intentional offline-menu changes in the target file; unrelated worktree files remain untouched. If the target file is already committed, use `git --no-pager show --stat --oneline HEAD` and inspect the latest target-file commit instead.

- [ ] **Step 5: Commit any final correction**

```powershell
git add -- tool/web_terminal/index.html
git commit -m "test: verify offline programmer menu regression"
```
