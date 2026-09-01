# FT DATASHEET SPEC Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將 FT 特性分析工具的第二次 `DATASHEET_SPEC` Excel 匯入改為第四個可編輯規格頁籤，並讓所有分析結果使用同一份重算後狀態。

**Architecture:** `tool\CZ_dataset\spec-sync.js` 提供不依賴 React 的純狀態轉換，依 `rowIdx/specRowIdx` 更新規格、原始文字與對應資料列。`tool\CZ_dataset\index.html` 載入此 helper，新增 `DATASHEET SPEC` 表格並在同一個事件中更新 `datasheetSpecs`、`compareData`、Summary A/B/C 與圖表來源；既有數據編輯表格的特殊群組與判定公式由 callback 重用，不複製第二套規則。

**Tech Stack:** 已產生的 React 18 單檔 HTML、瀏覽器原生 JavaScript、Node.js `node:test`、既有 Excel／公式解析與判定函式。

---

## 檔案結構與責任

- Create: `tool\CZ_dataset\spec-sync.js`
  - 以 UMD 形式提供 `window.FtSpecSync.applySpecEdit`。
  - 僅負責不可變地套用單一規格欄位與重算對應資料列；不依賴 React、Excel 或 DOM。
- Create: `tool\CZ_dataset\spec-sync.test.mjs`
  - 使用 Node 內建 `node:test` 載入 classic script，測試規格更新、列對應、群組同步、空白與無效輸入。
- Modify: `tool\CZ_dataset\index.html`
  - 移除舊第二次 Excel 匯入流程。
  - 載入 `spec-sync.js`。
  - 新增第四個頁籤、規格表元件、規格解析 callback 與統一狀態更新。
- Delete: `tool\CZ_dataset\spec-import-fixes.js`
  - 這是舊匯入方案中途產生的暫時修正版，不再由新架構使用。
- Modify: `tool\CZ_dataset\README.md`
  - 將第二次 Excel 匯入說明改為 `DATASHEET SPEC` 頁籤操作、公式輸入與單位規則。

目前工作區已有 `MEMORY.md`、`README.md`、`SECURITY-REVIEW.md` 與其他使用者變更；執行時不可 reset、checkout 或覆蓋這些不相關檔案。

### Task 1: 建立規格同步 helper 的失敗測試

**Files:**
- Create: `tool\CZ_dataset\spec-sync.test.mjs`
- Create later: `tool\CZ_dataset\spec-sync.js`

- [ ] **Step 1: 定義測試載入器與固定 fixture**

在 `tool\CZ_dataset\spec-sync.test.mjs` 先加入以下內容。測試透過 VM 把 classic script 放入含 `module.exports` 的上下文，因此不需要新增 npm 套件：

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import vm from "node:vm";

const root = dirname(fileURLToPath(import.meta.url));
const source = await readFile(join(root, "spec-sync.js"), "utf8");
const module = { exports: {} };
vm.runInNewContext(source, {
  module,
  exports: module.exports,
  globalThis: {},
});
const { applySpecEdit } = module.exports;

const specs = [
  {
    rowIdx: 10,
    item: "VIL",
    min: -500,
    typ: null,
    max: 300,
    rawMin: "-500",
    rawTyp: null,
    rawMax: "VCC*0.3",
  },
  {
    rowIdx: 11,
    item: "VIL",
    min: -500,
    typ: null,
    max: 360,
    rawMin: "-500",
    rawTyp: null,
    rawMax: "VCC*0.3",
  },
  {
    rowIdx: 20,
    item: "OTHER",
    min: 0,
    typ: null,
    max: 5,
    rawMin: "0",
    rawTyp: null,
    rawMax: "5",
  },
];

const data = [
  {
    specRowIdx: 10,
    item: "VIL",
    group: "Time",
    value: 250,
    specMin: -500,
    specTyp: null,
    specMax: 300,
    judge: "Pass",
    typ_judge: "N/A",
    value_spec_ratio: 1.2,
    vcc: 1000,
  },
  {
    specRowIdx: 11,
    item: "VIL",
    group: "Time",
    value: 250,
    specMin: -500,
    specTyp: null,
    specMax: 360,
    judge: "Pass",
    typ_judge: "N/A",
    value_spec_ratio: 1.44,
    vcc: 1200,
  },
  {
    specRowIdx: 20,
    item: "OTHER",
    group: "DC",
    value: 2,
    specMin: 0,
    specTyp: null,
    specMax: 5,
    judge: "Pass",
    typ_judge: "N/A",
    value_spec_ratio: 2.5,
    vcc: 1000,
  },
];

