# Release Radar 與 Wafer Hero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓首頁最新更新成為首列焦點，並以低干擾的暗色晶圓 SVG 動畫取代靜態 Hero 圖示。

**Architecture:** 在既有 `App` 元件增加一個本地 boolean state，僅控制歷史更新清單的展開。Hero 仍是內嵌 SVG，CSS 負責晶圓旋轉、die 缺陷脈衝與 reduced-motion 關閉機制；不新增元件、套件或資料來源。

**Tech Stack:** React 18、CSS、內嵌 SVG、Vite。

---

## 檔案責任

- `src/App.jsx`：首列 5/7 欄位、最新更新/歷史更新的語意與展開狀態、晶圓 SVG 結構。
- `src/index.css`：Release Radar 視覺層級、晶圓與 die 動畫、reduced-motion 規則。

### Task 1: 建立最新更新與歷史更新互動

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: 在既有 iframe state 後新增歷史更新展開 state**

```jsx
const [showChangelogHistory, setShowChangelogHistory] = useState(false);
```

- [ ] **Step 2: 將首列欄位改為 5/7，並分離最新與歷史資料**

將 Hero section class 由 `col-8 hero-card` 改為 `col-5 hero-card`。將更新 section class 改為 `col-7 changelog-card`，並在 JSX 開頭以：

```jsx
const [latestChangelog, ...changelogHistory] = changelog;
```

取代原本的 `changelog.map(...)`。最新項目必須永久顯示為 `changelog-item new changelog-latest`；其餘項目僅在 `showChangelogHistory` 為 true 時渲染。

- [ ] **Step 3: 在最新項目後加入原生展開按鈕**

```jsx
<button
  className="changelog-toggle"
  type="button"
  aria-expanded={showChangelogHistory}
  onClick={() => setShowChangelogHistory((visible) => !visible)}
>
  {showChangelogHistory ? '收合歷史更新' : '查看歷史更新'}
</button>
```

按鈕下方以 `showChangelogHistory && changelogHistory.map(...)` 渲染原有版本、日期與摘要格式。

- [ ] **Step 4: 以本機預覽確認互動**

Run: `npm run dev -- --host 127.0.0.1 --port 3100`

在瀏覽器確認最新項目一律可見；點擊按鈕後歷史兩筆出現，再點擊後消失，按鈕文字與 `aria-expanded` 同步改變。

- [ ] **Step 5: Commit**

```powershell
git add src/App.jsx
git commit -m "feat: prioritize latest portal update"
```

### Task 2: 以暗色晶圓 SVG 取代靜態 Hero 圖示

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: 以晶圓 SVG 結構取代目前同心圓 SVG**

保留 `<div className="hero-visual">`，將其內容替換為：

```jsx
<svg className="wafer-visual" viewBox="0 0 200 200" aria-hidden="true">
  <defs>
    <clipPath id="wafer-clip">
      <circle cx="100" cy="100" r="78" />
    </clipPath>
    <pattern id="wafer-dies" width="14" height="14" patternUnits="userSpaceOnUse">
      <rect width="12" height="12" x="1" y="1" className="wafer-die" />
    </pattern>
  </defs>
  <circle className="wafer-rim" cx="100" cy="100" r="80" />
  <circle className="wafer-surface" cx="100" cy="100" r="78" />
  <rect className="wafer-die-grid" x="22" y="22" width="156" height="156" clipPath="url(#wafer-clip)" />
  <g clipPath="url(#wafer-clip)">
    <rect className="wafer-defect wafer-defect-a" x="58" y="58" width="12" height="12" />
    <rect className="wafer-defect wafer-defect-b" x="128" y="86" width="12" height="12" />
    <rect className="wafer-defect wafer-defect-c" x="100" y="128" width="12" height="12" />
  </g>
  <path className="wafer-notch" d="M92 21h16l-8 8z" />
</svg>
```

- [ ] **Step 2: 保留 SVG 為純裝飾**

