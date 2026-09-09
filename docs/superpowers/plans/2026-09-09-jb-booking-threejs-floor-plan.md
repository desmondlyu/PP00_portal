# JB Booking Three.js Floor Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將 JB Booking Floor Plan 的純視覺層改為本地 Three.js 等角立體機台場景，移除目前圖片機台與工程師人物效果，同時保留原有機台 mapping、預約狀態與 click flow。

**Architecture:** `renderFloorPlan(date)` 仍負責取得既有資料並建立 DOM fallback／文字 overlay；新增的 `floor-plan-3d.js` 只接收已整理好的展示資料，建立與銷毀 Three.js scene、mesh、hover 與 responsive renderer。既有 machine button 保留為透明、可存取的點擊層，點擊仍直接呼叫原本的 `openAppointmentModal(slot.tester, dateStr)`。

**Tech Stack:** 原生 JavaScript、Three.js ES module（本地 vendor）、WebGLRenderer、OrthographicCamera、BoxGeometry、MeshStandardMaterial、Raycaster、既有 CSS／Node contract tests／Playwright 預覽。

---

## 檔案責任與變更邊界

### 新增

- `tool/JB_booking/static/js/floor-plan-3d.js`
  - 唯一的 Three.js presentation module。
  - 不讀取 `appointments`、不呼叫 API、不呼叫 modal。
  - 接收機台展示資料與 callback，回傳 `destroy()`、`setHovered()`、`resize()` 介面。
- `tool/JB_booking/static/js/vendor/three.module.js`
  - 本地 Three.js module，避免 CDN／外部網路依賴。
- `tool/JB_booking/static/js/vendor/three.core.js`
  - `three.module.js` 在目前 Three.js 版本使用的同目錄 core module 依賴。
- `tool/JB_booking/design-preview/threejs-floor-contract.test.mjs`
  - 驗證既有 21 個 slot、座標、尺寸、預約契約與 Three.js 整合邊界。

### 修改

- `tool/JB_booking/static/js/app.js`
  - 只修改 `renderFloorPlan()` 與其附近的 Floor Plan presentation state。
  - 移除工程師與圖片展示 markup。
  - 保留 `machineAppointments`、`has-booking`、`slot` 座標、既有文字與 `openAppointmentModal`。
- `tool/JB_booking/static/css/style.css`
  - 移除目前機台圖片、UF／點針座圖片、工程師 sprite／動畫規則。
  - 新增 Three.js canvas、透明 button overlay、DOM label overlay、hover／fallback 與 responsive 規則。

### 不修改

- `tool/JB_booking/index.html`
- `tool/JB_booking/static/js/config.js`
- `FLOOR_PLAN_TESTER_SLOTS`
- `FLOOR_PLAN_BLOCK_SIZE`
- `FLOOR_PLAN_STATIC_BLOCKS`
- API、backend、資料 schema、Calendar、權限與其他 UI。

## Task 1: 建立 Three.js 本地 module 與可測試的場景介面

**Files:**
- Create: `tool/JB_booking/static/js/vendor/three.module.js`
- Create: `tool/JB_booking/static/js/floor-plan-3d.js`
- Create: `tool/JB_booking/design-preview/threejs-floor-contract.test.mjs`

- [ ] **Step 1: 建立 Three.js 暫存來源並只複製 runtime module**

在隔離工作樹內建立暫存目錄，使用 package manager 取得 Three.js，將 `build/three.module.js` 複製至 vendor 路徑；不要修改根目錄 `package.json` 或 lockfile。

```powershell
$staging = '.threejs-staging'
New-Item -ItemType Directory -Force $staging | Out-Null
npm pack three --pack-destination $staging --silent
$tarball = Get-ChildItem $staging -Filter 'three-*.tgz' | Select-Object -First 1
tar -xzf $tarball.FullName -C $staging
Copy-Item "$staging\package\build\three.module.js" `
  "tool\JB_booking\static\js\vendor\three.module.js" -Force
Copy-Item "$staging\package\build\three.core.js" `
  "tool\JB_booking\static\js\vendor\three.core.js" -Force
Remove-Item $staging -Recurse -Force
```