function linkedSpecRowIds(spec) {
  return spec.item === "VIL"
    ? new Set(["10", "11"])
    : new Set([String(spec.rowIdx)]);
}

function resolveValue(rawValue, row) {
  const raw = String(rawValue ?? "").trim();
  if (raw === "") return { valid: true, raw: null, value: null };
  if (raw === "VCC*0.3") {
    return { valid: true, raw, value: Number(row.vcc) * 0.3 };
  }
  const value = Number(raw);
  return Number.isFinite(value)
    ? { valid: true, raw, value }
    : { valid: false, raw, value: null, message: "規格必須是數字或有效公式" };
}

function recalculateRow(row, spec) {
  const next = {
    ...row,
    specMin: spec.min,
    specTyp: spec.typ,
    specMax: spec.max,
  };
  const max = next.specMax;
  next.judge = max !== null && next.value > max ? "Fail" : "Pass";
  next.value_spec_ratio = max !== null && next.value !== 0
    ? max / next.value
    : null;
  return next;
}
```

- [ ] **Step 2: 寫出規格更新、公式與錯誤處理的失敗測試**

在同一測試檔加入以下測試。它們先以 `applySpecEdit` 尚未存在為預期失敗，確認測試真的鎖定新行為：

```js
test("修改 Max 只更新相同 specRowIdx 的規格與資料列", () => {
  const result = applySpecEdit({
    specs,
    data,
    specRowIdx: 20,
    field: "max",
    rawValue: "3",
    resolveValue,
    getLinkedSpecRowIds: linkedSpecRowIds,
    recalculateRow,
  });

  assert.equal(result.changed, true);
  assert.equal(result.specs.find((row) => row.rowIdx === 20).max, 3);
  assert.equal(result.data.find((row) => row.specRowIdx === 20).specMax, 3);
  assert.equal(result.data.find((row) => row.specRowIdx === 20).judge, "Pass");
  assert.equal(result.specs.find((row) => row.rowIdx === 10).max, 300);
});

test("Time 群組修改會同步同 Item 的規格列，但不影響其他 Item", () => {
  const result = applySpecEdit({
    specs,
    data,
    specRowIdx: 10,
    field: "max",
    rawValue: "200",
    resolveValue,
    getLinkedSpecRowIds: linkedSpecRowIds,
    recalculateRow,
  });

  assert.equal(result.specs.find((row) => row.rowIdx === 10).max, 200);
  assert.equal(result.specs.find((row) => row.rowIdx === 11).max, 200);
  assert.equal(result.data.find((row) => row.specRowIdx === 10).specMax, 200);
  assert.equal(result.data.find((row) => row.specRowIdx === 11).specMax, 200);
  assert.equal(result.specs.find((row) => row.rowIdx === 20).max, 5);
});

test("空白會清除規格，VCC 公式保留原文且使用 Value 相同單位", () => {
  const cleared = applySpecEdit({
    specs,
    data,
    specRowIdx: 10,
    field: "typ",
    rawValue: " ",
    resolveValue,
    getLinkedSpecRowIds: linkedSpecRowIds,
    recalculateRow,
  });
  assert.equal(cleared.specs.find((row) => row.rowIdx === 10).typ, null);
  assert.equal(cleared.specs.find((row) => row.rowIdx === 10).rawTyp, null);

  const formula = applySpecEdit({
    specs,
    data,
    specRowIdx: 10,
    field: "max",
    rawValue: "VCC*0.3",
    resolveValue,
    getLinkedSpecRowIds: linkedSpecRowIds,
    recalculateRow,
  });
  assert.equal(formula.specs.find((row) => row.rowIdx === 10).rawMax, "VCC*0.3");
  assert.equal(formula.specs.find((row) => row.rowIdx === 10).max, 300);
  assert.equal(formula.data.find((row) => row.specRowIdx === 10).specMax, 300);
  assert.equal(formula.specs.find((row) => row.rowIdx === 11).max, 360);
  assert.equal(formula.data.find((row) => row.specRowIdx === 11).specMax, 360);
});

