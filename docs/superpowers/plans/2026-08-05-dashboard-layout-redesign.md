# Dashboard Layout Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize T5830 dashboard layouts so the full-width stacked time chart comes first, product-specific sunburst/tree cards use a responsive grid, and the existing Python-style pivot tables remain together at the bottom.

**Architecture:** Keep all current data calculations and component boundaries. Add semantic layout classes around existing chart, sunburst, tree, and pivot content; make `SunburstTab` render one product card containing its own `SingleSunburst` and `SunburstTree`; make `OverviewTab` compose full-width chart, sunburst card grid, and two pivot tables without moving calculation logic into new abstractions.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Testing Library, CSS Grid, existing SVG and PivotTable components.

---

### Task 1: Recompose the overview layout

**Files:**
- Modify: `tool/T5830_TTO/src/features/dashboard/OverviewTab.tsx`
- Modify: `tool/T5830_TTO/src/styles/global.css`
- Test: `tool/T5830_TTO/src/features/dashboard/DashboardPage.test.tsx`

- [ ] **Step 1: Add a failing layout assertion**

Extend the existing DashboardPage test that renders the dashboard so it switches to `核心戰情總覽` and asserts these semantic containers exist in order:

```tsx
const panel = screen.getByRole('tabpanel');
const chart = within(panel).getByRole('region', { name: '跨產品時間結構對比' });
const sunbursts = within(panel).getByRole('region', { name: '總體測試時間結構' });
const pivots = within(panel).getByRole('region', { name: '時間與次數樞紐分析總表' });

expect(panel.compareDocumentPosition(chart) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
expect(chart.compareDocumentPosition(sunbursts) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
expect(sunbursts.compareDocumentPosition(pivots) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
```

Add `within` to the Testing Library import. Give the existing chart, sunburst, and pivot wrappers the matching `role="region"` and accessible names in the implementation.

- [ ] **Step 2: Run the focused test and verify the new assertion fails**

Run:

```powershell
Set-Location 'C:\D_BACKUP\AI_Project\web_app\PP00_Portal\tool\T5830_TTO'
npm run test:run -- src/features/dashboard/DashboardPage.test.tsx
```

Expected: the new region lookup fails because the current overview uses an anonymous two-column inline grid and does not expose the requested section boundaries.

- [ ] **Step 3: Move the existing overview sections into the approved order**

In `OverviewTab.tsx`:

- Keep KPI cards at the top.
- Replace the current two-column chart/sunburst wrapper with three semantic containers in this order:
  1. `overview-chart-section` for the stacked chart.
  2. `overview-sunburst-section` for `<SunburstTab rows={rawRows} mapping={mapping} />`.
  3. `overview-pivot-section` containing the existing time and count `<PivotTable>` calls.
- Keep the chart calculation and SVG body unchanged.
- Remove the old `gridTemplateColumns: '1.2fr 0.8fr'` wrapper and the nested chart/sunburst split.
- Add headings that identify each section without duplicating the tab title.

- [ ] **Step 4: Add the minimum shared CSS for the overview**

In `global.css`, add:

```css
.overview-chart-section,
.overview-sunburst-section,
.overview-pivot-section {
  width: 100%;
  margin: 18px 0;
}

.overview-chart-section {
  overflow-x: auto;
}

.overview-pivot-section {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

@media (max-width: 900px) {
  .overview-pivot-section {
    grid-template-columns: 1fr;
  }
}
```

The stacked chart remains horizontally scrollable when its SVG needs more width; the section itself still occupies the full content frame.

- [ ] **Step 5: Run the focused test and verify it passes**

Run:

```powershell
Set-Location 'C:\D_BACKUP\AI_Project\web_app\PP00_Portal\tool\T5830_TTO'
npm run test:run -- src/features/dashboard/DashboardPage.test.tsx
```

Expected: all DashboardPage tests pass.

- [ ] **Step 6: Commit the overview composition**

