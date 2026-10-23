// PP00 Gather Office — 3D 效果化像素風格 (2.5D Voxel-Pixel) 巨型園區地圖與動態設備引擎
// 已移除中間水族箱、修正會議室卡片重疊、新增會議室A台股大螢幕、廁所開門動畫、電腦/機台吉祥綠藍畫面與隨機狀態

// 台股加權指數盤後行情狀態（嚴格遵守 TAIEX_GitHub_Pages_Integration_Plan.md 與全局規則：
// 使用臺灣證券交易所 TWSE OpenAPI 盤後資料、每 5 分鐘輪詢、絕不標示「即時/Live」、絕不顯示虛構數據、失敗保留上次成功數值）
window.TAIWAN_STOCK_STATE = {
  hasData: true,
  valueText: '46,041.43',
  changeText: '▼ -846.34 (-1.81%)',
  direction: -1, // 1: 上漲(紅), -1: 下跌(綠), 0: 平盤
  dateText: '行情日期：2026/10/22',
  statusText: '最近交易日收盤資料 (TWSE 官方盤後)',
  sourceText: '資料來源：臺灣證券交易所｜最近交易日收盤資料',
};

window.WORLD_MAP = {
  width: 2800,
  height: 1900,
  tileSize: 32,

  // 區域導覽標籤（已精簡用詞，避免超過標牌方塊或遮蔽物件）
  zones: [
    { id: 'vp_room', name: 'VP Office', sub: '大老闆室', x: 380, y: 92, spawnX: 380, spawnY: 350, color: '#f59e0b' },
    { id: 'dir_pp00', name: 'PP00', sub: '處長室', x: 760, y: 92, spawnX: 760, spawnY: 350, color: '#ec4899' },
    { id: 'dir_pp10', name: 'PP10', sub: '主管會議室', x: 1000, y: 92, spawnX: 1000, spawnY: 350, color: '#8b5cf6' },
    { id: 'dir_pp20', name: 'PP20', sub: '主管會議室', x: 1240, y: 92, spawnX: 1240, spawnY: 350, color: '#6366f1' },
    { id: 'dir_pp30', name: 'PP30', sub: '主管會議室', x: 1480, y: 92, spawnX: 1480, spawnY: 350, color: '#3b82f6' },
    { id: 'dir_pp40', name: 'PP40', sub: '主管會議室', x: 1720, y: 92, spawnX: 1720, spawnY: 350, color: '#0ea5e9' },
    { id: 'dir_pp50', name: 'PP50', sub: '主管會議室', x: 1965, y: 92, spawnX: 1965, spawnY: 350, color: '#14b8a6' },
    { id: 'pantry', name: 'Pantry', sub: '茶水休憩區', x: 2400, y: 92, spawnX: 2350, spawnY: 350, color: '#f97316' },
    { id: 'pe_zone', name: 'PE Zone', sub: '產品工程區', x: 640, y: 595, spawnX: 640, spawnY: 840, color: '#0284c7' },
    { id: 'te_zone', name: 'TE Zone', sub: '測試工程區', x: 1660, y: 595, spawnX: 1660, spawnY: 840, color: '#059669' },
    { id: 'restroom', name: 'Restroom', sub: '盥洗室', x: 2420, y: 595, spawnX: 2340, spawnY: 820, color: '#06b6d4' },
    { id: 'meet_a', name: 'Meeting A', sub: '戰情看盤室', x: 410, y: 1775, spawnX: 410, spawnY: 1650, color: '#7c3aed' },
    { id: 'meet_b', name: 'Meeting B', sub: '專案審查室', x: 935, y: 1775, spawnX: 935, spawnY: 1650, color: '#db2777' },
    { id: 'lab_zone', name: 'Lab Zone', sub: '半導體機台區', x: 1960, y: 1775, spawnX: 1820, spawnY: 1520, color: '#10b981' },
  ],

  // 3D 像素立體牆體清單
  walls: [
    { x: 130, y: 40, w: 2580, h: 28, colorTop: '#94a3b8', colorFront: '#475569' },
    { x: 130, y: 40, w: 28, h: 1800, colorTop: '#94a3b8', colorFront: '#475569' },
    { x: 2682, y: 40, w: 28, h: 1800, colorTop: '#94a3b8', colorFront: '#475569' },
    { x: 130, y: 1812, w: 2580, h: 28, colorTop: '#94a3b8', colorFront: '#475569' },

    // 1. VP 大老闆獨立辦公室隔間牆
    { x: 620, y: 68, w: 20, h: 392, colorTop: '#fcd34d', colorFront: '#b45309' },
    { x: 158, y: 440, w: 175, h: 20, colorTop: '#fcd34d', colorFront: '#b45309' },
    { x: 455, y: 440, w: 185, h: 20, colorTop: '#fcd34d', colorFront: '#b45309' },

    // 2. 六位處級主管獨立 BLOCK 空間隔間牆
    { x: 870, y: 68, w: 16, h: 392, colorTop: '#cbd5e1', colorFront: '#64748b' },
    { x: 640, y: 440, w: 75, h: 18, colorTop: '#cbd5e1', colorFront: '#64748b' },
    { x: 795, y: 440, w: 91, h: 18, colorTop: '#cbd5e1', colorFront: '#64748b' },

    { x: 1110, y: 68, w: 16, h: 392, colorTop: '#cbd5e1', colorFront: '#64748b' },
    { x: 886, y: 440, w: 75, h: 18, colorTop: '#cbd5e1', colorFront: '#64748b' },
    { x: 1035, y: 440, w: 91, h: 18, colorTop: '#cbd5e1', colorFront: '#64748b' },

    { x: 1350, y: 68, w: 16, h: 392, colorTop: '#cbd5e1', colorFront: '#64748b' },
    { x: 1126, y: 440, w: 75, h: 18, colorTop: '#cbd5e1', colorFront: '#64748b' },
    { x: 1275, y: 440, w: 91, h: 18, colorTop: '#cbd5e1', colorFront: '#64748b' },

    { x: 1590, y: 68, w: 16, h: 392, colorTop: '#cbd5e1', colorFront: '#64748b' },
    { x: 1366, y: 440, w: 75, h: 18, colorTop: '#cbd5e1', colorFront: '#64748b' },
    { x: 1515, y: 440, w: 91, h: 18, colorTop: '#cbd5e1', colorFront: '#64748b' },

    { x: 1830, y: 68, w: 16, h: 392, colorTop: '#cbd5e1', colorFront: '#64748b' },
    { x: 1606, y: 440, w: 75, h: 18, colorTop: '#cbd5e1', colorFront: '#64748b' },
    { x: 1755, y: 440, w: 91, h: 18, colorTop: '#cbd5e1', colorFront: '#64748b' },

    { x: 2080, y: 68, w: 18, h: 392, colorTop: '#cbd5e1', colorFront: '#64748b' },
    { x: 1846, y: 440, w: 75, h: 18, colorTop: '#cbd5e1', colorFront: '#64748b' },
    { x: 2000, y: 440, w: 98, h: 18, colorTop: '#cbd5e1', colorFront: '#64748b' },

    // 3. 茶水間左隔間半牆
    { x: 2098, y: 440, w: 190, h: 18, colorTop: '#fdba74', colorFront: '#c2410c' },
    { x: 2460, y: 440, w: 222, h: 18, colorTop: '#fdba74', colorFront: '#c2410c' },

    // 4. 廁所獨立空間隔間牆
    { x: 2150, y: 560, w: 532, h: 20, colorTop: '#67e8f9', colorFront: '#0e7490' },
    { x: 2150, y: 560, w: 20, h: 220, colorTop: '#67e8f9', colorFront: '#0e7490' },
    { x: 2150, y: 920, w: 20, h: 200, colorTop: '#67e8f9', colorFront: '#0e7490' },
    { x: 2150, y: 1100, w: 532, h: 20, colorTop: '#67e8f9', colorFront: '#0e7490' },

    // 5. 兩間獨立會議室隔音牆
    { x: 158, y: 1230, w: 180, h: 22, colorTop: '#c4b5fd', colorFront: '#5b21b6' },
    { x: 455, y: 1230, w: 210, h: 22, colorTop: '#c4b5fd', colorFront: '#5b21b6' },
    { x: 665, y: 1230, w: 20, h: 582, colorTop: '#c4b5fd', colorFront: '#5b21b6' },
    { x: 685, y: 1230, w: 185, h: 22, colorTop: '#f9a8d4', colorFront: '#9d174d' },
    { x: 985, y: 1230, w: 195, h: 22, colorTop: '#f9a8d4', colorFront: '#9d174d' },
    { x: 1180, y: 1230, w: 22, h: 582, colorTop: '#94a3b8', colorFront: '#475569' },

    // 6. Lab 半導體實驗室隔間牆
    { x: 1220, y: 1230, w: 460, h: 22, colorTop: '#6ee7b7', colorFront: '#047857' },
    { x: 1920, y: 1230, w: 762, h: 22, colorTop: '#6ee7b7', colorFront: '#047857' },
    { x: 1220, y: 1230, w: 22, h: 582, colorTop: '#6ee7b7', colorFront: '#047857' },
  ],

  directorBlocks: [
    { unit: 'PP00', title: 'PP00 處長室', x: 645, y: 70, w: 225, h: 370, accent: '#ec4899', manager: 'PP00 處長' },
    { unit: 'PP10', title: 'PP10 主管會議室', x: 886, y: 70, w: 224, h: 370, accent: '#8b5cf6', manager: 'PP10 主管會議室' },
    { unit: 'PP20', title: 'PP20 主管會議室', x: 1126, y: 70, w: 224, h: 370, accent: '#6366f1', manager: 'PP20 主管會議室' },
    { unit: 'PP30', title: 'PP30 主管會議室', x: 1366, y: 70, w: 224, h: 370, accent: '#3b82f6', manager: 'PP30 主管會議室' },
    { unit: 'PP40', title: 'PP40 主管會議室', x: 1606, y: 70, w: 224, h: 370, accent: '#0ea5e9', manager: 'PP40 主管會議室' },
    { unit: 'PP50', title: 'PP50 主管會議室', x: 1846, y: 70, w: 234, h: 370, accent: '#14b8a6', manager: 'PP50 主管會議室' },
  ],

  // 4 間可開門走進去上廁所的獨立廁所隔間 (支援開門動畫 doorOpen: 0~1，熱鍵 [E])
  toiletStalls: [
    { id: 'wc_1', name: '1號尊榮馬桶間', x: 2470, y: 605, w: 180, h: 96, seatX: 2595, seatY: 652, doorOpen: 0, occupiedBy: null },
    { id: 'wc_2', name: '2號極速解放間', x: 2470, y: 718, w: 180, h: 96, seatX: 2595, seatY: 765, doorOpen: 0, occupiedBy: null },
    { id: 'wc_3', name: '3號靈感思考間', x: 2470, y: 831, w: 180, h: 96, seatX: 2595, seatY: 878, doorOpen: 0, occupiedBy: null },
    { id: 'wc_4', name: '4號VIP黃金馬桶', x: 2470, y: 944, w: 180, h: 96, seatX: 2595, seatY: 991, doorOpen: 0, occupiedBy: null },
  ],

  // 廁所感應式泡沫洗手台 (支援靠近按 [E] 開水龍頭搓泡泡洗手動畫)
  restroomSinks: [
    { id: 'sink_1', name: '1號感應泡沫洗手台', x: 2230, y: 608, w: 50, h: 28, standX: 2255, standY: 682, waterActive: false },
    { id: 'sink_2', name: '2號潔淨溫水洗手台', x: 2300, y: 608, w: 50, h: 28, standX: 2325, standY: 682, waterActive: false },
  ],

  // 茶水間專屬互動設備點 (靠近按 [E] 觸發喝手沖咖啡提神 / 懶骨頭沙發摸魚打瞌睡)
  pantrySpots: [
    { id: 'pantry_coffee', name: '義式濃縮手沖咖啡吧台', actionId: 'drink_coffee', x: 2295, y: 145, standX: 2295, standY: 205 },
    { id: 'pantry_snack', name: '神聖綠乖乖與茶飲補給吧', actionId: 'drink_coffee', x: 2480, y: 145, standX: 2480, standY: 205 },
    { id: 'pantry_sofa', name: '茶水間懶人沙發摸魚區', actionId: 'slack_nap', x: 2380, y: 295, standX: 2380, standY: 352 },
  ],

  // PE / TE / Lab 動態電腦工作站 (預設全數為吉祥翠綠/青藍正常畫面，支援靠近坐下辦公)
  workstations: [
    { id: 'pe1', zone: 'PE', x: 240, y: 680, w: 160, h: 72, screenState: 'pass', hasLamp: true, hasKuaiKuai: true, owner: 'PE-PP11 產品分析' },
    { id: 'pe2', zone: 'PE', x: 440, y: 680, w: 160, h: 72, screenState: 'wafer', hasLamp: false, hasKuaiKuai: true, owner: 'PE-PP21 特性驗證' },
    { id: 'pe3', zone: 'PE', x: 640, y: 680, w: 160, h: 72, screenState: 'wave', hasLamp: true, hasKuaiKuai: true, owner: 'PE-PP31 良率工程' },
    { id: 'pe4', zone: 'PE', x: 840, y: 680, w: 160, h: 72, screenState: 'pass', hasLamp: false, hasKuaiKuai: true, owner: 'PE-PP41 規格防呆' },
    { id: 'pe5', zone: 'PE', x: 240, y: 920, w: 160, h: 72, screenState: 'wafer', hasLamp: false, hasKuaiKuai: true, owner: 'PE-PP12 CP/FT' },
    { id: 'pe6', zone: 'PE', x: 440, y: 920, w: 160, h: 72, screenState: 'pass', hasLamp: true, hasKuaiKuai: true, owner: 'PE-PP22 溫度分頁' },
    { id: 'pe7', zone: 'PE', x: 640, y: 920, w: 160, h: 72, screenState: 'wave', hasLamp: false, hasKuaiKuai: true, owner: 'PE-PP32 YPLu 座' },
    { id: 'pe8', zone: 'PE', x: 840, y: 920, w: 160, h: 72, screenState: 'pass', hasLamp: true, hasKuaiKuai: true, owner: 'PE-PP42 專案報告' },

    { id: 'te1', zone: 'TE', x: 1280, y: 680, w: 160, h: 72, screenState: 'wave', hasLamp: true, hasKuaiKuai: true, owner: 'TE-PT12 測試程式' },
    { id: 'te2', zone: 'TE', x: 1480, y: 680, w: 160, h: 72, screenState: 'pass', hasLamp: false, hasKuaiKuai: true, owner: 'TE-PT22 TTO優化' },
    { id: 'te3', zone: 'TE', x: 1680, y: 680, w: 160, h: 72, screenState: 'wafer', hasLamp: true, hasKuaiKuai: true, owner: 'TE-CP MSS 轉譯' },
    { id: 'te4', zone: 'TE', x: 1880, y: 680, w: 160, h: 72, screenState: 'pass', hasLamp: false, hasKuaiKuai: true, owner: 'TE-LP56 Writer' },
    { id: 'te5', zone: 'TE', x: 1280, y: 920, w: 160, h: 72, screenState: 'wafer', hasLamp: false, hasKuaiKuai: true, owner: 'TE-Datalog 解析' },
    { id: 'te6', zone: 'TE', x: 1480, y: 920, w: 160, h: 72, screenState: 'pass', hasLamp: true, hasKuaiKuai: true, owner: 'TE-AutoDongle' },
    { id: 'te7', zone: 'TE', x: 1680, y: 920, w: 160, h: 72, screenState: 'wave', hasLamp: false, hasKuaiKuai: true, owner: 'TE-TouchDown' },
    { id: 'te8', zone: 'TE', x: 1880, y: 920, w: 160, h: 72, screenState: 'pass', hasLamp: true, hasKuaiKuai: true, owner: 'TE-Site 熱圖' },

    { id: 'lab_pc1', zone: 'LAB', x: 2380, y: 1380, w: 180, h: 74, screenState: 'pass', hasLamp: true, hasKuaiKuai: true, owner: 'Lab GPIB 主控台 A' },
    { id: 'lab_pc2', zone: 'LAB', x: 2380, y: 1580, w: 180, h: 74, screenState: 'wafer', hasLamp: true, hasKuaiKuai: true, owner: 'Lab Burn-In 監控台 B' },
  ],

  // Lab 實驗室重型 3D 像素設備 (隨機切換正常運轉、自動校準、晶圓傳送、待命等真實狀態)
  labEquipments: [
    { id: 'tester_1', kind: 'tester', name: 'Advantest T5830ES #1', x: 1300, y: 1330, w: 150, h: 110, status: 'RUN 99.9%', statusColor: '#22c55e' },
    { id: 'tester_2', kind: 'tester', name: 'Advantest T5830ES #2', x: 1500, y: 1330, w: 150, h: 110, status: 'AUTO CALIB', statusColor: '#38bdf8' },
    { id: 'tester_3', kind: 'tester', name: 'Advantest T5385ES #3', x: 1300, y: 1560, w: 150, h: 110, status: 'PASS READY', statusColor: '#22c55e' },
    { id: 'tester_4', kind: 'tester', name: 'Advantest T5833 #4', x: 1500, y: 1560, w: 150, h: 110, status: 'LOT CHANGE', statusColor: '#facc15' },
    { id: 'loader_1', kind: 'loader', name: 'Wafer Loader EFEM-A', x: 1740, y: 1340, w: 140, h: 115, status: 'LOADING', statusColor: '#38bdf8' },
    { id: 'loader_2', kind: 'loader', name: 'Wafer Loader EFEM-B', x: 1740, y: 1560, w: 140, h: 115, status: 'ALIGN OK', statusColor: '#22c55e' },
    { id: 'oven_1', kind: 'oven', name: '高溫爐烤箱 (130°C Burn-In)', x: 1960, y: 1330, w: 155, h: 120, temp: '130.0°C', status: 'BAKING', statusColor: '#f97316' },
    { id: 'oven_2', kind: 'oven', name: '高溫/低溫烘箱 (-45°C~90°C)', x: 2150, y: 1330, w: 155, h: 120, temp: '90.0°C', status: 'STABLE', statusColor: '#22c55e' },
    { id: 'oven_3', kind: 'oven', name: 'HTOL 老化高溫爐 #3', x: 1960, y: 1560, w: 155, h: 120, temp: '25.0°C', status: 'COOLING', statusColor: '#38bdf8' },
  ],

  // 會議室 A 台股即時看盤巨型大螢幕座標
  stockScreen: {
    x: 215,
    y: 1265,
    w: 390,
    h: 102,
  },

  // 額外家具碰撞區 (經精準調校，保留所有椅子與沙發周圍通行及入座空間)
  furnitureColliders: [
    // VP 大老闆辦公桌與接待皮沙發靠背 (釋出坐墊坐標供自由入座)
    { x: 260, y: 165, w: 190, h: 70 },
    { x: 200, y: 300, w: 130, h: 32 },
    // 六位處級主管獨立辦公室辦公桌本體 (y: 175..231，四周留出寬敞過道與座椅感應區)
    { x: 697, y: 175, w: 120, h: 56 },
    { x: 938, y: 175, w: 120, h: 56 },
    { x: 1178, y: 175, w: 120, h: 56 },
    { x: 1418, y: 175, w: 120, h: 56 },
    { x: 1658, y: 175, w: 120, h: 56 },
    { x: 1898, y: 175, w: 120, h: 56 },
    // 茶水間吧台與餐桌靠背
    { x: 2180, y: 110, w: 430, h: 65 },
    { x: 2300, y: 260, w: 160, h: 48 },
    // 廁所洗手台
    { x: 2210, y: 605, w: 160, h: 48 },
    // 兩間獨立會議室大會議桌 (不遮蔽南北側各 4 張獨立會議椅)
    { x: 280, y: 1450, w: 250, h: 135 },
    { x: 810, y: 1450, w: 250, h: 135 },
  ],
};