test("無效規格拒絕修改並保留原本 specs 與 data", () => {
  const result = applySpecEdit({
    specs,
    data,
    specRowIdx: 20,
    field: "max",
    rawValue: "not-a-spec",
    resolveValue,
    getLinkedSpecRowIds: linkedSpecRowIds,
    recalculateRow,
  });

  assert.equal(result.changed, false);
  assert.equal(result.error, "規格必須是數字或有效公式");
  assert.deepEqual(result.specs, specs);
  assert.deepEqual(result.data, data);
});
```

- [ ] **Step 3: 執行測試確認它以「helper 不存在」原因失敗**

執行：

```powershell
node --test tool\CZ_dataset\spec-sync.test.mjs
```

預期：測試載入階段失敗，原因是 `tool\CZ_dataset\spec-sync.js` 尚未建立；不可在此步驟修改測試使其先通過。

- [ ] **Step 4: 提交紅燈測試**

```powershell
git add -- tool\CZ_dataset\spec-sync.test.mjs
git commit -m "test: define FT DATASHEET SPEC sync behavior" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 2: 實作純規格同步 helper 並通過測試

**Files:**
- Create: `tool\CZ_dataset\spec-sync.js`
- Test: `tool\CZ_dataset\spec-sync.test.mjs`

- [ ] **Step 1: 實作不依賴框架的 `applySpecEdit`**

建立以下 classic script。它同時能在瀏覽器提供 `window.FtSpecSync`，也能在 Node VM 測試中透過 `module.exports` 使用；所有輸入陣列都不直接修改：

```js
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.FtSpecSync = factory();
  }
})(typeof globalThis === "object" ? globalThis : this, function () {
  const fields = new Set(["min", "typ", "max"]);

  function applySpecEdit({
    specs,
    data,
    specRowIdx,
    field,
    rawValue,
    resolveValue,
    getLinkedSpecRowIds,
    recalculateRow,
  }) {
    if (!fields.has(field)) {
      throw new Error(`Unsupported spec field: ${field}`);
    }

    const target = specs.find(
      (spec) => String(spec.rowIdx) === String(specRowIdx)
    );
    if (!target) {
      return {
        specs,
        data,
        changed: false,
        error: "找不到對應的規格列",
      };
    }

    const context =
      data.find(
        (row) => String(row.specRowIdx) === String(specRowIdx)
      ) || target;
    const linkedIds = new Set(
      Array.from(
        getLinkedSpecRowIds
          ? getLinkedSpecRowIds(target, data)
          : [String(target.rowIdx)]
      ).map(String)
    );
    const rawField = `raw${field[0].toUpperCase()}${field.slice(1)}`;
    const parsedByRowIdx = new Map();
    for (const spec of specs) {
      if (!linkedIds.has(String(spec.rowIdx))) continue;
      const specContext =
        data.find(
          (row) => String(row.specRowIdx) === String(spec.rowIdx)
        ) || context;
      const parsed = resolveValue(rawValue, specContext, spec, field);
      if (!parsed.valid) {
        return {
          specs,
          data,
          changed: false,
          error: parsed.message || "規格格式無效",
        };
      }
      parsedByRowIdx.set(String(spec.rowIdx), parsed);
    }
    const nextSpecs = specs.map((spec) => {
      if (!linkedIds.has(String(spec.rowIdx))) return spec;
      const parsed = parsedByRowIdx.get(String(spec.rowIdx));
      return {
        ...spec,
        [field]: parsed.value,
        [rawField]: parsed.raw,
      };
    });
    const nextSpecByRowIdx = new Map(
      nextSpecs.map((spec) => [String(spec.rowIdx), spec])
    );
    const nextData = data.map((row) => {
      const spec = nextSpecByRowIdx.get(String(row.specRowIdx));
      if (!spec || !linkedIds.has(String(row.specRowIdx))) return row;
      return recalculateRow(
        row,
        spec,
        parsedByRowIdx.get(String(row.specRowIdx))
      );
    });

    return {
      specs: nextSpecs,
      data: nextData,
      changed: true,
      error: null,
    };
  }

  return { applySpecEdit };
});
```