預期結果：只新增 `static/js/vendor/three.module.js`，`package.json`、`package-lock.json` 與其他工具沒有差異。

- [ ] **Step 2: 先寫 Three.js presentation module 的契約測試**

在 `threejs-floor-contract.test.mjs` 先驗證模組的公開介面名稱與不可越界的 source contract：

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const appSource = readFileSync(
    new URL('../static/js/app.js', import.meta.url),
    'utf8',
);
const layout = vm.runInNewContext(
    appSource.slice(0, appSource.indexOf('const LOCAL_CLIENT_ID_KEY')) +
    ';({ slots: FLOOR_PLAN_TESTER_SLOTS, size: FLOOR_PLAN_BLOCK_SIZE })',
    { window: {} },
);

assert.equal(layout.slots.length, 21);
assert.equal(new Set(layout.slots.map(({ tester }) => tester)).size, 21);
assert.deepEqual(layout.size, { w: 7.8, h: 7.2 });

const floorPlan3dSource = readFileSync(
    new URL('../static/js/floor-plan-3d.js', import.meta.url),
    'utf8',
);
for (const required of [
    'OrthographicCamera',
    'WebGLRenderer',
    'BoxGeometry',
    'Raycaster',
    'destroy',
    'setHovered',
]) {
    assert.match(floorPlan3dSource, new RegExp(required));
}
assert.doesNotMatch(floorPlan3dSource, /appointments|openAppointmentModal|supabase/i);
console.log('Three.js presentation contract and 21-machine layout passed.');
```

- [ ] **Step 3: 實作 `createFloorPlan3D(options)` 的最小介面**

在 `floor-plan-3d.js` 使用本地 module import，公開單一建立函式。資料型別與介面固定如下：

```js
import * as THREE from './vendor/three.module.js';

export function createFloorPlan3D({
    host,
    machines,
    staticBlocks,
    onHover,
}) {
    // 建立 renderer、scene、camera、lights、ground 與 machine meshes。
    // 不讀取 booking global，不呼叫 booking function。
    return {
        destroy() {},
        setHovered(tester) {},
        resize() {},
    };
}
```

`machines` 每筆只包含：

```js
{
    tester: slot.tester,
    x: slot.x,
    y: slot.y,
    width: FLOOR_PLAN_BLOCK_SIZE.w,
    height: FLOOR_PLAN_BLOCK_SIZE.h,
    booked: machineAppointments.length > 0,
    model: slot.tester.startsWith('Ms') ? 'ms' : 't',
}
```

先完成 scene 初始化與空方法，再執行：

```powershell
node tool/JB_booking/design-preview/threejs-floor-contract.test.mjs
```

預期結果：測試通過，且尚未要求 browser render。

- [ ] **Step 4: Commit 這個獨立 presentation module**

```powershell
git add tool/JB_booking/static/js/vendor/three.module.js `
  tool/JB_booking/static/js/floor-plan-3d.js `
  tool/JB_booking/design-preview/threejs-floor-contract.test.mjs
git commit -m "feat: add local threejs floor plan module"
```

## Task 2: 建立等角地板與機台 mesh

**Files:**
- Modify: `tool/JB_booking/static/js/floor-plan-3d.js`
- Modify: `tool/JB_booking/design-preview/threejs-floor-contract.test.mjs`

- [ ] **Step 1: 寫 geometry 與狀態呈現的契約測試**

在測試加入可由 source contract 驗證的規則：

```js
for (const required of [
    'createMachineMesh',
    'createGround',
    'MeshStandardMaterial',
    'machine.userData.tester',
    'machine.userData.booked',
    'machine.userData.model',
]) {
    assert.match(floorPlan3dSource, new RegExp(required.replace('.', '\\.')));
}
```

測試仍先失敗，直到這些 helper 與 userData 實作完成。

- [ ] **Step 2: 實作固定等角鏡頭與 renderer**

使用容器尺寸建立 `OrthographicCamera`，避免以 viewport 尺寸破壞原 Floor Plan 版面：

```js
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07111c);

