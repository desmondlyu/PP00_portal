# DL to Excel 合併匯出檔名 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users define the filename of the merged Excel export while preserving split ZIP behavior.

**Architecture:** Add one filename input to the existing mode control panel and one small sanitizer helper in the inline script. The merge export path uses the normalized value; the split export path remains unchanged.

**Tech Stack:** HTML, CSS, vanilla JavaScript, SheetJS, existing browser download APIs.

---

### Task 1: Add configurable merged filename

**Files:**
- Modify: `tool\DL_to_Excel\index.html` (mode control markup, DOM references, `setMode`, merge export branch)

- [ ] **Step 1: Verify the pre-change export contract**

Run from the repository root:

```powershell
$p = Get-Content .\tool\DL_to_Excel\index.html -Raw
if ($p -notmatch 'XLSX\.writeFile\(wb, "datalog_merged\.xlsx"\)') { throw 'merge export filename not found' }
if ($p -notmatch 'a\.download = "datalog_individual_files\.zip"') { throw 'split ZIP filename not found' }
if ($p -match 'id="merge-filename"') { throw 'filename input already exists' }
Write-Output 'pre-change export checks passed'
```

Expected:

```text
pre-change export checks passed
```

- [ ] **Step 2: Add the filename input**

Insert below the mode description in the control panel:

```html
<label id="merge-filename-wrapper" style="display: block; margin-top: 0.8rem; font-size: 0.85rem; color: var(--text-muted);">
  合併檔案名稱
  <input type="text" id="merge-filename" value="datalog_merged.xlsx"
    style="display: block; width: 100%; margin-top: 0.35rem; padding: 0.55rem 0.7rem; box-sizing: border-box;"
    aria-label="合併匯出檔案名稱">
</label>
```

- [ ] **Step 3: Add normalization and mode visibility**

Add these DOM references beside `modeDesc`, `tabMerge`, and `tabSplit`:

```javascript
const mergeFilenameWrapper = document.getElementById('merge-filename-wrapper');
const mergeFilenameInput = document.getElementById('merge-filename');
```

Add this helper before `setMode`:

```javascript
function getMergeFilename() {
  const fallback = 'datalog_merged.xlsx';
  const baseName = mergeFilenameInput.value.trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\.+$/, '');
  if (!baseName) return fallback;
  return /\.xlsx$/i.test(baseName) ? baseName : `${baseName}.xlsx`;
}
```

Update `setMode` so the wrapper follows the selected mode:

```javascript
mergeFilenameWrapper.style.display = mode === 'merge' ? 'block' : 'none';
```

Keep the existing mode descriptions and `validateFilesStructure()` call.

- [ ] **Step 4: Use the normalized filename for merge export**

Replace:

```javascript
XLSX.writeFile(wb, "datalog_merged.xlsx");
outputName = "datalog_merged.xlsx";
```

With:

```javascript
outputName = getMergeFilename();
XLSX.writeFile(wb, outputName);
```

Do not modify the split ZIP branch or its fixed filename.

- [ ] **Step 5: Verify the implementation contract**

Run:

```powershell
$p = Get-Content .\tool\DL_to_Excel\index.html -Raw
foreach ($pattern in @(
  'id="merge-filename-wrapper"',
  'id="merge-filename"',
  'function getMergeFilename\(\)'
)) {
  if ($p -notmatch $pattern) { throw "missing: $pattern" }
}
if ($p -notmatch 'outputName = getMergeFilename\(\)') { throw 'merge filename not used' }
if ($p -notmatch 'a\.download = "datalog_individual_files\.zip"') { throw 'split ZIP filename changed' }
if ($p -match 'XLSX\.writeFile\(wb, "datalog_merged\.xlsx"\)') { throw 'hard-coded merge filename remains' }
Write-Output 'merge filename checks passed'
```

Expected:

```text
merge filename checks passed
```

- [ ] **Step 6: Review and commit**

```powershell
git --no-pager diff -- .\tool\DL_to_Excel\index.html
git add .\tool\DL_to_Excel\index.html
git commit -m "feat: allow custom merged Excel filename" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```