- [ ] **Step 2: 執行單元測試確認通過**

執行：

```powershell
node --test tool\CZ_dataset\spec-sync.test.mjs
node --check tool\CZ_dataset\spec-sync.js
```

預期：4 個測試全部 PASS，且 `node --check` 無輸出錯誤。

- [ ] **Step 3: 提交 helper**

```powershell
git add -- tool\CZ_dataset\spec-sync.js tool\CZ_dataset\spec-sync.test.mjs
git commit -m "feat: add FT spec state synchronizer" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 3: 移除第二次 Excel 匯入流程

**Files:**
- Modify: `tool\CZ_dataset\index.html`
- Delete: `tool\CZ_dataset\spec-import-fixes.js`

- [ ] **Step 1: 盤點 legacy 匯入錨點並保存目前差異**

執行：

```powershell
git --no-pager diff -- tool\CZ_dataset\index.html
rg -n "specImport|匯入 DATASHEET_SPEC|setSpecImporting|file.*Spec|DATASHEET_SPEC" tool\CZ_dataset\index.html
```

確認既有使用者修改不被覆蓋；移除範圍只包含第二次 Excel 匯入按鈕、檔案 input、讀取 overlay、`specImportNumber`、`specImportReadSheet`、`specImportKey`、`specImportResolve`、`specImportApply`、`specImportApplyFixed` 呼叫與 `Re` 匯入事件。保留 `ufe` 的 `DATASHEET_SPEC` 匯出工作表和既有原始資料匯入。

- [ ] **Step 2: 移除舊 UI 與 event handler**

使用 `apply_patch` 移除 head 中目前的：

```html
<script src="spec-import-fixes.js"></script>
```

再在 `index.html` 的 React 單行 bundle 中，以一次性、帶出現次數斷言的文字替換移除舊匯入 JSX／handler；替換腳本必須在寫檔前檢查每個 legacy 片段恰好出現一次，找不到或出現多次就中止，不得靜默寫入。替換完成後加入：

```html
<script src="spec-sync.js"></script>
```

且必須位於 React module bundle 之前，使 `window.FtSpecSync` 在 `TIe` 執行前存在。

- [ ] **Step 3: 刪除暫時修正版並確認舊功能已消失**

用 `apply_patch` 刪除明確路徑 `tool\CZ_dataset\spec-import-fixes.js`，再執行：

```powershell
if (Test-Path tool\CZ_dataset\spec-import-fixes.js) {
  throw "spec-import-fixes.js 尚未刪除"
}
rg -n "specImport|匯入 DATASHEET_SPEC|spec-import-fixes" tool\CZ_dataset\index.html
```

預期：`spec-import-fixes.js` 不存在，`index.html` 只保留匯出函式中的 `DATASHEET_SPEC` 字樣，不再有匯入按鈕或匯入事件。

- [ ] **Step 4: 提交 legacy removal**

```powershell
git add -- tool\CZ_dataset\index.html
git commit -m "refactor: remove FT spec re-import flow" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

`spec-import-fixes.js` 目前是未追蹤的暫時檔，刪除後不需要 `git rm`；若執行環境顯示它已被追蹤，改用 `git add -u -- tool\CZ_dataset\spec-import-fixes.js` 一併記錄刪除。

### Task 4: 新增 DATASHEET SPEC 頁籤與可編輯表格

**Files:**
- Modify: `tool\CZ_dataset\index.html`

- [ ] **Step 1: 加入可保留公式文字的輸入元件**

在現有數據表格 `hy` 元件附近新增 `specInput`，不要使用 `type="number"`，因為 `VCC*0.3` 與 `VIO+0.4` 必須能顯示與編輯：

```js
function specInput({ value, onCommit, className }) {
  const [draft, setDraft] = ct.useState(value ?? "");
  ct.useEffect(() => setDraft(value ?? ""), [value]);

  const commit = () => {
    const accepted = onCommit(draft);
    if (accepted === false) setDraft(value ?? "");
  };

  return Q.jsx("input", {
    type: "text",
    value: draft,
    onChange: (event) => setDraft(event.target.value),
    onBlur: commit,
    onKeyDown: (event) => {
      if (event.key === "Enter") event.currentTarget.blur();
      if (event.key === "Escape") setDraft(value ?? "");
    },
    className,
    spellCheck: false,
  });
}
```