const camera = new THREE.OrthographicCamera(-14, 14, 10, -10, 0.1, 100);
camera.position.set(0, 18, 18);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(host.clientWidth, host.clientHeight, false);
renderer.domElement.className = 'floor-plan-3d-canvas';
host.appendChild(renderer.domElement);
```

加入低強度環境光、方向光與陰影設定；不加入自動旋轉動畫。

- [ ] **Step 3: 實作地板、走道與靜態框架的 3D presentation**

以既有 static block 資料為來源，但不改資料陣列。`frame` 與 `walkway` 建立低高度平面／薄盒，`frame-label` 保留 DOM 文字：

```js
function createGround(scene) {
    const geometry = new THREE.PlaneGeometry(24, 18);
    const material = new THREE.MeshStandardMaterial({
        color: 0x102131,
        roughness: 0.92,
        metalness: 0.08,
    });
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.12;
    ground.receiveShadow = true;
    scene.add(ground);
}
```

走道只做低對比色帶與細網格，不把 `FLOOR_PLAN_STATIC_BLOCKS` 重新計算成另一份 mapping。

- [ ] **Step 4: 實作 T／Ms 立體機台 mesh**

`createMachineMesh(machine)` 必須讓兩種外型可辨識，但不能使用使用者圖片：

```js
function createMachineMesh(machine) {
    const isMs = machine.model === 'ms';
    const width = isMs ? 1.45 : 1.05;
    const depth = isMs ? 0.9 : 0.78;
    const height = isMs ? 1.1 : 1.55;
    const color = machine.booked ? 0xf09a42 : 0x36b9dd;

    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, depth),
        new THREE.MeshStandardMaterial({
            color,
            roughness: 0.48,
            metalness: 0.42,
            emissive: machine.booked ? 0x301406 : 0x06202a,
            emissiveIntensity: 0.28,
        }),
    );
    mesh.userData.tester = machine.tester;
    mesh.userData.booked = machine.booked;
    mesh.userData.model = machine.model;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}
```

使用 `slot.x`／`slot.y` 轉換到固定地板座標，並將 mesh 保存於 `Map(tester -> mesh)`；不得以陣列索引重新排序機台。

- [ ] **Step 5: 實作 Raycaster hover 與渲染**

採用 Three.js 官方 normalized pointer pattern；hover 只呼叫 `onHover(tester)` 與 `setHovered()`，不修改預約資料：

```js
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hovered = null;

function handlePointerMove(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(machineMeshes, false)[0];
    const tester = hit?.object.userData.tester || null;
    if (tester !== hovered) {
        hovered = tester;
        onHover(tester);
    }
}
```

只有在 pointer 或 resize 事件後重繪；不建立無限動畫 loop。

- [ ] **Step 6: 實作 `destroy()` 與 responsive `resize()`**

`destroy()` 必須移除 event listeners、renderer canvas、geometry 與 material；`resize()` 依 host 寬高更新 renderer 與 orthographic frustum。測試與 lint 前先執行：

```powershell
node --check tool/JB_booking/static/js/floor-plan-3d.js
node tool/JB_booking/design-preview/threejs-floor-contract.test.mjs
```

- [ ] **Step 7: Commit 3D scene**

```powershell
git add tool/JB_booking/static/js/floor-plan-3d.js `
  tool/JB_booking/design-preview/threejs-floor-contract.test.mjs
git commit -m "feat: render jb machines as threejs blocks"
```

## Task 3: 接回 `renderFloorPlan()` 並保留既有 booking click layer

**Files:**
- Modify: `tool/JB_booking/static/js/app.js`
- Modify: `tool/JB_booking/static/css/style.css`
- Modify: `tool/JB_booking/design-preview/threejs-floor-contract.test.mjs`

- [ ] **Step 1: 先加入 integration contract assertions**

測試確認 app source 保留不可變契約，並且不再產生人物／圖片展示 markup：

