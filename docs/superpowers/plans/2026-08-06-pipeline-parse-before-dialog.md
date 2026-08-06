# T5830 解析完成後開啟選擇視窗 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 選取有效壓縮檔後先顯示解析狀態，完成產品名稱／站點解析後才開啟選擇視窗。

**Architecture:** 沿用 `PipelinePage` 既有 React state 與同步 `buildProductStationGroups` 流程，只增加解析狀態 state。檔案格式驗證維持原流程；解析完成後才設定 `showProductDialog`。

**Tech Stack:** React、TypeScript、Vitest、Testing Library、Vite。

---

### Task 1: 建立解析完成後才開窗的失敗測試

**Files:**
- Modify: `tool/T5830_TTO/src/features/pipeline/PipelinePage.test.tsx`

- [ ] **Step 1: 新增解析流程行為測試**

在 `describe('PipelinePage')` 中加入測試，使用現有 `productStationFile` helper：

```tsx
it('shows parsing status before opening the product selection dialog', async () => {
  const user = userEvent.setup();
  render(<PipelinePage />);

  await user.upload(
    screen.getByLabelText('選擇產品資料夾（自動偵測產品名稱）'),
    productStationFile('EAG119', 'DS00')
  );

  expect(screen.queryByText('正在解析產品名稱與站點…')).not.toBeInTheDocument();
  expect(screen.getByRole('dialog', { name: '選擇要分析的產品、站點' })).toBeVisible();
});
```

- [ ] **Step 2: 執行測試確認目前行為不符合新需求**

Run:

```powershell
Set-Location 'C:\D_BACKUP\AI_Project\web_app\PP00_Portal\tool\T5830_TTO'
npm run test:run -- src/features/pipeline/PipelinePage.test.tsx
```

Expected: 新測試先失敗，因目前沒有「正在解析產品名稱與站點…」狀態。

### Task 2: 加入解析狀態並延後開窗

**Files:**
- Modify: `tool/T5830_TTO/src/features/pipeline/PipelinePage.tsx:133-172`

- [ ] **Step 1: 新增解析狀態 state**

在 `showProductDialog` state 附近加入：

```tsx
const [isParsingSelection, setIsParsingSelection] = useState(false);
```

- [ ] **Step 2: 修改有效檔案選取流程**

在有效 `tarFiles` 分支中，設定檔案後先顯示解析狀態；完成群組與 metadata 初始化後清除狀態，再開啟視窗：

```tsx
setError('');
setFiles(tarFiles);
setStatus('idle');
setProgress(null);
setIsParsingSelection(true);
const detectedGroups = buildProductStationGroups(tarFiles);
setGroups(detectedGroups);
setMetadataByProduct(Object.fromEntries(
  [...new Set(detectedGroups.map((group) => group.product))].map((product) => [
    product,
    PRODUCT_METADATA[product] ?? blankProductMeta()
  ])
));
setPendingGroupKeys(detectedGroups.map((group) => group.key));
setSelectedGroupKeys([]);
setIsParsingSelection(false);
setShowProductDialog(true);
```

在無有效壓縮檔分支加入 `setIsParsingSelection(false);`，確保錯誤時不殘留解析狀態。

- [ ] **Step 3: 在上傳區顯示解析中提示並阻止重複操作**

在檔案提示或狀態文字區加入：

```tsx
{isParsingSelection && <p className="status-text">正在解析產品名稱與站點…</p>}
```

將開始分析按鈕的 disabled 條件加入 `isParsingSelection`：

```tsx
disabled={selectedFiles.length === 0 || isParsingSelection || showProductDialog || status === 'processing'}
```

- [ ] **Step 4: 執行單檔測試確認通過**

Run:

```powershell
Set-Location 'C:\D_BACKUP\AI_Project\web_app\PP00_Portal\tool\T5830_TTO'
npm run test:run -- src/features/pipeline/PipelinePage.test.tsx
```

Expected: `PipelinePage.test.tsx` 全部通過。

### Task 3: 執行 T5830 回歸驗證並重建部署產物

**Files:**
- Modify: `tool/T5830_TTO/dist/index.html`
- Modify: `tool/T5830_TTO/dist/assets/*`

- [ ] **Step 1: 執行既有回歸測試**

Run:

```powershell
Set-Location 'C:\D_BACKUP\AI_Project\web_app\PP00_Portal\tool\T5830_TTO'
npm run test:run -- src/lib/workbook.test.ts src/features/pipeline/PipelinePage.test.tsx src/features/dashboard/DashboardPage.test.tsx
```

Expected: 3 個測試檔全部通過。

- [ ] **Step 2: 建置 T5830 部署產物**

Run:

```powershell
Set-Location 'C:\D_BACKUP\AI_Project\web_app\PP00_Portal\tool\T5830_TTO'
npm run build
```

Expected: TypeScript 檢查與 Vite build 成功，`dist/index.html` 指向最新雜湊資產。

- [ ] **Step 3: 檢查變更範圍**

Run:

```powershell
Set-Location 'C:\D_BACKUP\AI_Project\web_app\PP00_Portal'
git diff --check
git status --short
```

Expected: 只有 `PipelinePage.tsx`、`PipelinePage.test.tsx`、必要的 `dist` 產物與本計畫相關檔案變更；不納入 `MEMORY.md` 或 `.superpowers/`。

- [ ] **Step 4: Commit**

```powershell
Set-Location 'C:\D_BACKUP\AI_Project\web_app\PP00_Portal'
git add -- 'tool/T5830_TTO/src/features/pipeline/PipelinePage.tsx' 'tool/T5830_TTO/src/features/pipeline/PipelinePage.test.tsx' 'tool/T5830_TTO/dist'
git commit -m "fix: parse product stations before dialog" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```