- [ ] **Step 2: 加入規格表元件**

在 `cfe` 元件附近新增 `datasheetSpecTable`，固定使用匯出欄位順序；前 5 欄唯讀，後 3 欄呼叫 `onCommit(spec.rowIdx, field, rawValue)`：

```js
function specDisplayValue(spec, field) {
  const rawField = `raw${field[0].toUpperCase()}${field.slice(1)}`;
  const raw = spec[rawField];
  return raw !== null && raw !== undefined && raw !== ""
    ? String(raw)
    : spec[field] === null || spec[field] === undefined
      ? ""
      : String(spec[field]);
}

function datasheetSpecTable({ specs, onCommit }) {
  const columns = [
    ["item", "Item"],
    ["description", "Description"],
    ["alignment", "4Byte_Alignment"],
    ["group", "Group"],
    ["dummy_rd", "Dummy_Rd"],
  ];
  return Q.jsxs("div", {
    className: "datagrid-container",
    children: [
      Q.jsx("div", {
        className: "table-responsive",
        children: [
          Q.jsx("table", {
            className: "dense-table",
            children: [
              Q.jsx("thead", {
                children: Q.jsx("tr", {
                  children: [
                    ...columns.map(([key, label]) =>
                      Q.jsx("th", { children: label }, key)
                    ),
                    Q.jsx("th", { children: "Min" }),
                    Q.jsx("th", { children: "Typ" }),
                    Q.jsx("th", { children: "Max" }),
                  ],
                }),
              }),
              Q.jsx("tbody", {
                children: specs.map((spec) =>
                  Q.jsxs(
                    "tr",
                    {
                      children: [
                        ...columns.map(([key]) =>
                          Q.jsx("td", { children: spec[key] ?? "" }, `${spec.rowIdx}-${key}`)
                        ),
                        ...["min", "typ", "max"].map((field) =>
                          Q.jsx(
                            "td",
                            {
                              className: "editable-cell",
                              children: specInput({
                                value: specDisplayValue(spec, field),
                                onCommit: (rawValue) =>
                                  onCommit(spec.rowIdx, field, rawValue),
                                className: "cell-input tabular-nums",
                              }),
                            },
                            `${spec.rowIdx}-${field}`
                          )
                        ),
                      ],
                    },
                    String(spec.rowIdx)
                  )
                ),
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
```

- [ ] **Step 3: 加入第四個頁籤按鈕與渲染分支**

在 `TIe` 的 `tab-buttons` 中，依現有 `summary`、`grid`、`chart` 按鈕格式加入：

```js
Q.jsx("button", {
  className: `tab-btn ${R === "spec" ? "active" : ""}`,
  onClick: () => O("spec"),
  children: "DATASHEET SPEC",
})
```

在既有 `R` 條件渲染中加入 `R === "spec"` 分支，傳入目前 `g`（`datasheetSpecs`）與 Task 5 的 `handleSpecEdit`。資料尚未載入時只顯示既有空狀態，不渲染空白編輯表。

- [ ] **Step 4: 檢查 DOM 與欄位數**

執行：

```powershell
rg -o 'DATASHEET SPEC' tool\CZ_dataset\index.html | Measure-Object | Select-Object -ExpandProperty Count
rg -o 'specInput|datasheetSpecTable|R==="spec"' tool\CZ_dataset\index.html | Measure-Object | Select-Object -ExpandProperty Count
```

預期：頁籤標籤、元件名稱與 `spec` 渲染分支各至少出現一次，且沒有新增第二個匯入 input。

- [ ] **Step 5: 提交頁籤 UI**