```powershell
Set-Location 'C:\D_BACKUP\AI_Project\web_app\PP00_Portal'
git add tool/T5830_TTO/src/features/dashboard/OverviewTab.tsx tool/T5830_TTO/src/features/dashboard/DashboardPage.test.tsx tool/T5830_TTO/src/styles/global.css
git commit -m "refactor: structure dashboard overview sections"
```

### Task 2: Pair every sunburst with its own relation tree

**Files:**
- Modify: `tool/T5830_TTO/src/features/dashboard/SunburstTab.tsx`
- Modify: `tool/T5830_TTO/src/styles/global.css`
- Test: `tool/T5830_TTO/src/features/dashboard/SunburstTab.test.tsx`

- [ ] **Step 1: Add a failing product-card assertion**

Update `SunburstTab.test.tsx` to assert the product card and its tree are in the same container:

```tsx
const productCard = screen.getByRole('article', { name: 'EAG119 旭日圖與關聯樹' });
expect(within(productCard).getByRole('img', { name: /EAG119 旭日圖/ })).toBeVisible();
expect(within(productCard).getByRole('region', { name: 'EAG119 關聯樹' })).toBeVisible();
```

Add `within` to the Testing Library import and add `aria-label="EAG119 旭日圖與關聯樹"` plus `role="article"` to the product card implementation.

- [ ] **Step 2: Run the focused Sunburst test and verify it fails**

Run:

```powershell
Set-Location 'C:\D_BACKUP\AI_Project\web_app\PP00_Portal\tool\T5830_TTO'
npm run test:run -- src/features/dashboard/SunburstTab.test.tsx
```

Expected: the product card lookup fails because the current component renders all sunbursts first and all trees afterward.

- [ ] **Step 3: Render one product card per product**

In `SunburstTab.tsx`:

- Add a `sunburst-product-grid` wrapper around the product map.
- For each product, render:

```tsx
<article className="sunburst-product-card" aria-label={`${product} 旭日圖與關聯樹`}>
  <SingleSunburst ... />
  <SunburstTree ... />
</article>
```

- Remove the separate second `products.map()` that currently renders all trees after all charts.
- Keep `SingleSunburst` chart calculations and `SunburstTree` data/interaction behavior unchanged.
- Replace the chart's inline `display: inline-block` layout with a class on its root so the card controls width and alignment.

- [ ] **Step 4: Add responsive product-card styles**

In `global.css`, add:

```css
.sunburst-product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 18px;
}

.sunburst-product-card {
  min-width: 0;
  padding: 16px;
  background: rgba(7, 22, 39, .45);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.sunburst-product-card .sunburst-chart {
  display: grid;
  justify-items: center;
}

.sunburst-product-card .sunburst-tree {
  margin-top: 16px;
}

@media (max-width: 520px) {
  .sunburst-product-grid {
    grid-template-columns: 1fr;
  }
}
```

Use the existing CSS variables and keep the tree's current indentation styles.

- [ ] **Step 5: Run Sunburst tests and the related dashboard tests**

Run:

```powershell
Set-Location 'C:\D_BACKUP\AI_Project\web_app\PP00_Portal\tool\T5830_TTO'
npm run test:run -- src/features/dashboard/SunburstTab.test.tsx src/features/dashboard/SunburstTree.test.tsx src/features/dashboard/DashboardPage.test.tsx
```

Expected: all selected tests pass, including the existing tree expansion behavior.

- [ ] **Step 6: Commit the paired product cards**

```powershell
Set-Location 'C:\D_BACKUP\AI_Project\web_app\PP00_Portal'
git add tool/T5830_TTO/src/features/dashboard/SunburstTab.tsx tool/T5830_TTO/src/features/dashboard/SunburstTab.test.tsx tool/T5830_TTO/src/styles/global.css
git commit -m "refactor: pair sunburst charts with relation trees"
```

### Task 3: Preserve Python-style pivot tables in the overview

**Files:**
- Modify: `tool/T5830_TTO/src/features/dashboard/OverviewTab.tsx`
- Modify: `tool/T5830_TTO/src/styles/global.css`
- Test: `tool/T5830_TTO/src/features/dashboard/DashboardPage.test.tsx`