```js
assert.match(appSource, /appointments\[dateStr\]\[slot\.tester\]/);
assert.match(appSource, /machineAppointments\.length > 0/);
assert.match(appSource, /openAppointmentModal\(slot\.tester, dateStr\)/);
assert.match(appSource, /FLOOR_PLAN_BLOCK_SIZE\.w/);
assert.match(appSource, /FLOOR_PLAN_BLOCK_SIZE\.h/);
assert.doesNotMatch(appSource, /animateFloorEngineer|engineer-running|tester-machine-reference/);
```

執行測試，確認在整合前會因人物／圖片引用仍存在而失敗。

- [ ] **Step 2: 建立可重用的 module loader 與 instance state**

在 `app.js` Floor Plan 全域 state 附近保留 render token，新增：

```js
let floorPlan3dInstance = null;
let floorPlan3dModulePromise = null;

function loadFloorPlan3DModule() {
    if (!floorPlan3dModulePromise) {
        floorPlan3dModulePromise = import('./floor-plan-3d.js');
    }
    return floorPlan3dModulePromise;
}
```

若 module import 失敗，catch 只記錄 presentation error 並保留 DOM overlay；不得 catch API 或 booking error。

- [ ] **Step 3: 改寫 `renderFloorPlan()` 的 presentation container**

在 `floorPlanCanvas.innerHTML = ''` 後建立：

```js
const stage = document.createElement('div');
stage.className = 'floor-plan-stage';

const threeHost = document.createElement('div');
threeHost.className = 'floor-plan-3d-host';
stage.appendChild(threeHost);

const labelLayer = document.createElement('div');
labelLayer.className = 'floor-plan-label-layer';
stage.appendChild(labelLayer);

floorPlanCanvas.appendChild(stage);
```

既有 `FLOOR_PLAN_STATIC_BLOCKS` 與 exit label 仍插入 `labelLayer`，文字來源、百分比位置與 label 內容不改。

- [ ] **Step 4: 建立 machine display records 並保留透明 button overlay**

將既有 `layout.forEach` 保留為唯一機台 mapping 迴圈；只將 innerHTML 改成文字優先的純 DOM overlay，不再插入 image、status light 或 engineer 元素：

```js
const machineRecords = [];

layout.forEach((slot) => {
    const machineAppointments = dateAppointments[slot.tester] || [];
    const block = document.createElement('button');
    const hasBooking = machineAppointments.length > 0;
    block.type = 'button';
    block.className = `tester-block ${hasBooking ? 'has-booking' : ''}`;
    block.style.left = `${slot.x}%`;
    block.style.top = `${slot.y}%`;
    block.style.width = `${FLOOR_PLAN_BLOCK_SIZE.w}%`;
    block.style.height = `${FLOOR_PLAN_BLOCK_SIZE.h}%`;
    block.setAttribute('aria-label', `${slot.tester} ${hasBooking ? `${machineAppointments.length} 筆預約` : '可預約'}`);
    block.innerHTML = `
        <span class="tester-block-name">${slot.tester}</span>
        <span class="tester-block-status">${hasBooking ? `${machineAppointments.length} 筆預約` : '可預約'}</span>
    `;
    block.addEventListener('mouseenter', () => floorPlan3dInstance?.setHovered(slot.tester));
    block.addEventListener('mouseleave', () => floorPlan3dInstance?.setHovered(null));
    block.addEventListener('click', () => openAppointmentModal(slot.tester, dateStr));
    labelLayer.appendChild(block);

    machineRecords.push({
        tester: slot.tester,
        x: slot.x,
        y: slot.y,
        width: FLOOR_PLAN_BLOCK_SIZE.w,
        height: FLOOR_PLAN_BLOCK_SIZE.h,
        booked: hasBooking,
        model: slot.tester.startsWith('Ms') ? 'ms' : 't',
    });
});
```

不得把 3D module callback 接到 `openAppointmentModal`；click handler 仍由 DOM button 直接負責。

- [ ] **Step 5: 非同步建立 Three.js instance 並防止 stale render**

在 machine records 完成後：