確認 `aria-hidden="true"` 存在，且不在 SVG 內加入可聚焦元素、事件處理器或文字節點。

- [ ] **Step 3: 以本機預覽確認**

在同一個 Vite 預覽中確認晶圓為圓形、die 格線與三個缺陷皆只出現在圓形晶圓內，Hero 文字、系統狀態與工具卡點擊行為不受影響。

- [ ] **Step 4: Commit**

```powershell
git add src/App.jsx
git commit -m "feat: add animated wafer hero"
```

### Task 3: 加入最小暗色動畫與可及性保護

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: 將既有 Hero 視覺 CSS 的 SVG selector 改為晶圓 selector**

以以下規則取代 `.hero-visual-svg`：

```css
.wafer-visual {
  width: 250px;
  height: 250px;
  transform-box: fill-box;
  transform-origin: center;
  animation: wafer-rotate 32s linear infinite;
}

.hero-visual { animation: none; }
.wafer-rim { fill: #101826; stroke: rgba(103, 232, 249, .65); stroke-width: 1.5; }
.wafer-surface { fill: #070b12; stroke: rgba(255, 255, 255, .16); }
.wafer-die { fill: #182230; stroke: rgba(255, 255, 255, .13); stroke-width: .45; }
.wafer-die-grid { fill: url(#wafer-dies); }
.wafer-defect { fill: #f8fafc; animation: wafer-defect 3.6s steps(2, end) infinite; }
.wafer-defect-b { fill: #020617; animation-delay: 1.2s; }
.wafer-defect-c { fill: var(--accent-cyan); animation-delay: 2.4s; }
.wafer-notch { fill: #020617; }

@keyframes wafer-rotate {
  to { transform: rotate(360deg); }
}

@keyframes wafer-defect {
  50% { fill: #020617; opacity: .35; }
}
```

- [ ] **Step 2: 提升最新更新與展開按鈕的視覺層級**

在 changelog 規則旁新增：

```css
.changelog-card { border-color: rgba(6, 182, 212, .32); }
.changelog-latest { padding: 16px; border: 1px solid rgba(6, 182, 212, .4); border-radius: 12px; background: rgba(6, 182, 212, .08); }
.changelog-latest .changelog-version { color: var(--accent-cyan); font-size: 1.1rem; }
.changelog-toggle { align-self: flex-start; margin-top: 14px; padding: 8px 12px; border: 1px solid rgba(255, 255, 255, .15); border-radius: 8px; background: transparent; color: var(--text-primary); cursor: pointer; }
.changelog-toggle:hover, .changelog-toggle:focus-visible { border-color: var(--accent-cyan); color: var(--accent-cyan); outline: none; }
```

調整 `.changelog-list`：移除 `max-height: 140px` 與 `overflow-y: auto`，使展開內容完整可讀。

- [ ] **Step 3: 加入 reduced-motion 保護**

```css
@media (prefers-reduced-motion: reduce) {
  .wafer-visual,
  .wafer-defect {
    animation: none;
  }
}
```

- [ ] **Step 4: 建置驗證**

Run: `npm run build`

Expected: Vite 完成 production build，沒有 JSX、CSS 或模組解析錯誤。

- [ ] **Step 5: Commit**

```powershell
git add src/index.css
git commit -m "style: emphasize release radar and wafer motion"
```

### Task 4: 最終行為驗證

**Files:**
- Verify: `src/App.jsx`
- Verify: `src/index.css`

- [ ] **Step 1: 重跑 production build**

Run: `npm run build`

Expected: 結束碼為 0。

- [ ] **Step 2: 檢查變更範圍**

Run: `git diff main...HEAD -- src/App.jsx src/index.css`

Expected: 僅包含 5/7 首列、最新更新展開互動、晶圓 SVG 與對應 CSS。

- [ ] **Step 3: 檢查工作區**

Run: `git status --short --branch`

Expected: `## feat/release-radar-wafer` 且沒有未提交變更。