```powershell
git add -- tool\CZ_dataset\index.html
git commit -m "feat: add FT DATASHEET SPEC tab" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

### Task 5: 將規格編輯接到單一重算狀態鏈

**Files:**
- Modify: `tool\CZ_dataset\index.html`
- Test: `tool\CZ_dataset\spec-sync.test.mjs`

- [ ] **Step 1: 保留共用公式解析並定義編輯輸入解析器**

保留目前 bundle 中的 `x_(e,t,r,n,i)` VCC／VIO expression resolver（它也被原始資料解析使用），不要因移除匯入流程而刪除。編輯入口呼叫時第五個 unit 參數固定傳空字串，避免任何 `/1000` 或 `*1000` 轉換。空白回傳 null，數字直接使用相同單位，公式只依目前資料列的 VCC／VIO 解析：

```js
function parseEditableSpecValue(rawValue, row, currentSpec, field) {
  const raw = String(rawValue ?? "").trim();
  if (raw === "") return { valid: true, raw: null, value: null };

  const numeric = Number(raw);
  if (Number.isFinite(numeric)) {
    return { valid: true, raw, value: numeric };
  }

  const value = x_(
    raw,
    row.vcc,
    row.vio,
    row.item,
    ""
  );
  if (!Number.isFinite(Number(value))) {
    return {
      valid: false,
      raw,
      value: null,
      message: "規格必須是數字、空白或有效的 VCC/VIO 公式",
    };
  }
  return { valid: true, raw, value: Number(value) };
}
```

- [ ] **Step 2: 重用既有特殊群組的規格列選擇規則**

在 `TIe` 或共用 helper 呼叫前加入：

```js
function shouldSyncSpecRows(row) {
  return row.group === "Time" ||
    (["DTR read", "Except NR/DTR", "Normal Read"].includes(row.group) &&
      (!row.dummy_rd || row.dummy_rd.trim() === ""));
}

function getLinkedSpecRowIds(targetSpec, compareData) {
  const source = compareData.find(
    (row) => String(row.specRowIdx) === String(targetSpec.rowIdx)
  );
  if (!source || !shouldSyncSpecRows(source)) {
    return new Set([String(targetSpec.rowIdx)]);
  }
  return new Set(
    compareData
      .filter(
        (row) =>
          row.item === source.item &&
          shouldSyncSpecRows(row)
      )
      .map((row) => String(row.specRowIdx))
  );
}
```

這裡只決定哪些 `rowIdx` 要同步；Judge、Typ_Judge、Ratio 仍交給既有 `hv`、`dv`、`pv` callback，避免複製判定公式。

- [ ] **Step 3: 建立 `handleSpecEdit` 並一次提交所有衍生 state**

在 `TIe` 內以目前 state setter 的實際名稱加入等價 handler。現有 minified state 中 `p/m` 對應 `compareData/setCompareData`、`g/y` 對應 `datasheetSpecs/setDatasheetSpecs`、`v/x` 對應 Summary A/B 及其 setter；以實際 bundle 內容再次確認後使用。核心流程必須先完整計算 `result`，成功後才呼叫任何 setter；失敗只以純文字提示並回傳 `false`：

```js
const handleSpecEdit = (specRowIdx, field, rawValue) => {
  const result = window.FtSpecSync.applySpecEdit({
    specs: g,
    data: p,
    specRowIdx,
    field,
    rawValue,
    resolveValue: parseEditableSpecValue,
    getLinkedSpecRowIds,
    recalculateRow: (row, spec) => {
      const min = resolveSpecValueForRow(row, spec, "min");
      const typ = resolveSpecValueForRow(row, spec, "typ");
      const max = resolveSpecValueForRow(row, spec, "max");
      return {
        ...row,
        specMin: min,
        specTyp: typ,
        specMax: max,
        judge: hv(
          row.value,
          min,
          max,
          row.judgeCriteria,
          row.item
        ),
        typ_judge: dv(
          row.value,
          typ,
          row.metric,
          row.temp,
          row.vcc
        ),
        value_spec_ratio: pv(
          row.value,
          min,
          max,
          row.judgeCriteria,
          row.item
        ),
      };
    },
  });

  if (!result.changed) {
    alert(result.error);
    return false;
  }

  m(result.data);
  y(result.specs);
  x(y5(result.data));
  return true;
};
```

上方 `m`、`y`、`x` 是目前 bundle 的實際 minified setter 對應；依 state 宣告確認後使用，不要保留不明確的第二套狀態。`recalculateRow` 需以 `spec.rawMin/rawTyp/rawMax` 優先解析每一筆資料列的公式，不能把不同 VCC／VIO 列共用 target 的單一數值；例如同一 `VCC*0.3` 在 VCC=1000 與 VCC=1200 時應分別得到 300 與 360。加入並使用以下 row-level resolver，若既有 spec raw 內容無法解析就明確拋出錯誤，不要靜默改用錯誤數值：

```js
function resolveSpecValueForRow(row, spec, field) {
  const rawField = `raw${field[0].toUpperCase()}${field.slice(1)}`;
  const candidate = spec[rawField] ?? spec[field] ?? "";
  const parsed = parseEditableSpecValue(candidate, row, spec, field);
  if (!parsed.valid) {
    throw new Error(`${field} 規格無法依目前資料列解析`);
  }
  return parsed.value;
}
```

`recalculateRow` 先以 `resolveSpecValueForRow(row, spec, "min")`、`"typ"`、`"max"` 取得數值，再傳入既有 `hv`、`dv`、`pv`。圖表若由 `compareData` 派生，更新 `compareData` 後自然刷新；Summary C 必須使用更新後的 `datasheetSpecs` 與原始規格快照重新比較。

- [ ] **Step 4: 將 handler 傳入規格表並補測試**

將 `datasheetSpecTable` 的 `onCommit` 接到 `handleSpecEdit`，確認欄位失焦或 Enter 只提交一次；無效值由 `specInput` 恢復上一個顯示值。

在測試中補一個原始規格比較 callback 的行為測試，確認更新後的 specs 是目前規格、原始 fixture 不會被修改：

```js
test("更新是不可變的，原始規格可繼續作為 Summary C 基準", () => {
  const before = structuredClone(specs);
  const result = applySpecEdit({
    specs,
    data,
    specRowIdx: 20,
    field: "max",
    rawValue: "3",
    resolveValue,
    getLinkedSpecRowIds: linkedSpecRowIds,
    recalculateRow,
  });

  assert.deepEqual(specs, before);
  assert.equal(result.specs.find((row) => row.rowIdx === 20).max, 3);
  assert.notEqual(result.specs, specs);
});
```

- [ ] **Step 5: 執行單元測試並提交狀態同步**

```powershell
node --test tool\CZ_dataset\spec-sync.test.mjs
node --check tool\CZ_dataset\spec-sync.js
git add -- tool\CZ_dataset\index.html tool\CZ_dataset\spec-sync.test.mjs
git commit -m "feat: synchronize FT spec edits with analysis state" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