```js
const activeToken = floorPlanRenderToken;
loadFloorPlan3DModule()
    .then(({ createFloorPlan3D }) => {
        if (activeToken !== floorPlanRenderToken || !stage.isConnected) return;
        floorPlan3dInstance?.destroy();
        floorPlan3dInstance = createFloorPlan3D({
            host: threeHost,
            machines: machineRecords,
            staticBlocks: FLOOR_PLAN_STATIC_BLOCKS,
            onHover: (tester) => {
                labelLayer.querySelectorAll('.tester-block').forEach((button) => {
                    button.classList.toggle('is-hovered', button.querySelector('.tester-block-name')?.textContent === tester);
                });
            },
        });
    })
    .catch((error) => {
        console.error('Floor Plan 3D presentation failed; retaining DOM fallback.', error);
    });
```

render 前先 `floorPlan3dInstance?.destroy()` 並設為 `null`，避免日期切換留下舊 canvas／事件。

- [ ] **Step 6: 執行 integration contract**

```powershell
node --check tool/JB_booking/static/js/app.js
node tool/JB_booking/design-preview/threejs-floor-contract.test.mjs
```

預期結果：21 台機台、既有座標／尺寸、預約 lookup、`has-booking` 與原 modal 呼叫全部通過；人物與圖片引用不存在。

- [ ] **Step 7: Commit presentation integration**

```powershell
git add tool/JB_booking/static/js/app.js `
  tool/JB_booking/design-preview/threejs-floor-contract.test.mjs
git commit -m "feat: connect threejs floor view to existing booking layout"
```

## Task 4: 更新 CSS、清理舊視覺資產引用與 responsive fallback

**Files:**
- Modify: `tool/JB_booking/static/css/style.css`
- Modify: `tool/JB_booking/design-preview/threejs-floor-contract.test.mjs`

- [ ] **Step 1: 寫 CSS contract**

加入 source assertions：

```js
const cssSource = readFileSync(
    new URL('../static/css/style.css', import.meta.url),
    'utf8',
);
assert.match(cssSource, /\.floor-plan-3d-host/);
assert.match(cssSource, /\.floor-plan-3d-canvas/);
assert.match(cssSource, /\.floor-plan-label-layer/);
assert.match(cssSource, /@media \(max-width: 768px\)/);
assert.doesNotMatch(cssSource, /engineer-running|tester-machine-reference|floor-equipment-reference/);
```

- [ ] **Step 2: 移除舊圖片／人物 CSS**

刪除以下規則及其動畫：`.floor-plan-engineer`、`.floor-engineer-*`、`.floor-device-art`、`.tester-machine-illustration`、`.tester-machine-status-light` 及人物 keyframes；不要改動其他頁面樣式。

- [ ] **Step 3: 新增 Three.js host 與 DOM label CSS**

```css
.floor-plan-stage {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 620px;
    overflow: hidden;
    border-radius: 10px;
}

.floor-plan-3d-host,
.floor-plan-label-layer {
    position: absolute;
    inset: 0;
}

.floor-plan-3d-host {
    z-index: 1;
}

.floor-plan-3d-canvas {
    display: block;
    width: 100%;
    height: 100%;
}

.floor-plan-label-layer {
    z-index: 2;
    pointer-events: none;
}

.floor-plan-label-layer .tester-block,
.floor-plan-label-layer .floor-static-block,
.floor-plan-label-layer .exit-marker {
    pointer-events: auto;
}

.tester-block {
    border: 1px solid rgba(90, 205, 239, 0.42);
    background: rgba(7, 19, 32, 0.82);
    box-shadow: 0 5px 14px rgba(0, 0, 0, 0.42);
    transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
}