// Small reusable tiles keep material detail deterministic and avoid per-frame noise.
// All decorations are visual only; WORLD_MAP remains the collision source of truth.
const officeMaterialPatterns = new WeakMap();
function drawOfficeMaterial(ctx, x, y, w, h, kind, base, accent) {
  let patterns = officeMaterialPatterns.get(ctx);
  if (!patterns) { patterns = new Map(); officeMaterialPatterns.set(ctx, patterns); }
  const key = `${kind}:${base}:${accent}`;
  if (!patterns.has(key)) {
    const tile = document.createElement('canvas');
    tile.width = 64; tile.height = 64;
    const t = tile.getContext('2d');
    t.fillStyle = base; t.fillRect(0, 0, 64, 64);
    t.fillStyle = accent;
    if (kind === 'wood') {
      t.fillRect(0, 0, 64, 2); t.fillRect(0, 32, 64, 2);
      t.fillRect(0, 0, 2, 32); t.fillRect(32, 32, 2, 32);
      t.globalAlpha = 0.25;
      t.fillRect(8, 10, 32, 2); t.fillRect(22, 22, 34, 2);
      t.fillRect(4, 44, 20, 2); t.fillRect(40, 54, 18, 2);
    } else if (kind === 'carpet') {
      t.globalAlpha = 0.22;
      for (let yy = 0; yy < 64; yy += 8) {
        for (let xx = 0; xx < 64; xx += 8) t.fillRect(xx + (yy % 16 ? 2 : 0), yy, 2, 2);
      }
      t.globalAlpha = 0.15; t.fillRect(0, 0, 64, 1); t.fillRect(0, 0, 1, 64);
    } else {
      t.globalAlpha = 0.35;
      t.fillRect(0, 0, 64, 2); t.fillRect(0, 0, 2, 64);
      t.globalAlpha = 0.12; t.fillRect(3, 3, 58, 2);
      t.fillRect(6, 56, 4, 2); t.fillRect(56, 6, 2, 4);
    }
    patterns.set(key, ctx.createPattern(tile, 'repeat'));
  }
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = patterns.get(key); ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawOfficeWayfinding(ctx) {
  ctx.save();
  // Clear horizontal circulation routes between the existing room entrances.
  for (const y of [510, 1160]) {
    ctx.fillStyle = '#c7bca6'; ctx.fillRect(180, y - 22, 2480, 44);
    ctx.fillStyle = '#e7ddc8'; ctx.fillRect(180, y - 20, 2480, 38);
    for (let x = 220; x < 2630; x += 120) {
      ctx.fillStyle = '#b0a58e'; ctx.fillRect(x, y + 12, 24, 2);
    }
  }
  const signs = [[340, 510, 'OFFICES', '#78624b'], [2260, 510, 'PANTRY', '#946330'],
    [350, 1160, 'MEETING', '#756287'], [1780, 1160, 'LAB', '#397d78']];
  ctx.font = 'bold 14px monospace'; ctx.textAlign = 'left';
  for (const [x, y, label, color] of signs) {
    ctx.fillStyle = color; ctx.fillRect(x, y - 7, 4, 14);
    ctx.fillRect(x + 4, y - 4, 4, 8); ctx.fillRect(x + 8, y - 1, 4, 2);
    ctx.fillText(label, x + 22, y + 5);
  }
  ctx.restore();
}

function draw3DPixelBox(ctx, x, y, w, h, depth, topColor, frontColor, sideColor, drawBorder = true) {
  ctx.save();
  // Stepped cast shadow follows the same upper-left light for every prop.
  const reach = Math.max(4, Math.min(18, Math.round(depth * 0.45)));
  ctx.fillStyle = 'rgba(28, 39, 48, 0.10)';
  ctx.fillRect(Math.round(x + reach), Math.round(y + reach), Math.round(w + 4), Math.round(h));
  ctx.fillStyle = 'rgba(28, 39, 48, 0.16)';
  ctx.fillRect(Math.round(x + 4), Math.round(y + h - 3), Math.round(w), 7);

  if (sideColor) {
    ctx.fillStyle = sideColor;
    ctx.beginPath();
    ctx.moveTo(x + w, y - depth);
    ctx.lineTo(x + w + 6, y - depth + 6);
    ctx.lineTo(x + w + 6, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = frontColor;
  ctx.fillRect(Math.round(x), Math.round(y + h - depth), Math.round(w), Math.round(depth));

  ctx.fillStyle = topColor;
  ctx.fillRect(Math.round(x), Math.round(y - depth), Math.round(w), Math.round(h));

  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.fillRect(Math.round(x + 2), Math.round(y - depth + 2), Math.round(w - 4), 4);

  // Dark lower lip and a bright left edge separate top, front and side faces.
  ctx.fillStyle = 'rgba(16, 29, 43, 0.16)';
  ctx.fillRect(Math.round(x), Math.round(y + h - 3), Math.round(w), 3);
  ctx.fillRect(Math.round(x), Math.round(y + h - depth), Math.round(w), 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.fillRect(Math.round(x + 2), Math.round(y - depth + 3), 2, Math.max(1, Math.round(h - 5)));
  if (drawBorder) {
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(Math.round(x), Math.round(y - depth), Math.round(w), Math.round(h + depth));
  }
  ctx.restore();
}

window.draw3DPixelBox = draw3DPixelBox;

// 🔒 鳥人指揮官拉進會議室 10 秒 / 攻擊 VP 或 PP00 處長被抓去辦公室關緊閉訓話 10 秒狀態
window.MEETING_LOCK_STATE = {
  lockedUntil: 0,
  roomId: null, // 'meet_a' | 'meet_b' | 'vp_room' | 'dir_pp00'
  reason: '',
};

window.isPositionBlocked = function (x, y, radius = 14, entityId = null) {
  const map = window.WORLD_MAP;
  if (x < 168 || x > map.width - 135 || y < 82 || y > map.height - 100) {
    return true;
  }

  const checkRect = (rx, ry, rw, rh) =>
    x + radius > rx && x - radius < rx + rw && y + radius > ry && y - radius < ry + rh;

  // 若處於 10 秒關門狀態（會議室 A/B、主管室或打掃阿姨抓去廁所/茶水間訓話），封鎖對應房門
  if (window.MEETING_LOCK_STATE && Date.now() < window.MEETING_LOCK_STATE.lockedUntil) {
    const rid = window.MEETING_LOCK_STATE.roomId;
    if (rid === 'meet_a' && checkRect(330, 1222, 135, 36)) return true;
    if (rid === 'meet_b' && checkRect(862, 1222, 132, 36)) return true;
    if (rid === 'vp_room' && checkRect(333, 432, 122, 34)) return true;
    if (rid === 'dir_pp00' && checkRect(715, 432, 80, 34)) return true;
    if (rid === 'restroom' && checkRect(2140, 770, 40, 160)) return true;
    if (rid === 'pantry' && checkRect(2280, 430, 185, 36)) return true;
  }

  // 🚽 廁所獨立隔間實體碰撞（包含上下隔板、後牆、門板與使用中鎖定，徹底杜絕穿牆穿門）
  if (map.toiletStalls) {
    for (const stall of map.toiletStalls) {
      // 1. 若隔間已有人使用 (occupiedBy)，其他人與所有 NPC 絕對禁止進入該隔間內部！
      if (stall.occupiedBy && stall.occupiedBy !== entityId) {
        if (checkRect(stall.x - 4, stall.y - 4, stall.w + 8, stall.h + 8)) {
          return true;
        }
      }

      // 2. 隔間上方隔板 (永遠實體阻擋，不可穿透)
      if (checkRect(stall.x, stall.y, stall.w, 12)) return true;
      // 3. 隔間下方隔板 (永遠實體阻擋，不可穿透)
      if (checkRect(stall.x, stall.y + stall.h - 12, stall.w, 12)) return true;
      // 4. 隔間後方東側背牆 (永遠實體阻擋，不可穿透)
      if (checkRect(stall.x + stall.w - 18, stall.y, 22, stall.h)) return true;

      // 5. 西側隔間門板：若門未打開 (doorOpen < 0.5) 且不是當前使用者進入/離開，阻擋穿門
      const isDoorOpen = stall.doorOpen >= 0.5;
      if (!isDoorOpen && checkRect(stall.x - 4, stall.y + 10, 16, stall.h - 20)) {
        return true;
      }
    }
  }

  for (const w of map.walls) {
    if (checkRect(w.x, w.y, w.w, w.h)) return true;
  }
  for (const ws of map.workstations) {
    if (checkRect(ws.x, ws.y, ws.w, ws.h)) return true;
  }
  for (const eq of map.labEquipments) {
    if (checkRect(eq.x, eq.y, eq.w, eq.h)) return true;
  }
  for (const fc of map.furnitureColliders) {
    if (checkRect(fc.x, fc.y, fc.w, fc.h)) return true;
  }
  return false;
};

/**
 * 依照 24 小時時段與武器強度階梯 (5%~20%) 計算加權隨機道具
 */
window.getWeightedRandomItem = function(pool = window.GATHER_CONFIG?.items) {
  if (!pool || pool.length === 0) return window.GATHER_CONFIG?.items?.[0];
  const hour = new Date().getHours();
  // 24小時制時段動態調變：中午後與下午茶 (11:30~13:30, 15:00~16:00) 補給品微增；夜間大夜班 (21:00~07:00) 咖啡與神聖乖乖機率微增
  const isLunchOrTea = (hour >= 11 && hour <= 13) || (hour >= 15 && hour <= 16);
  const isNightShift = hour >= 21 || hour < 7;

  const weightedPool = pool.map((item) => {
    let rate = item.spawnRate || 0.10;
    if (isLunchOrTea && (item.id === 'pizza' || item.id === 'boba' || item.id === 'coffee')) {
      rate *= 1.2;
    }
    if (isNightShift && (item.id === 'coffee' || item.id === 'kuaikuai')) {
      rate *= 1.25;
    }
    return { item, rate };
  });

  const totalRate = weightedPool.reduce((sum, p) => sum + p.rate, 0);
  let r = Math.random() * totalRate;
  for (const p of weightedPool) {
    if (r < p.rate) return p.item;
    r -= p.rate;
  }
  return pool[pool.length - 1];
};

/**
 * 動態辦公室生態系統管理器 (已移除移動表情方塊、降低小怪物生成機率至 0.5% 且上限 3 隻)
 */
class OfficeEcosystem {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;

    this.drifters = [];
    for (let i = 0; i < 8; i++) {
      this.spawnDrifter(true);
    }

    this.groundItems = [];
    // 初始自動隨機生成 6 個掉落物 (含隨機武器與道具)
    this.spawnBatchRandomDrops(6);
    this.lastBatchDropAt = Date.now();

    // 👾 像素方塊怪物清單 (上限 3 隻，初始僅生成 1 隻，後續以 0.5% 機率生成)
    this.mobs = [];
    this.spawnMinecraftMob();
    this.lastMobSpawnAt = Date.now();

    this.thrownItems = [];
    this.steamParticles = [];
  }

  /**
   * 生成像素方塊怪物 (場上同時最多不超過 3 隻)
   */
  spawnMinecraftMob() {
    const mobCatalog = window.GATHER_CONFIG.minecraftMobs || [];
    const maxMobs = window.GATHER_CONFIG?.security?.maxMobCount || 3;
    if (mobCatalog.length === 0 || this.mobs.length >= maxMobs) return null;
    const tpl = mobCatalog[Math.floor(Math.random() * mobCatalog.length)];

    // 隨機生成於 PE區、TE區 或 Lab 實驗室走廊
    const spawnZones = [
      { x: 540, y: 820 },
      { x: 1560, y: 820 },
      { x: 1650, y: 1480 },
      { x: 2150, y: 1480 },
      { x: 1120, y: 540 },
    ];
    const base = spawnZones[Math.floor(Math.random() * spawnZones.length)];
    const mx = base.x + (Math.random() - 0.5) * 180;
    const my = base.y + (Math.random() - 0.5) * 120;

    const mob = {
      uid: 'mob_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      ...tpl,
      hp: tpl.maxHp || 2,
      maxHp: tpl.maxHp || 2,
      x: Math.round(mx),
      y: Math.round(my),
      targetX: Math.round(mx),
      targetY: Math.round(my),
      isMoving: false,
      isBerserk: false,
      sabotageTarget: null, // { kind: 'pc' | 'lab', ref }
      knockback: null,
    };
    this.mobs.push(mob);
    return mob;
  }


  /**
   * 在指定座標生成一個掉落武器或道具 (例如擊退鳥人指揮官 20% 掉落)
   */
  spawnDropAt(x, y, customMeta = null) {
    const meta = customMeta || window.getWeightedRandomItem(window.GATHER_CONFIG.items);
    const item = {
      uid: 'drop_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      x: Math.round(x + (Math.random() - 0.5) * 36),
      y: Math.round(y + (Math.random() - 0.5) * 36),
      dropY: 65,
      ...meta,
    };
    this.groundItems.push(item);
    return item;
  }

  spawnDrifter(randomPos = false) {
    const types = [
      { kind: 'paper', label: '📄' },
      { kind: 'can', label: '🥫' },
      { kind: 'note', label: '🟨' },
      { kind: 'leaf', label: '🍃' },
    ];
    const picked = types[Math.floor(Math.random() * types.length)];
    this.drifters.push({
      ...picked,
      x: randomPos ? 240 + Math.random() * 2300 : 220,
      y: randomPos ? 470 + Math.random() * 720 : 480 + Math.random() * 680,
      vx: 0.4 + Math.random() * 0.65,
      vy: (Math.random() - 0.5) * 0.4,
      angle: Math.random() * Math.PI * 2,
      vAngle: (Math.random() - 0.5) * 0.06,
    });
  }

  /**
   * 一次隨機產生 count 種加權掉落物 (依強度 5%~20% 機率，並納入 24 小時制計算)
   */
  spawnBatchRandomDrops(count = 5) {
    const pool = window.GATHER_CONFIG.items;
    const selected = [];
    for (let i = 0; i < count; i++) {
      selected.push(window.getWeightedRandomItem(pool));
    }
    selected.forEach((meta) => {
      if (this.groundItems.length >= 15) return;
      let rx = 700 + Math.random() * 800;
      let ry = 500 + Math.random() * 600;
      for (let attempt = 0; attempt < 20; attempt++) {
        const cx = 240 + Math.random() * 2280;
        const cy = 220 + Math.random() * 1480;
        if (!window.isPositionBlocked(cx, cy, 26)) {
          rx = cx;
          ry = cy;
          break;
        }
      }
      this.groundItems.push({
        uid: 'drop_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        x: Math.round(rx),
        y: Math.round(ry),
        dropY: 110,
        ...meta,
      });
    });
    return selected;
  }

  addThrownItem(fromX, fromY, toX, toY, emoji) {
    this.thrownItems.push({ fromX, fromY, toX, toY, emoji, progress: 0 });
  }

  update(tick, players) {
    const now = Date.now();

    // 1. 每 10 分鐘自動隨機生成 5 種掉落物
    if (now - this.lastBatchDropAt >= window.GATHER_CONFIG.security.randomDropIntervalMs) {
      this.lastBatchDropAt = now;
      this.spawnBatchRandomDrops(window.GATHER_CONFIG.security.randomDropBatchCount || 5);
    }

    // 2. 更新廁所門自動開關動畫（若隔間已有人佔用則鎖門不開）& 踹門震動計時 & 洗手台出水動畫
    window.WORLD_MAP.toiletStalls.forEach((stall) => {
      if (stall.kickShakeTicks && stall.kickShakeTicks > 0) {
        stall.kickShakeTicks--;
      }
      // 驗證佔用者是否仍在馬桶隔間內，若佔用者已離開則自動釋放鎖定
      if (stall.occupiedBy && players) {
        const occ = players.find((p) => p.id === stall.occupiedBy);
        if (
          !occ ||
          occ.actionState !== 'toilet' ||
          Math.hypot(occ.x - stall.seatX, occ.y - stall.seatY) > 55
        ) {
          stall.occupiedBy = null;
        }
      }

      let someoneNear = false;
      if (!stall.occupiedBy && players) {
        for (const p of players) {
          const dDoor = Math.hypot(p.x - (stall.x + 15), p.y - (stall.y + stall.h / 2));
          if (dDoor < 74) {
            someoneNear = true;
            break;
          }
        }
      }
      const targetOpen = stall.occupiedBy ? 0 : someoneNear ? 1 : 0;
      stall.doorOpen += (targetOpen - stall.doorOpen) * 0.18;
    });

    if (window.WORLD_MAP.restroomSinks) {
      window.WORLD_MAP.restroomSinks.forEach((sink) => {
        let active = false;
        if (players) {
          for (const p of players) {
            const dSink = Math.hypot(p.x - sink.standX, p.y - sink.standY);
            if (dSink < 72 || (dSink < 95 && p.actionState === 'wash_hands')) {
              active = true;
              break;
            }
          }
        }
        sink.waterActive = active;
      });
    }

    // 4. 飄落文件與空罐
    this.drifters.forEach((d) => {
      d.x += d.vx;
      d.y += d.vy + Math.sin(tick * 0.05 + d.angle) * 0.25;
      d.angle += d.vAngle;
      if (d.x > 2620) {
        d.x = 200;
        d.y = 480 + Math.random() * 680;
      }
    });

    // 5. 空投寶物降落
    this.groundItems.forEach((item) => {
      if (item.dropY > 0) item.dropY = Math.max(0, item.dropY - 3.5);
    });

    // 6. 拋物線交換物品
    for (let i = this.thrownItems.length - 1; i >= 0; i--) {
      this.thrownItems[i].progress += 0.045;
      if (this.thrownItems[i].progress >= 1) this.thrownItems.splice(i, 1);
    }

    // 7. 茶水間咖啡蒸氣與高溫爐熱氣粒子
    if (tick % 12 === 0) {
      this.steamParticles.push({
        x: 2290 + (Math.random() - 0.5) * 14,
        y: 118,
        vy: -0.6,
        alpha: 0.7,
        size: 4 + Math.random() * 3,
        color: '255, 255, 255',
      });
      this.steamParticles.push({
        x: 2035 + (Math.random() - 0.5) * 35,
        y: 1330,
        vy: -0.5,
        alpha: 0.65,
        size: 3 + Math.random() * 3,
        color: '56, 189, 248',
      });
    }
    for (let i = this.steamParticles.length - 1; i >= 0; i--) {
      const sp = this.steamParticles[i];
      sp.y += sp.vy;
      sp.alpha -= 0.015;
      if (sp.alpha <= 0) this.steamParticles.splice(i, 1);
    }

    // 8. 電腦螢幕與 Lab 測試機台隨機切換多元正常狀態 (僅限未損壞設備)
    if (tick % 240 === 120) {
      const screenModes = ['pass', 'wafer', 'wave', 'pass', 'wafer', 'calib'];
      const ws =
        window.WORLD_MAP.workstations[
          Math.floor(Math.random() * window.WORLD_MAP.workstations.length)
        ];
      if (ws && !ws.isBroken) {
        ws.screenState = screenModes[Math.floor(Math.random() * screenModes.length)];
      }

      const eqStates = [
        { status: 'RUN 99.9%', color: '#22c55e' },
        { status: 'ALL PASS', color: '#10b981' },
        { status: 'AUTO CALIB', color: '#38bdf8' },
        { status: 'WAFER LOAD', color: '#06b6d4' },
        { status: 'LOT READY', color: '#a855f7' },
        { status: 'STANDBY', color: '#facc15' },
      ];
      const eq =
        window.WORLD_MAP.labEquipments[
          Math.floor(Math.random() * window.WORLD_MAP.labEquipments.length)
        ];
      if (eq && !eq.isBroken) {
        const picked = eqStates[Math.floor(Math.random() * eqStates.length)];
        eq.status = picked.status;
        eq.statusColor = picked.color;
      }
    }

    // 9. 👾 像素方塊怪物以 0.5% 機率生成，且場上同時最多不超過 3 隻
    const maxMobs = window.GATHER_CONFIG?.security?.maxMobCount || 3;
    const mobSpawnChance = window.GATHER_CONFIG?.security?.mobSpawnChance ?? 0.005;
    if (tick % 60 === 30 && this.mobs.length < maxMobs) {
      if (Math.random() < mobSpawnChance) {
        this.lastMobSpawnAt = now;
        this.spawnMinecraftMob();
      }
    }

    const mobBerserkChance = window.GATHER_CONFIG?.security?.mobBerserkChance ?? 0.01;
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const mob = this.mobs[i];

      // 處理武器擊飛物理
      if (mob.knockback && mob.knockback.ticksLeft > 0) {
        const nx = mob.x + mob.knockback.vx;
        const ny = mob.y + mob.knockback.vy;
        if (!window.isPositionBlocked(nx, mob.y, 14)) mob.x = nx;
        if (!window.isPositionBlocked(mob.x, ny, 14)) mob.y = ny;
        mob.knockback.vx *= 0.86;
        mob.knockback.vy *= 0.86;
        mob.knockback.ticksLeft--;
        if (mob.knockback.ticksLeft <= 0) {
          mob.knockback = null;
          if (mob.hp <= 0) {
            this.mobs.splice(i, 1);
            continue;
          }
        }
        continue;
      }

      // 每秒檢查一次：1% 機率觸發怪物暴走並鎖定一台未損壞的電腦或實驗室機台進行破壞
      if (!mob.isBerserk && tick % 60 === (i * 19) % 60) {
        if (Math.random() < mobBerserkChance) {
          const intactPCs = window.WORLD_MAP.workstations
            .filter((w) => !w.isBroken)
            .map((w) => ({
              kind: 'pc',
              ref: w,
              name: w.owner,
              tx: w.x + w.w / 2,
              ty: w.y + w.h + 24,
            }));
          const intactLabs = window.WORLD_MAP.labEquipments
            .filter((e) => !e.isBroken)
            .map((e) => ({
              kind: 'lab',
              ref: e,
              name: e.name,
              tx: e.x + e.w / 2,
              ty: e.y + e.h + 24,
            }));
          const allTargets = [...intactPCs, ...intactLabs];
          if (allTargets.length > 0) {
            const chosen = allTargets[Math.floor(Math.random() * allTargets.length)];
            mob.isBerserk = true;
            mob.sabotageTarget = chosen;
            mob.targetX = chosen.tx;
            mob.targetY = chosen.ty;
            if (this.callbacks && this.callbacks.onMobBerserk) {
              this.callbacks.onMobBerserk(mob, chosen);
            }
          }
        }
      }

      if (mob.isBerserk && mob.sabotageTarget) {
        if (mob.sabotageTarget.ref.isBroken) {
          mob.isBerserk = false;
          mob.sabotageTarget = null;
        } else {
          mob.targetX = mob.sabotageTarget.tx;
          mob.targetY = mob.sabotageTarget.ty;
          const distToEq = Math.hypot(mob.targetX - mob.x, mob.targetY - mob.y);
          if (distToEq < 38) {
            // 💥 破壞電腦或實驗室機台！
            mob.sabotageTarget.ref.isBroken = true;
            mob.sabotageTarget.ref.brokenBy = mob.name;
            if (mob.sabotageTarget.kind === 'lab') {
              mob.sabotageTarget.ref.status = '💥BROKEN!';
              mob.sabotageTarget.ref.statusColor = '#ef4444';
            }
            if (this.callbacks && this.callbacks.onEquipmentBroken) {
              this.callbacks.onEquipmentBroken(mob, mob.sabotageTarget);
            }
            mob.isBerserk = false;
            mob.sabotageTarget = null;
          }
        }
      } else if (tick % 140 === (i * 37) % 140) {
        const rx = mob.x + (Math.random() - 0.5) * 220;
        const ry = mob.y + (Math.random() - 0.5) * 180;
        if (!window.isPositionBlocked(rx, ry, 16)) {
          mob.targetX = rx;
          mob.targetY = ry;
        }
      }

      const dx = mob.targetX - mob.x;
      const dy = mob.targetY - mob.y;
      const dist = Math.hypot(dx, dy);
      const speed = mob.isBerserk ? 2.9 : 1.15;
      if (dist > 4) {
        mob.isMoving = true;
        const sx = (dx / dist) * speed;
        const sy = (dy / dist) * speed;
        if (!window.isPositionBlocked(mob.x + sx, mob.y, 14) || mob.isBerserk) mob.x += sx;
        if (!window.isPositionBlocked(mob.x, mob.y + sy, 14) || mob.isBerserk) mob.y += sy;
      } else {
        mob.isMoving = false;
      }
    }
  }
}

window.OfficeEcosystem = OfficeEcosystem;

/**
 * 繪製 3D 效果化像素風格 (2.5D Voxel-Pixel) 巨型園區
 */
window.renderOfficeWorld = function (ctx, ecosystem, tick) {
  const { width, height } = window.WORLD_MAP;

  // Quiet material detail lets characters, entrances and equipment remain legible.
  drawOfficeMaterial(ctx, 0, 0, width, height, 'carpet', '#78a884', '#315d47');
  drawOfficeMaterial(ctx, 158, 68, 2524, 1744, 'wood', '#e8ddc7', '#cec0a6');
  drawOfficeWayfinding(ctx);

  // 左側戶外 3D 像素搖曳樹木
  for (let ty = 160; ty <= 1720; ty += 220) {
    const sway = Math.sin(tick * 0.04 + ty) * 3;
    draw3DPixelBox(ctx, 48, ty + 16, 24, 28, 12, '#92400e', '#78350f', '#451a03');
    draw3DPixelBox(ctx, 22 + sway, ty - 30, 76, 56, 18, '#4ade80', '#16a34a', '#15803d');
    draw3DPixelBox(ctx, 34 + sway * 1.3, ty - 52, 52, 38, 14, '#86efac', '#22c55e', '#16a34a');
    ctx.fillStyle = '#b5e6a5';
    ctx.fillRect(Math.round(40 + sway), ty - 60, 12, 6);
    ctx.fillRect(Math.round(36 + sway), ty - 54, 6, 10);
    ctx.fillStyle = '#23714c';
    ctx.fillRect(Math.round(74 + sway), ty - 12, 12, 6);
    ctx.fillRect(Math.round(84 + sway), ty - 6, 8, 8);
  }

  // 2.1 VP 大老闆獨立辦公室 (x: 158..620, y: 68..440)
  drawOfficeMaterial(ctx, 158, 68, 462, 372, 'carpet', '#343b50', '#a6adbf');
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 4;
  ctx.strokeRect(172, 82, 434, 344);
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.roundRect(490, 260, 95, 145, 12);
  ctx.fill();
  draw3DPixelBox(ctx, 260, 165, 190, 70, 22, '#b45309', '#78350f', '#451a03');
  draw3DPixelBox(ctx, 280, 152, 24, 24, 14, '#fde047', '#eab308', '#ca8a04');
  draw3DPixelBox(ctx, 330, 150, 90, 22, 16, '#22c55e', '#0f172a', '#1e293b');
  draw3DPixelBox(ctx, 200, 310, 130, 52, 18, '#d97706', '#92400e', '#78350f');
  // VP 室辦公桌前兩張獨立訪客椅
  draw3DPixelBox(ctx, 292, 246, 32, 26, 12, '#64748b', '#334155', '#1e293b');
  draw3DPixelBox(ctx, 387, 246, 32, 26, 12, '#64748b', '#334155', '#1e293b');

  // 2.2 六位處級主管獨立 BLOCK 空間
  window.WORLD_MAP.directorBlocks.forEach((blk) => {
    drawOfficeMaterial(ctx, blk.x, blk.y, blk.w, blk.h, 'carpet', '#354657', '#bccad5');
    ctx.fillStyle = blk.accent + '28';
    ctx.fillRect(blk.x + 8, blk.y + 8, blk.w - 16, blk.h - 16);

    draw3DPixelBox(ctx, blk.x + 52, blk.y + 105, 120, 56, 20, '#e2e8f0', '#94a3b8', '#64748b');
    draw3DPixelBox(ctx, blk.x + 92, blk.y + 72, 40, 28, 16, blk.accent, '#334155', '#0f172a');
    draw3DPixelBox(ctx, blk.x + 68, blk.y + 96, 64, 18, 14, '#22c55e', '#0f172a', '#1e293b');
    draw3DPixelBox(ctx, blk.x + 140, blk.y + 102, 22, 12, 8, '#facc15', '#ca8a04', '#854d0e');

    draw3DPixelBox(ctx, blk.x + 68, blk.y + 185, 32, 26, 12, '#64748b', '#334155', '#1e293b');
    draw3DPixelBox(ctx, blk.x + 124, blk.y + 185, 32, 26, 12, '#64748b', '#334155', '#1e293b');

    ctx.fillStyle = blk.accent + 'bb';
    ctx.font = '800 15px "Outfit", monospace';
    ctx.textAlign = 'center';
    const roomTitle = blk.unit === 'PP00' ? 'PP00 處長室' : `${blk.unit} 主管會議室`;
    ctx.fillText(roomTitle, blk.x + blk.w / 2, blk.y + 295);
  });

  // 2.3 右上茶水間 (Pantry & Coffee Bar，接近可喝咖啡/摸魚)
  drawOfficeMaterial(ctx, 2100, 68, 582, 372, 'wood', '#f0dfba', '#d4bd96');
  draw3DPixelBox(ctx, 2180, 115, 430, 68, 24, '#f8fafc', '#94a3b8', '#64748b');
  draw3DPixelBox(ctx, 2265, 98, 55, 42, 22, '#10b981', '#047857', '#064e3b');
  // Espresso machine: recessed dispenser, twin cups and a metal drip tray.
  ctx.fillStyle = '#173d39'; ctx.fillRect(2274, 89, 36, 22);
  ctx.fillStyle = '#dce9e0'; ctx.fillRect(2279, 98, 9, 9); ctx.fillRect(2295, 98, 9, 9);
  ctx.fillStyle = '#91aaa4'; ctx.fillRect(2274, 113, 36, 3);
  draw3DPixelBox(ctx, 2345, 92, 42, 48, 26, '#38bdf8', '#0284c7', '#0369a1');
  draw3DPixelBox(ctx, 2420, 88, 75, 58, 32, '#e2e8f0', '#cbd5e1', '#94a3b8');
  draw3DPixelBox(ctx, 2515, 92, 75, 54, 28, '#10b981', '#059669', '#047857');
  draw3DPixelBox(ctx, 2300, 265, 160, 68, 18, '#fbbf24', '#b45309', '#78350f');
  [2265, 2475].forEach((cx) => {
    draw3DPixelBox(ctx, cx, 280, 26, 26, 14, '#f97316', '#c2410c', '#7c2d12');
  });
  ctx.fillStyle = '#b45309';
  ctx.font = '700 12px "Microsoft JhengHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('☕ 靠近吧台按 [E] 啟動：喝咖啡提神 / 摸魚打瞌睡', 2385, 225);

  // 2.4 Product Engineer (PE) & Testing Engineer (TE) 專區地毯
  drawOfficeMaterial(ctx, 190, 610, 890, 480, 'carpet', '#b9cbd1', '#54798a');
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 3;
  ctx.strokeRect(190, 610, 890, 480);

  drawOfficeMaterial(ctx, 1230, 610, 870, 480, 'carpet', '#bfd5c7', '#567b67');
  ctx.strokeStyle = '#059669';
  ctx.lineWidth = 3;
  ctx.strokeRect(1230, 610, 870, 480);

  // 2.5 廁所 (Restrooms：支援按 [E] 開門進隔間蹲馬桶 & 按 [E] 洗手台搓泡泡洗手)
  drawOfficeMaterial(ctx, 2170, 580, 510, 520, 'tile', '#d8e8e6', '#82aaa9');
  // 3D 像素雙槽洗手台與鏡面
  draw3DPixelBox(ctx, 2210, 615, 160, 48, 20, '#f8fafc', '#94a3b8', '#64748b');
  draw3DPixelBox(ctx, 2220, 584, 140, 12, 18, '#bae6fd', '#0284c7', '#0369a1');
  (window.WORLD_MAP.restroomSinks || []).forEach((sink, sIdx) => {
    // 水槽內膽
    ctx.fillStyle = sink.waterActive ? '#0ea5e9' : '#38bdf8';
    ctx.fillRect(sink.x + 4, sink.y, 40, 22);
    // 金屬水龍頭
    ctx.fillStyle = '#64748b';
    ctx.fillRect(sink.x + 21, sink.y - 6, 6, 9);
    // 若有人靠近或按 [E] 洗手，繪製動態水柱與白色泡沫
    if (sink.waterActive) {
      ctx.fillStyle = '#67e8f9';
      const streamH = 12 + Math.sin(tick * 0.6 + sIdx) * 3;
      ctx.fillRect(sink.x + 22, sink.y + 2, 4, streamH);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
      ctx.beginPath();
      ctx.arc(sink.x + 18 + Math.sin(tick * 0.3) * 4, sink.y + 13, 5, 0, Math.PI * 2);
      ctx.arc(sink.x + 28 - Math.sin(tick * 0.3) * 4, sink.y + 14, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  ctx.fillStyle = '#0e7490';
  ctx.font = '700 10.5px "Microsoft JhengHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🧼 感應洗手台 [靠近按E洗手]', 2290, 678);

  // 繪製 4 間帶開門動畫的獨立廁所隔間
  window.WORLD_MAP.toiletStalls.forEach((stall) => {
    // 隔間上下隔板與內部瓷磚底
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(stall.x, stall.y, stall.w, stall.h);
    draw3DPixelBox(ctx, stall.x, stall.y, stall.w, 10, 18, '#94a3b8', '#475569', '#1e293b');
    draw3DPixelBox(ctx, stall.x, stall.y + stall.h - 10, stall.w, 10, 18, '#94a3b8', '#475569', '#1e293b');

    // 3D 像素白瓷馬桶本體
    draw3DPixelBox(ctx, stall.seatX - 18, stall.seatY - 14, 42, 36, 16, '#ffffff', '#cbd5e1', '#94a3b8');
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(stall.seatX - 10, stall.seatY - 18, 22, 16);

    // 動態旋轉開合的 3D 像素木門 (doorOpen: 0 關閉 -> 1 打開 85 度，支援踹門震動特效)
    const kickOffset =
      stall.kickShakeTicks && stall.kickShakeTicks > 0
        ? Math.sin(tick * 1.4) * 4.5
        : 0;
    ctx.save();
    ctx.translate(stall.x + 6 + kickOffset, stall.y + 12);
    ctx.rotate(-stall.doorOpen * 1.35);
    draw3DPixelBox(ctx, 0, 0, 14, stall.h - 24, 20, '#fde68a', '#d97706', '#92400e');
    // 門鎖綠燈/紅燈
    ctx.fillStyle = stall.occupiedBy ? '#ef4444' : '#22c55e';
    ctx.fillRect(3, 24, 8, 12);
    ctx.restore();

    if (stall.kickShakeTicks && stall.kickShakeTicks > 0) {
      ctx.save();
      ctx.font = '800 11px "Microsoft JhengHei", sans-serif';
      ctx.fillStyle = '#ef4444';
      ctx.textAlign = 'center';
      ctx.fillText('💥 踹門催促！', stall.x - 14, stall.y + stall.h / 2);
      ctx.restore();
    }

    ctx.fillStyle = stall.occupiedBy ? '#dc2626' : '#0e7490';
    ctx.font = '700 10px "Microsoft JhengHei", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      stall.occupiedBy ? `🔒 ${stall.name} (使用中·按E踹門)` : `${stall.name} [按E上廁所]`,
      stall.x + 26,
      stall.y + 28
    );
  });

  draw3DPixelBox(ctx, 2280, 780, 26, 26, 18, '#facc15', '#eab308', '#ca8a04');

  // 2.6 兩間獨立會議室 (已修正卡片重疊，且會議室 A 搭載台灣加權股價指數盤後資訊大螢幕)
  // 會議室 A (左：158..665)
  drawOfficeMaterial(ctx, 158, 1252, 507, 560, 'carpet', '#d3ccdf', '#807195');
  draw3DPixelBox(ctx, 280, 1450, 250, 135, 22, '#c084fc', '#6b21a8', '#4c1d95');
  [305, 365, 425, 485].forEach((cx) => {
    draw3DPixelBox(ctx, cx, 1405, 34, 26, 14, '#475569', '#1e293b', '#0f172a');
    draw3DPixelBox(ctx, cx, 1598, 34, 26, 14, '#475569', '#1e293b', '#0f172a');
  });

  // 📈 會議室 A 巨型台灣加權股價指數 (TAIEX) 大螢幕 (嚴格遵循 TAIEX_GitHub_Pages_Integration_Plan.md 規格)
  const sc = window.WORLD_MAP.stockScreen;
  draw3DPixelBox(ctx, sc.x, sc.y, sc.w, sc.h, 22, '#2d3b52', '#0c1525', '#020617');
  ctx.fillStyle = '#0c1525';
  ctx.fillRect(sc.x + 8, sc.y - 14, sc.w - 16, sc.h - 12);

  const stData = window.TAIWAN_STOCK_STATE;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f7fafc';
  ctx.font = '800 13px "Outfit", "Microsoft JhengHei", sans-serif';
  ctx.fillText('台灣加權股價指數', sc.x + 18, sc.y + 4);

  // 指數值與漲跌 (台股慣例：上漲紅 #ff6262、下跌綠 #35d49a，並顯示正負號與箭頭)
  ctx.fillStyle = '#f7fafc';
  ctx.font = '800 20px "Outfit", monospace';
  ctx.fillText(stData.valueText || '--', sc.x + 18, sc.y + 29);

  const trendColor =
    stData.direction > 0 ? '#ff6262' : stData.direction < 0 ? '#35d49a' : '#aebdd0';
  ctx.fillStyle = trendColor;
  ctx.font = '700 14.5px "Outfit", monospace';
  ctx.fillText(stData.changeText || '--', sc.x + 150, sc.y + 29);

  ctx.fillStyle = '#aebdd0';
  ctx.font = '600 11px "Microsoft JhengHei", sans-serif';
  ctx.fillText(`${stData.dateText || '行情日期：--'}｜${stData.statusText || '載入中…'}`, sc.x + 18, sc.y + 49);
  ctx.fillText('資料來源：臺灣證券交易所｜最近交易日收盤資料 [靠近按E看盤]', sc.x + 18, sc.y + 66);

  // 會議室 B (中左：685..1180)
  drawOfficeMaterial(ctx, 685, 1252, 495, 560, 'carpet', '#dfcdd3', '#986d80');
  draw3DPixelBox(ctx, 810, 1450, 250, 135, 22, '#f472b6', '#9d174d', '#831843');
  [835, 895, 955, 1015].forEach((cx) => {
    draw3DPixelBox(ctx, cx, 1405, 34, 26, 14, '#475569', '#1e293b', '#0f172a');
    draw3DPixelBox(ctx, cx, 1598, 34, 26, 14, '#475569', '#1e293b', '#0f172a');
  });
  draw3DPixelBox(ctx, 780, 1268, 310, 56, 18, '#0f172a', '#1e293b', '#334155');
  ctx.fillStyle = '#38bdf8';
  ctx.font = '800 13px "Outfit", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('MEETING B · PP00 CHIP ARCHITECTURE', 935, 1288);

  // 2.7 Lab 半導體無塵實驗室 (右下：x: 1242..2682, y: 1252..1812)
  drawOfficeMaterial(ctx, 1242, 1252, 1440, 560, 'tile', '#344953', '#75999d');
  // Equipment service bays stay inside existing furniture footprints.
  ctx.save();
  window.WORLD_MAP.labEquipments.forEach((eq) => {
    ctx.strokeStyle = '#a9bfae'; ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]); ctx.strokeRect(eq.x - 8, eq.y - 6, eq.w + 16, eq.h + 18);
  });
  ctx.restore();

  // 繪製 Lab 3D 像素重型設備 (支援隨機正常運轉與校準狀態)
  window.WORLD_MAP.labEquipments.forEach((eq, idx) => {
    if (eq.kind === 'tester') {
      draw3DPixelBox(ctx, eq.x, eq.y, eq.w, eq.h, 34, '#e2e8f0', '#64748b', '#334155');
      draw3DPixelBox(ctx, eq.x + 14, eq.y + 12, 68, 52, 36, '#10b981', '#059669', '#047857');
      // 狀態警示燈塔 (翠綠/青藍吉祥燈號)
      draw3DPixelBox(
        ctx,
        eq.x + 115,
        eq.y - 8,
        18,
        24,
        42,
        eq.statusColor || '#22c55e',
        '#15803d',
        '#166534'
      );
      draw3DPixelBox(ctx, eq.x + 92, eq.y + 32, 22, 26, 38, '#10b981', '#047857', '#064e3b');
      ctx.fillStyle = '#064e3b';
      ctx.font = '800 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(eq.status, eq.x + 48, eq.y + 2);
      ctx.fillStyle = '#0f172a';
      ctx.font = '800 11px "Outfit", monospace';
      ctx.fillText(eq.name, eq.x + eq.w / 2, eq.y + eq.h - 24);
    } else if (eq.kind === 'loader') {
      draw3DPixelBox(ctx, eq.x, eq.y, eq.w, eq.h, 32, '#cbd5e1', '#475569', '#1e293b');
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(eq.x + 18, eq.y - 18, eq.w - 36, 56);
      const waferShift = Math.sin(tick * 0.08 + idx) * 18;
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.arc(eq.x + eq.w / 2 + waferShift, eq.y + 10, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.font = '800 10.5px "Outfit", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${eq.name} [${eq.status}]`, eq.x + eq.w / 2, eq.y + eq.h - 18);
    } else if (eq.kind === 'oven') {
      draw3DPixelBox(ctx, eq.x, eq.y, eq.w, eq.h, 36, '#475569', '#1e293b', '#0f172a');
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(eq.x + 18, eq.y - 20, eq.w - 36, 54);
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(eq.x + 24, eq.y - 6, eq.w - 48, 4);
      ctx.fillRect(eq.x + 24, eq.y + 12, eq.w - 48, 4);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`🌡️ ${eq.temp} · ${eq.status}`, eq.x + eq.w / 2, eq.y + 52);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(eq.name, eq.x + eq.w / 2, eq.y + eq.h - 18);
    }

    // Cabinet seams, recessed vents and feet give the machines a readable scale.
    ctx.fillStyle = 'rgba(8, 24, 35, 0.48)';
    for (let vent = 0; vent < 4; vent++) ctx.fillRect(eq.x + 12 + vent * 7, eq.y + eq.h - 12, 4, 5);
    ctx.fillRect(eq.x + eq.w - 13, eq.y + 40, 3, 18);
    ctx.fillRect(eq.x + 8, eq.y + eq.h, 12, 4);
    ctx.fillRect(eq.x + eq.w - 20, eq.y + eq.h, 12, 4);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.fillRect(eq.x + 8, eq.y - 28, eq.w - 16, 2);

    // 💥 若實驗室機台遭像素方塊怪物破壞，繪製黑煙火花與【按E修復即升級】提示
    if (eq.isBroken) {
      ctx.save();
      ctx.fillStyle = 'rgba(220, 38, 38, 0.35)';
      ctx.fillRect(eq.x, eq.y - 32, eq.w, eq.h + 32);
      ctx.strokeStyle = tick % 16 < 8 ? '#ef4444' : '#facc15';
      ctx.lineWidth = 3;
      ctx.strokeRect(eq.x - 2, eq.y - 34, eq.w + 4, eq.h + 36);
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(eq.x + 8, eq.y - 52, eq.w - 16, 20);
      ctx.fillStyle = '#fde047';
      ctx.font = '800 11px "Microsoft JhengHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`💥 遭【${eq.brokenBy || '怪物'}】破壞！[按E修復升級]`, eq.x + eq.w / 2, eq.y - 38);
      ctx.restore();
    }
  });

  // 3. 繪製所有 3D 像素立體隔間牆
  window.WORLD_MAP.walls.forEach((w) => {
    draw3DPixelBox(ctx, w.x, w.y, w.w, w.h, 24, w.colorTop, w.colorFront, '#1e293b');
  });

  // 🔒 若觸發 10 秒關門狀態（會議室 A/B 或 攻擊 VP/PP00處長被抓去辦公室關緊閉訓話 10 秒），繪製 3D 像素防逃脫雷射門閘
  if (window.MEETING_LOCK_STATE && Date.now() < window.MEETING_LOCK_STATE.lockedUntil) {
    const remainSec = Math.max(
      1,
      Math.ceil((window.MEETING_LOCK_STATE.lockedUntil - Date.now()) / 1000)
    );
    const rid = window.MEETING_LOCK_STATE.roomId;
    let gateX = 338;
    let gateY = 1230;
    let gateW = 116;
    let gateLabel = `🦩 鳥人指揮官鎖門 (${remainSec}s｜按[F]擊退脫困)`;
    if (rid === 'meet_b') {
      gateX = 870;
      gateY = 1230;
      gateW = 116;
    } else if (rid === 'vp_room') {
      gateX = 333;
      gateY = 440;
      gateW = 122;
      gateLabel = `👑 VP大老闆關緊閉訓話 (${remainSec}s)`;
    } else if (rid === 'dir_pp00') {
      gateX = 715;
      gateY = 440;
      gateW = 80;
      gateLabel = `🎖️ PP00處長關緊閉訓話 (${remainSec}s)`;
    } else if (rid === 'restroom') {
      gateX = 2150;
      gateY = 780;
      gateW = 20;
      gateLabel = `🧹 打掃阿姨抓到廁所訓話 (${remainSec}s)`;
    } else if (rid === 'pantry') {
      gateX = 2288;
      gateY = 440;
      gateW = 172;
      gateLabel = `🧹 打掃阿姨抓到茶水間訓話 (${remainSec}s)`;
    }
    const gateH = rid === 'restroom' ? 140 : 20;
    draw3DPixelBox(ctx, gateX, gateY, gateW, gateH, 26, '#f43f5e', '#9f1239', '#881337');
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(gateX - 42, gateY - 44, Math.max(140, gateW + 84), 22);
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2;
    ctx.strokeRect(gateX - 42, gateY - 44, Math.max(140, gateW + 84), 22);
    ctx.fillStyle = '#fde047';
    ctx.font = '800 10.5px "Microsoft JhengHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(gateLabel, gateX + gateW / 2, gateY - 30);
  }

  // 4. 繪製全部 PE / TE / Lab 3D 像素雙螢幕工作站 (全數採用吉祥翠綠/科技青藍畫面，或顯示遭怪物破壞待修)
  window.WORLD_MAP.workstations.forEach((ws, idx) => {
    draw3DPixelBox(ctx, ws.x + ws.w / 2 - 18, ws.y + ws.h + 6, 36, 24, 12, '#475569', '#1e293b', '#0f172a');
    draw3DPixelBox(ctx, ws.x, ws.y, ws.w, ws.h, 18, '#f8fafc', '#94a3b8', '#64748b');

    draw3DPixelBox(ctx, ws.x + 16, ws.y + 10, 52, 26, 16, '#1e293b', '#0f172a', '#020617');
    draw3DPixelBox(ctx, ws.x + 74, ws.y + 10, 52, 26, 16, '#1e293b', '#0f172a', '#020617');

    if (ws.isBroken) {
      // 💥 遭像素方塊怪物破壞的電腦：冒火花與【按E修復即升級】提示
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(ws.x + 20, ws.y - 3, 44, 20);
      ctx.fillRect(ws.x + 78, ws.y - 3, 44, 20);
      ctx.fillStyle = tick % 12 < 6 ? '#fde047' : '#f87171';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ERR!!', ws.x + 42, ws.y + 10);
      ctx.fillText('FIX E', ws.x + 100, ws.y + 10);

      ctx.fillStyle = '#991b1b';
      ctx.fillRect(ws.x + 4, ws.y - 28, ws.w - 8, 18);
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(ws.x + 4, ws.y - 28, ws.w - 8, 18);
      ctx.fillStyle = '#fef08a';
      ctx.font = '800 10px "Microsoft JhengHei", sans-serif';
      ctx.fillText(`🔧 損壞！按 [E] 修復立即升級`, ws.x + ws.w / 2, ws.y - 16);
    } else if (ws.screenState === 'wafer') {
      // 翠綠晶圓良率圖
      ctx.fillStyle = '#064e3b';
      ctx.fillRect(ws.x + 20, ws.y - 3, 44, 20);
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(ws.x + 42, ws.y + 7, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#064e3b';
      ctx.fillRect(ws.x + 78, ws.y - 3, 44, 20);
      ctx.fillStyle = '#4ade80';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('99.9%', ws.x + 100, ws.y + 10);
    } else if (ws.screenState === 'wave') {
      // 青藍測試波形畫面
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(ws.x + 20, ws.y - 3, 44, 20);
      ctx.fillStyle = '#38bdf8';
      const wLine = 16 + ((tick + idx * 7) % 22);
      ctx.fillRect(ws.x + 24, ws.y + 2, wLine, 4);
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(ws.x + 24, ws.y + 9, 28, 4);

      ctx.fillStyle = '#064e3b';
      ctx.fillRect(ws.x + 78, ws.y - 3, 44, 20);
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('OK!', ws.x + 100, ws.y + 10);
    } else if (ws.screenState === 'calib') {
      // 黃金自動校準中畫面
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(ws.x + 20, ws.y - 3, 44, 20);
      ctx.fillRect(ws.x + 78, ws.y - 3, 44, 20);
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 8.5px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CALIB', ws.x + 42, ws.y + 10);
      ctx.fillText('READY', ws.x + 100, ws.y + 10);
    } else {
      // 預設大吉大利全綠 ALL PASS 畫面
      ctx.fillStyle = '#064e3b';
      ctx.fillRect(ws.x + 20, ws.y - 3, 44, 20);
      ctx.fillRect(ws.x + 78, ws.y - 3, 44, 20);
      ctx.fillStyle = '#4ade80';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PASS!', ws.x + 42, ws.y + 10);
      ctx.fillText('GOOD', ws.x + 100, ws.y + 10);
    }

    // Pixel keyboard, mouse and desk-front trim; no additional interactive objects.
    ctx.fillStyle = '#647c8b'; ctx.fillRect(ws.x + 28, ws.y + 38, 68, 13);
    ctx.fillStyle = '#dce5e7';
    for (let row = 0; row < 2; row++) {
      for (let key = 0; key < 10; key++) ctx.fillRect(ws.x + 31 + key * 6, ws.y + 40 + row * 4, 4, 2);
    }
    ctx.fillRect(ws.x + 48, ws.y + 49, 27, 2);
    ctx.fillStyle = '#526a7a'; ctx.fillRect(ws.x + 105, ws.y + 39, 9, 12);
    ctx.fillStyle = '#a6bac5'; ctx.fillRect(ws.x + 108, ws.y + 40, 2, 4);
    if (ws.hasKuaiKuai) {
      draw3DPixelBox(ctx, ws.x + 132, ws.y + 14, 18, 20, 12, '#10b981', '#047857', '#064e3b');
    }
    if (ws.hasLamp) {
      draw3DPixelBox(ctx, ws.x + 134, ws.y + 44, 16, 16, 14, '#facc15', '#d97706', '#92400e');
    }

    ctx.fillStyle = ws.zone === 'LAB' ? '#94a3b8' : '#334155';
    ctx.font = '600 10px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(ws.owner, ws.x + ws.w / 2, ws.y + ws.h - 4);
  });

  // 5. 動態蒸氣、飄落文件、地上掉落寶物與掃地機器人
  ecosystem.steamParticles.forEach((sp) => {
    ctx.fillStyle = `rgba(${sp.color}, ${Math.max(0, sp.alpha)})`;
    ctx.fillRect(Math.round(sp.x), Math.round(sp.y), sp.size * 2, sp.size * 2);
  });

  ecosystem.drifters.forEach((d) => {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.angle);
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(d.label, 0, 0);
    ctx.restore();
  });

  ecosystem.groundItems.forEach((item) => {
    const pulse = 1 + Math.sin(tick * 0.12) * 0.14;
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.strokeRect(item.x - 14 * pulse, item.y - 6 * pulse, 28 * pulse, 14 * pulse);

    const drawY = item.y - item.dropY + Math.sin(tick * 0.1) * 3;
    ctx.font = '23px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.emoji, item.x, drawY);
  });

  // 👾 繪製像素方塊怪物 (Low Yield, 客退, Qual Delay, MO, QIT)
  if (ecosystem.mobs && window.drawMinecraftMob) {
    ecosystem.mobs.forEach((mob) => {
      window.drawMinecraftMob(ctx, mob, tick);
    });
  }

  // 區域 3D 像素門牌懸浮膠囊 (精簡文字，動態寬度，不與會議室螢幕或家具重疊)
  window.WORLD_MAP.zones.forEach((z) => {
    ctx.save();
    const label = `${z.name} · ${z.sub}`;
    ctx.font = '700 11px "Outfit", "Microsoft JhengHei", sans-serif';
    const tw = ctx.measureText(label).width;
    const boxW = Math.max(105, tw + 20);
    draw3DPixelBox(ctx, z.x - boxW / 2, z.y - 14, boxW, 28, 8, '#0f172a', z.color, '#1e293b');
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(label, z.x, z.y - 4);
    ctx.restore();
  });

  ecosystem.thrownItems.forEach((ti) => {
    const curX = ti.fromX + (ti.toX - ti.fromX) * ti.progress;
    const linearY = ti.fromY + (ti.toY - ti.fromY) * ti.progress;
    const arcHeight = Math.sin(ti.progress * Math.PI) * 85;
    ctx.font = '25px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(ti.emoji, curX, linearY - arcHeight);
  });
};

/**
 * 背景自動執行的真實系統時間光影引擎
 */
window.renderRealTimeLighting = function (ctx, hourFloat, players) {
  const { width, height } = window.WORLD_MAP;

  ctx.save();
  const night = hourFloat < 6 || hourFloat >= 19;
  window.WORLD_MAP.workstations.filter((ws) => ws.hasLamp).forEach((ws) => {
    const x = ws.x + ws.w - 20, y = ws.y + 14;
    const glow = ctx.createRadialGradient(x, y, 2, x, y, 52);
    glow.addColorStop(0, night ? 'rgba(255, 221, 155, 0.24)' : 'rgba(255, 232, 177, 0.13)');
    glow.addColorStop(1, 'rgba(255, 221, 155, 0)');
    ctx.fillStyle = glow; ctx.fillRect(x - 52, y - 52, 104, 104);
  });
  ctx.restore();

  if (hourFloat >= 6 && hourFloat < 9) {
    const intensity = 1 - Math.abs(hourFloat - 7.5) / 1.5;
    ctx.save();
    const dawnGrad = ctx.createLinearGradient(0, 0, width * 0.7, height * 0.7);
    dawnGrad.addColorStop(0, `rgba(251, 191, 36, ${0.2 * intensity})`);
    dawnGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = dawnGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    return;
  }

  if (hourFloat >= 9 && hourFloat < 17) return;

  if (hourFloat >= 17 && hourFloat < 19) {
    const progress = (hourFloat - 17) / 2;
    ctx.save();
    const duskGrad = ctx.createLinearGradient(0, 0, width, height);
    duskGrad.addColorStop(0, `rgba(249, 115, 22, ${0.15 + progress * 0.1})`);
    duskGrad.addColorStop(1, `rgba(30, 27, 75, ${0.2 + progress * 0.2})`);
    ctx.fillStyle = duskGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.fillStyle = 'rgba(19, 30, 51, 0.32)';
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'screen';

  window.WORLD_MAP.workstations.forEach((ws) => {
    const cx = ws.x + 70;
    const cy = ws.y + 10;
    const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, 125);
    g.addColorStop(0, 'rgba(167, 218, 204, 0.20)');
    g.addColorStop(1, 'rgba(34, 197, 94, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, 125, 0, Math.PI * 2);
    ctx.fill();
  });

  window.WORLD_MAP.labEquipments.forEach((eq) => {
    const cx = eq.x + eq.w / 2;
    const cy = eq.y + eq.h / 2;
    const g = ctx.createRadialGradient(cx, cy, 12, cx, cy, 155);
    g.addColorStop(0, 'rgba(151, 205, 226, 0.22)');
    g.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, 155, 0, Math.PI * 2);
    ctx.fill();
  });

  players.forEach((p) => {
    const pg = ctx.createRadialGradient(p.x, p.y - 12, 8, p.x, p.y - 12, 110);
    pg.addColorStop(0, 'rgba(220, 230, 242, 0.16)');
    pg.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(p.x, p.y - 12, 110, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
};