預期：5 個測試全部 PASS；`index.html` 不再有只更新 Summary C 的獨立匯入狀態鏈。

### Task 6: 更新工具文件

**Files:**
- Modify: `tool\CZ_dataset\README.md`

- [ ] **Step 1: 移除舊第二次匯入說明**

刪除「點擊匯入 DATASHEET_SPEC」及其五欄鍵比對、未匹配、無效規格與匯入警告說明，因為功能已不再讀取第二份 Excel。

- [ ] **Step 2: 加入新頁籤操作說明**

加入以下使用者可直接照做的內容：

```markdown
### DATASHEET SPEC 規格編輯

原始資料匯入後，頁面會新增 `DATASHEET SPEC` 分頁，欄位順序與「匯出無損公式 Excel」中的 `DATASHEET_SPEC` 工作表一致。`Item`、`Description`、`4Byte_Alignment`、`Group`、`Dummy_Rd` 為唯讀；`Min`、`Typ`、`Max` 可直接修改。

修改欄位後按 Enter 或離開欄位即套用，系統會同步重算數據編輯表格的 SPEC、Ratio、Judge、Typ_Judge，以及統計總覽 A、B、C 和圖表。空白代表清除該方向規格。

Min、Typ、Max 支援數字與依資料條件解析的 `VCC`／`VIO` 公式，例如 `VCC*0.3`、`VCC+0.4`。VIL／VIH 不會額外除以或乘以 1000，規格與 Value 維持相同單位。無法解析的輸入會被拒絕並恢復上一個有效值。
```

- [ ] **Step 3: 檢查文件中的舊入口與提交**