.tester-block.is-hovered,
.tester-block:hover,
.tester-block:focus-visible {
    transform: translateY(-3px);
    border-color: #80e4ff;
    box-shadow: 0 9px 22px rgba(0, 0, 0, 0.58), 0 0 14px rgba(71, 207, 247, 0.2);
}
```

不要讓 canvas 疊在透明 button 之上攔截 click；label layer 必須保持點擊層可用。

- [ ] **Step 4: 保留原手機版捲動與可讀性**

在既有手機 media query 中，只調整 Floor Plan host 的最小尺寸與 label 字級：

```css
@media (max-width: 768px) {
    .floor-plan-stage {
        min-width: 900px;
        min-height: 560px;
    }

    .tester-block-name,
    .tester-block-status {
        font-size: 0.68rem;
    }
}
```

不要刪除原有 `min-width: 900px`／horizontal scroll 行為。

- [ ] **Step 5: 執行 CSS／syntax contract**

```powershell
node --check tool/JB_booking/static/js/app.js
node tool/JB_booking/design-preview/threejs-floor-contract.test.mjs
git diff --check
```

- [ ] **Step 6: Commit CSS presentation**

```powershell
git add tool/JB_booking/static/css/style.css `
  tool/JB_booking/design-preview/threejs-floor-contract.test.mjs
git commit -m "style: replace jb floor images with threejs presentation"
```

## Task 5: 實際瀏覽器驗證與回歸檢查

**Files:**
- Modify only if a defect is found: `tool/JB_booking/static/js/app.js`, `tool/JB_booking/static/js/floor-plan-3d.js`, `tool/JB_booking/static/css/style.css`
- Test: `tool/JB_booking/design-preview/threejs-floor-contract.test.mjs`

- [ ] **Step 1: 啟動隔離預覽服務**

確認 `http://127.0.0.1:4181/` 服務指向 `.worktrees\jb-booking-playful`；若服務停止，從隔離工作樹重新啟動靜態 server，不修改根目錄。

- [ ] **Step 2: 驗證桌面版場景**

在瀏覽器檢查：

1. Floor Plan 顯示一個 Three.js canvas，地板、走道與 21 台 3D 方塊存在。
2. T 系列與 Ms 系列只由 3D 幾何比例／面板細節區分，不再載入任何機台圖片。
3. 工程師人物、idle／running sprite 與移動動畫不存在。
4. 21 個原機台名稱與「可預約／N 筆預約」仍完整可讀。
5. 已預約機台的數量文字與原資料一致。

- [ ] **Step 3: 驗證 hover、click 與原 modal**

分別點選左側與右側機台：

```text
T5833-2(.84)
T5830ES_WBN7(.59)
```

預期：

- hover 只造成 3D／DOM presentation feedback。
- click 後仍直接開啟原「預約資訊輸入」modal。
- modal 的 machine ID 與日期正確。
- 沒有人物移動等待，也沒有改變預約流程。

- [ ] **Step 4: 驗證 re-render、日期切換與 fallback**

在 Three.js 載入或場景顯示期間切換日期／切換卡片模式再回到平面圖，確認：

- 舊 canvas 與事件 handler 被清理。
- 新日期的預約文字正確。
- 沒有舊日期 modal 或 stale callback。
- 以瀏覽器阻擋 module／模擬 WebGL 初始化失敗時，DOM button 仍能點擊開啟 modal。

- [ ] **Step 5: 驗證 responsive**

使用桌面寬度與窄螢幕寬度檢查：

- 不出現頁面級意外水平溢出。
- Floor Plan 仍可依既有策略水平捲動。
- 所有機台 overlay 仍可點擊、文字沒有被 canvas 遮住。

- [ ] **Step 6: 執行完整最小驗證**

```powershell
node --check tool/JB_booking/static/js/app.js
node --check tool/JB_booking/static/js/floor-plan-3d.js
node tool/JB_booking/design-preview/threejs-floor-contract.test.mjs
git diff --check
git -C .worktrees\jb-booking-playful --no-pager diff --name-only HEAD~4..HEAD
```

預期結果：契約、語法與 whitespace 檢查通過；實作提交只涉及 `tool/JB_booking` Floor Plan presentation files 與本地測試，不涉及 API、backend、Calendar 或 config。

- [ ] **Step 7: 更新任務狀態並保留隔離分支**

將 `threejs-floor-implementation` 標記為完成前，確認 git status 中沒有把根目錄使用者既有變更加入提交；不合併、不推送。