- [ ] **Step 1: Add assertions for both pivot tables**

In the overview test, assert the pivot section contains both existing table labels:

```tsx
const pivotSection = screen.getByRole('region', { name: '時間與次數樞紐分析總表' });
expect(within(pivotSection).getByRole('region', { name: 'Pivot Table Time' })).toBeVisible();
expect(within(pivotSection).getByRole('region', { name: 'Pivot Table Count' })).toBeVisible();
```

The tests should not assert a new data model or new numbers; `PivotTable` remains the source of truth for Python-style metadata rows, heatmap cells, collapse behavior, and Excel export.

- [ ] **Step 2: Keep the existing PivotTable calls and only wrap them**

In `OverviewTab.tsx`, keep these calls unchanged:

```tsx
<PivotTable rows={rows} valueField="Grand_Total_Time" />
<PivotTable rows={rows} valueField="Total_Merged_Count" />
```

Place them as direct children of `overview-pivot-section`; do not replace them with a new table implementation and do not change `PivotTable.tsx`.

- [ ] **Step 3: Verify PivotTable behavior remains intact**

Run:

```powershell
Set-Location 'C:\D_BACKUP\AI_Project\web_app\PP00_Portal\tool\T5830_TTO'
npm run test:run -- src/features/dashboard/DashboardPage.test.tsx src/features/dashboard/PivotTable.test.tsx
```

Expected: existing PivotTable tests and DashboardPage tests pass, including collapse and export behavior.

- [ ] **Step 4: Commit the pivot layout**

```powershell
Set-Location 'C:\D_BACKUP\AI_Project\web_app\PP00_Portal'
git add tool/T5830_TTO/src/features/dashboard/OverviewTab.tsx tool/T5830_TTO/src/features/dashboard/DashboardPage.test.tsx tool/T5830_TTO/src/styles/global.css
git commit -m "style: preserve pivot tables in overview grid"
```

### Task 4: Rebuild deployment output and run the full verification

**Files:**
- Modify: `tool/T5830_TTO/dist/index.html`
- Create/rename: `tool/T5830_TTO/dist/assets/index-*.js`
- Create/rename: `tool/T5830_TTO/dist/assets/index-*.css`

- [ ] **Step 1: Run the complete existing T5830 test suite**

```powershell
Set-Location 'C:\D_BACKUP\AI_Project\web_app\PP00_Portal\tool\T5830_TTO'
npm run test:run
```

Expected: all existing test files pass.

- [ ] **Step 2: Build the production bundle**

```powershell
Set-Location 'C:\D_BACKUP\AI_Project\web_app\PP00_Portal\tool\T5830_TTO'
npm run build
```

Expected: TypeScript emits no errors and Vite writes a new `dist/index.html` plus hashed JavaScript and CSS assets.

- [ ] **Step 3: Confirm the Portal entry points to the new assets**

```powershell
Set-Location 'C:\D_BACKUP\AI_Project\web_app\PP00_Portal'
Select-String -Path tool\T5830_TTO\dist\index.html -Pattern 'assets/index-.*\.(js|css)'
git diff --check
```

Expected: `dist/index.html` references the newly generated asset names and `git diff --check` has no output.

- [ ] **Step 4: Commit the deployment bundle**

```powershell
Set-Location 'C:\D_BACKUP\AI_Project\web_app\PP00_Portal'
git add tool/T5830_TTO/dist
git commit -m "build: refresh dashboard layout bundle"
```

### Self-review checklist

- [ ] The overview chart is the first full-width visual section after KPI cards.
- [ ] Sunburst products render in a responsive grid, and each card contains its own tree.
- [ ] The two overview pivot tables remain existing `PivotTable` components and preserve Python-style output.
- [ ] The standalone `多維度旭日圖` tab uses the same paired-card layout.
- [ ] Empty states, filters, Mapping behavior, exports, and encrypted-file handling remain unchanged.
- [ ] No new dependency or UI abstraction is introduced.