```powershell
rg -n "匯入 DATASHEET_SPEC|未匹配|無效規格|DATASHEET SPEC 規格編輯|VIL|VIH" tool\CZ_dataset\README.md
git add -- tool\CZ_dataset\README.md
git commit -m "docs: document FT DATASHEET SPEC editing" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

預期：README 只描述頁籤編輯，不再指示使用者上傳第二份 Excel。

### Task 7: 執行整體驗收並保留工作區邊界

**Files:**
- Verify: `tool\CZ_dataset\index.html`
- Verify: `tool\CZ_dataset\spec-sync.js`
- Verify: `tool\CZ_dataset\spec-sync.test.mjs`
- Verify: `tool\CZ_dataset\README.md`

- [ ] **Step 1: 執行純函式與語法驗證**

```powershell
node --test tool\CZ_dataset\spec-sync.test.mjs
node --check tool\CZ_dataset\spec-sync.js
```

預期：所有測試 PASS，無語法錯誤。

- [ ] **Step 2: 啟動既有本機靜態伺服器**

使用 repository 既有腳本，不安裝新工具：

```powershell
npm run dev -- --host 127.0.0.1
```

以瀏覽器開啟 `http://127.0.0.1:5173/tool/CZ_dataset/index.html`，確認頁面可載入；若現有 Vite 使用其他埠，以終端輸出為準。

- [ ] **Step 3: 以實際資料驗收四個頁籤與同步結果**

使用既有 FT 原始 Excel 完成以下操作：

1. 確認頁籤順序為統計總覽、數據編輯表格、分析圖表預覽、DATASHEET SPEC。
2. 確認規格表恰有 8 欄，前 5 欄唯讀，Min／Typ／Max 可編輯。
3. 修改一筆 Max，確認數據編輯表格的 Max、Ratio、Judge、Summary A/B/C 與圖表同步。
4. 修改一筆 Typ，確認 Typ_Judge 與 Summary A 同步。
5. 修改 Min／Max，確認 Summary B 依既有 `< 1.15` 門檻更新。
6. 輸入 `VCC*0.3` 與空白，確認原文保留、數值重算與清除規格正確。
7. 在 VIL／VIH 輸入與 Value 同單位的數字，確認沒有 1000 倍轉換。
8. 輸入無效文字，確認欄位恢復原值且其他頁面狀態不變。
9. 匯出無損 Excel，確認工作表仍為 `DATASHEET_SPEC`、`Compare`、`Summary`，且 `DATASHEET_SPEC` 8 欄順序不變。

- [ ] **Step 4: 檢查只包含本功能的差異**

```powershell
git --no-pager status --short
git --no-pager diff --check
git --no-pager log -6 --oneline
```

確認沒有修改 `MEMORY.md`、使用者既有安全審查檔或其他工具；不要使用 `git reset --hard`、`git checkout --` 或廣泛刪除命令。Task 1–6 已各自提交時，不建立沒有內容的驗收空提交；只保留驗收輸出與工作區狀態。

## 規格覆蓋檢查

| 設計要求 | 對應計畫 |
| :--- | :--- |
| 移除第二次 Excel 匯入 | Task 3 |
| 第四個 `DATASHEET SPEC` 頁籤 | Task 4 |
| 8 欄、前 5 欄唯讀、Min／Typ／Max 可編輯 | Task 4 |
| Enter／失焦套用 | Task 4 |
| 數字、空白、VCC／VIO 公式 | Task 1、Task 5 |
| 無效輸入拒絕並恢復上一值 | Task 1、Task 5 |
| `rowIdx/specRowIdx` 穩定對應 | Task 1、Task 2、Task 5 |
| SPEC、Ratio、Judge、Typ_Judge 重算 | Task 5 |
| Summary A/B/C 與圖表同步 | Task 5、Task 7 |
| VIL／VIH 不做 1000 倍轉換 | Task 1、Task 5、Task 6、Task 7 |
| 匯出格式不變 | Task 3、Task 7 |
| README 更新 | Task 6 |

## 執行注意事項

- 不要從 `C:\D_BACKUP\AI_Project\web_app\CZ_dataset\web` 讀取或修改檔案；本計畫只操作目前 repository 內的部署檔與測試檔。
- 不要把舊 `spec-import-fixes.js` 留在部署目錄，也不要把第二次 Excel input 以隱藏方式保留。
- `DATASHEET_SPEC` 匯出工作表本身必須保留；移除的是重新匯入流程，不是匯出功能。
- 任何單檔文字替換都必須先斷言唯一匹配，再寫回並檢查 `git diff --check`，避免 minified bundle 被部分破壞。
