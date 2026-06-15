// PP00 Tester Booking System - JavaScript Application
// 前端互動邏輯

// 全域變數
let currentDate = new Date();
let selectedDate = new Date();
let appointments = {};
let selectedTester = null;
let selectedDay = null;
let computerName = null;
let currentEditingAppointment = null; // 當前正在編輯的預約
let currentViewMode = 'floor';
let floorLayoutTesters = [];

const DEFAULT_BOOKING_CONFIG = {
    supabaseUrl: 'https://udixppyspiujplwhszmo.supabase.co/',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkaXhwcHlzcGl1anBsd2hzem1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNzQ1MjksImV4cCI6MjA5NDc1MDUyOX0.6y6o5ExcpK8aowB5DnU5zjlRZXfekr8G28ctd7RIbrg',
    supabaseTable: 'appointments',
    clientId: '',
    appName: 'PP00 Tester Booking System',
    version: 'v1.0.0',
    testers: [],
    units: [],
};

const BOOKING_CONFIG = Object.freeze({
    ...DEFAULT_BOOKING_CONFIG,
    ...(window.BOOKING_CONFIG || {}),
});

const TESTERS_SOURCE = Array.isArray(window.TESTERS_DATA) && window.TESTERS_DATA.length > 0
    ? window.TESTERS_DATA
    : BOOKING_CONFIG.testers;
const HIDDEN_TESTERS = new Set(['T5781-4(.34)']);

const FLOOR_PLAN_TESTER_SLOTS = [
    // 第一排 (Row 1: y = 25.5) - 對照 map.png 第三列 (靠近烤箱)
    { tester: 'T5833-2(.84)', x: 2.0, y: 25.5 },
    { tester: 'T5830ES_WBN12(.79)', x: 10.6, y: 25.5 },
    { tester: 'Ms3490#3', x: 27.8, y: 25.5 },
    { tester: 'T5830ES_WBN10(.74)', x: 36.4, y: 25.5 },
    { tester: 'T5385ES_WBN1(.42)', x: 45.0, y: 25.5 },
    
    // 第二排 (Row 2: y = 40.5) - 對照 map.png 第四列 (在 Ms3490#2 與 T5830ES_WBN15 中間插入 UF3000)
    { tester: 'T5833-3(.92)', x: 2.0, y: 40.5 },
    { tester: 'Ms3490#2', x: 10.6, y: 40.5 },
    { tester: 'T5830ES_WBN15(.89)', x: 27.8, y: 40.5 },
    { tester: 'T5385ES_WBN6(.56)', x: 36.4, y: 40.5 },
    { tester: 'Ms3480#1', x: 53.6, y: 40.5 },
    
    // 第三排 (Row 3: y = 48.5) - 對照 map.png 第五列 (整排往上移到原本走道區)
    { tester: 'T5385ES_PT22', x: 2.0, y: 48.5 },
    { tester: 'T5833-4(.96)', x: 10.6, y: 48.5 },
    { tester: 'T5833-5(.97)', x: 19.2, y: 48.5 },
    { tester: 'T5830ES_WBN11(.78)', x: 27.8, y: 48.5 },
    { tester: 'T5830ES_WBN3(.61)', x: 45.0, y: 48.5 },
    
    // 第四排 (Row 4: y = 71.5) - 對照 map.png 第六列 (整排往下移到原本走道區)
    { tester: 'T5833-6(.98)', x: 10.6, y: 71.5 },
    { tester: 'T5833-1(.80)', x: 19.2, y: 71.5 },
    { tester: 'T5830ES_WBN8(.75)', x: 36.4, y: 71.5 },
    
    // 第五排 (Row 5: y = 78.5) - 對照 map.png 第七列
    { tester: 'T5781-3(.33)', x: 19.2, y: 78.5 },
    { tester: 'T5781-2(.32)', x: 36.4, y: 78.5 },
    
    // 右半部機台 (與左側 Row 2 對齊，位於上方 PQ00 區內)
    { tester: 'T5830ES_WBN7(.59)', x: 78.0, y: 40.5 },
];

const FLOOR_PLAN_BLOCK_SIZE = Object.freeze({
    w: 7.8,
    h: 7.2,
});

const FLOOR_PLAN_STATIC_BLOCKS = [
    // === 原本大區塊框架 (kind: 'frame'，已將 X 軸寬度與右側對齊微調) ===
    { label: '', x: 0.6, y: 1, w: 35.5, h: 8.5, kind: 'frame' },
    { label: '', x: 36.1, y: 1, w: 28.0, h: 8.5, kind: 'frame' }, // 寬度調為 28.0 以對齊 PP00 邊界 (64.1%)
    { label: '', x: 0.6, y: 10, w: 63.5, h: 83.6, kind: 'frame' }, // PP00 區拓寬為 63.5
    { label: '', x: 65.0, y: 1, w: 24.8, h: 55.8, kind: 'frame' }, // 右側主外框 X 移至 65.0
    { label: '', x: 89.8, y: 1, w: 9.2, h: 55.8, kind: 'frame' },
    { label: '', x: 65.0, y: 56.8, w: 34.0, h: 36.8, kind: 'frame' }, // 右下框 X 移至 65.0
    
    // === 原本大區塊標籤 (kind: 'frame-label') ===
    { label: '貨架', x: 16.8, y: 2.3, w: 5, h: 3.2, kind: 'frame-label' },
    { label: '4F出口', x: 45.3, y: 2.3, w: 6, h: 3.2, kind: 'frame-label' },
    { label: 'PP00', x: 0.6, y: 90.1, w: 9.5, h: 3.5, kind: 'frame-label' }, // 貼齊左下角
    { label: 'PQ00', x: 74.0, y: 22.8, w: 9.5, h: 4, kind: 'frame-label' }, // PQ00 標籤隨框架移至 74.0
    { label: 'FAE', x: 91.9, y: 26.9, w: 5, h: 4, kind: 'frame-label' }, // 置中在 FAE 框架內
    { label: 'PQ00', x: 79.0, y: 73.7, w: 9.5, h: 4, kind: 'frame-label' }, // PQ00 標籤隨框架移至 79.0
    
    // === 走道 (左半部，依 map.png 規劃，只留空白，無邊框，加大高度，只寫"走道"淺色字) ===
    { label: '走道', x: 2.0, y: 11.0, w: 60.0, h: 6.5, kind: 'walkway' }, // 烤箱上方走道
    { label: '走道', x: 2.0, y: 33.5, w: 60.0, h: 6.5, kind: 'walkway' }, // 第一排與第二排之間走道
    { label: '走道', x: 2.0, y: 55.5, w: 60.0, h: 6.5, kind: 'walkway' }, // 原第三排空下來的空間作為走道
    { label: '走道', x: 2.0, y: 63.5, w: 60.0, h: 6.5, kind: 'walkway' }, // 原第四排空下來的空間作為走道
    
    // === PC/設備/烤箱 (橫跨於第一條走道下方，灰底) ===
    { label: 'PC/設備/烤箱', x: 2.0, y: 18.0, w: 60.0, h: 7.2, kind: 'device' },
    
    // === UF3000 / Auto Hander (僅保留左半部 PP00 區設備，並在 Row 2 插入一台) ===
    { label: 'UF3000', x: 53.6, y: 25.5, w: 7.8, h: 7.2, kind: 'device' }, // Row 1 設備
    { label: '點針座2', x: 19.2, y: 25.5, w: 7.8, h: 7.2, kind: 'device' }, // Row 1 新增點針座2
    { label: 'UF3000', x: 19.2, y: 40.5, w: 7.8, h: 7.2, kind: 'device' }, // Row 2 新插入設備
    { label: '點針座1', x: 45.0, y: 40.5, w: 7.8, h: 7.2, kind: 'device' }, // Row 2 Ms3480#1 原本位置改點針座1
    { label: 'UF3000', x: 53.6, y: 48.5, w: 7.8, h: 7.2, kind: 'device' }, // Row 3 T5830ES_WBN3 右側新增設備
    { label: 'UF3000', x: 27.8, y: 71.5, w: 7.8, h: 7.2, kind: 'device' }, // Row 4 中間設備往下移
    { label: 'UF3000', x: 45.0, y: 71.5, w: 7.8, h: 7.2, kind: 'device' }, // Row 4 右側設備移到 45.0 且往下移
    { label: 'Auto Hander', x: 27.8, y: 78.5, w: 7.8, h: 7.2, kind: 'device' }, // Row 5 設備
];

const FLOOR_PLAN_EXITS = [];

const LOCAL_CLIENT_ID_KEY = 'jb-booking-client-id';
const SUPABASE_URL_PLACEHOLDER = 'REPLACE_WITH_SUPABASE_URL';
const SUPABASE_ANON_KEY_PLACEHOLDER = 'REPLACE_WITH_SUPABASE_ANON_KEY';

function hasSupabaseConfig() {
    return Boolean(BOOKING_CONFIG.supabaseUrl) && Boolean(BOOKING_CONFIG.supabaseAnonKey);
}

function getSupabaseBaseUrl() {
    return BOOKING_CONFIG.supabaseUrl ? BOOKING_CONFIG.supabaseUrl.replace(/\/$/, '') : '';
}

function getSupabaseTableUrl() {
    return `${getSupabaseBaseUrl()}/rest/v1/${BOOKING_CONFIG.supabaseTable}`;
}

function getSupabaseHeaders(extraHeaders = {}) {
    return {
        apikey: BOOKING_CONFIG.supabaseAnonKey,
        Authorization: `Bearer ${BOOKING_CONFIG.supabaseAnonKey}`,
        'Content-Type': 'application/json',
        ...extraHeaders,
    };
}

async function parseJsonSafe(response) {
    const raw = await response.text();
    if (!raw) {
        return {};
    }
    try {
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

function getClientIdentity() {
    const configuredClientId = String(BOOKING_CONFIG.clientId || '').trim();
    if (configuredClientId) {
        localStorage.setItem(LOCAL_CLIENT_ID_KEY, configuredClientId);
        return configuredClientId;
    }

    const cached = localStorage.getItem(LOCAL_CLIENT_ID_KEY);
    if (cached) {
        return cached;
    }

    const fallback = `WEB-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    localStorage.setItem(LOCAL_CLIENT_ID_KEY, fallback);
    return fallback;
}

function populateSelectOptions(selectId, options) {
    const select = document.getElementById(selectId);
    if (!select || !Array.isArray(options) || options.length === 0) {
        return;
    }

    const existingValues = new Set(Array.from(select.options).map((option) => option.value));
    options.forEach((optionValue) => {
        if (existingValues.has(optionValue)) {
            return;
        }
        const option = document.createElement('option');
        option.value = optionValue;
        option.textContent = optionValue;
        select.appendChild(option);
    });
}

function populateStaticSelectors() {
    populateSelectOptions('modalUnit', BOOKING_CONFIG.units);
}

function initializeScheduleViewControls() {
    const cardBtn = document.getElementById('cardViewBtn');
    const floorBtn = document.getElementById('floorViewBtn');

    if (cardBtn) {
        cardBtn.addEventListener('click', () => {
            currentViewMode = 'card';
            applyScheduleViewState();
            renderScheduleView();
        });
    }

    if (floorBtn) {
        floorBtn.addEventListener('click', () => {
            currentViewMode = 'floor';
            applyScheduleViewState();
            renderScheduleView();
        });
    }

    applyScheduleViewState();
}

function applyScheduleViewState() {
    const cardBtn = document.getElementById('cardViewBtn');
    const floorBtn = document.getElementById('floorViewBtn');
    const testerList = document.getElementById('testerList');
    const floorPlanView = document.getElementById('floorPlanView');
    const groupNav = document.getElementById('testerGroupNav');

    if (cardBtn) {
        cardBtn.classList.toggle('view-btn-active', currentViewMode === 'card');
    }
    if (floorBtn) {
        floorBtn.classList.toggle('view-btn-active', currentViewMode === 'floor');
    }
    if (testerList) {
        testerList.style.display = currentViewMode === 'card' ? 'block' : 'none';
    }
    if (floorPlanView) {
        floorPlanView.style.display = currentViewMode === 'floor' ? 'block' : 'none';
    }
    if (groupNav) {
        groupNav.style.display = currentViewMode === 'card' ? 'flex' : 'none';
    }
}

function buildFloorLayout() {
    const testerMachines = TESTERS.filter((tester) => /^(T|Ms)/i.test(String(tester)) && !HIDDEN_TESTERS.has(tester));
    const mapped = FLOOR_PLAN_TESTER_SLOTS.filter((slot) => testerMachines.includes(slot.tester));
    const mappedTesters = new Set(mapped.map((slot) => slot.tester));
    const remaining = testerMachines.filter((tester) => !mappedTesters.has(tester));

    const extraStartY = 84;
    remaining.forEach((tester, index) => {
        mapped.push({
            tester,
            x: 3 + (index % 4) * 12.5,
            y: extraStartY + Math.floor(index / 4) * 8.5,
            w: 11.5,
            h: 8,
        });
    });

    floorLayoutTesters = mapped;
}

function normalizeApiPayload(payload) {
    return payload && typeof payload === 'object' ? payload : {};
}

function buildSupabaseUrl(params = {}) {
    const url = new URL(getSupabaseTableUrl());
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, String(value));
        }
    });
    return url.toString();
}

async function requestBookingData(action, {
    method = 'GET',
    params = {},
    payload = {},
} = {}) {
    if (
        !hasSupabaseConfig() ||
        BOOKING_CONFIG.supabaseUrl.includes(SUPABASE_URL_PLACEHOLDER) ||
        BOOKING_CONFIG.supabaseAnonKey.includes(SUPABASE_ANON_KEY_PLACEHOLDER)
    ) {
        throw new Error('請先在 static/js/config.js 設定 Supabase URL / Anon Key');
    }

    if (action === 'appointments') {
        const data = await fetchAppointmentsByMonth(Number(params.year), Number(params.month));
        return { success: true, data };
    }

    if (action === 'all_appointments') {
        const data = await fetchAllAppointments();
        return { success: true, data };
    }

    if (action === 'refresh') {
        return { success: true };
    }

    if (action === 'save_appointment') {
        await saveAppointmentToSupabase(normalizeApiPayload(payload));
        return { success: true };
    }

    if (action === 'delete_appointment') {
        await deleteAppointmentFromSupabase(normalizeApiPayload(payload));
        return { success: true };
    }

    throw new Error(`不支援的操作: ${action}`);
}

async function fetchAppointmentsByMonth(year, month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const nextMonthDate = month === 12
        ? `${year + 1}-01-01`
        : `${year}-${String(month + 1).padStart(2, '0')}-01`;

    const url = new URL(getSupabaseTableUrl());
    url.searchParams.set('select', 'id,booking_date,tester,user_name,unit,start_time,end_time,client_id');
    url.searchParams.append('booking_date', `gte.${startDate}`);
    url.searchParams.append('booking_date', `lt.${nextMonthDate}`);
    url.searchParams.set('order', 'booking_date.asc,tester.asc,start_time.asc');

    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: getSupabaseHeaders(),
    });
    const rawRows = await parseJsonSafe(response);
    if (!response.ok) {
        throw new Error(rawRows.message || '載入 Supabase 資料失敗');
    }
    const rows = Array.isArray(rawRows) ? rawRows : [];

    return rowsToAppointments(rows);
}

async function fetchAllAppointments() {
    const url = buildSupabaseUrl({
        select: 'id,booking_date,tester,user_name,unit,start_time,end_time,client_id',
        order: 'booking_date.asc,tester.asc,start_time.asc',
    });
    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: getSupabaseHeaders(),
    });
    const rawRows = await parseJsonSafe(response);
    if (!response.ok) {
        throw new Error(rawRows.message || '讀取全量預約資料失敗');
    }
    const rows = Array.isArray(rawRows) ? rawRows : [];
    return rowsToAppointments(rows);
}

function rowsToAppointments(rows) {
    const grouped = {};
    rows.forEach((row) => {
        const date = String(row.booking_date || '').slice(0, 10);
        const tester = row.tester || '';
        if (!date || !tester) {
            return;
        }
        if (!grouped[date]) {
            grouped[date] = {};
        }
        if (!grouped[date][tester]) {
            grouped[date][tester] = [];
        }
        grouped[date][tester].push({
            name: row.user_name || '',
            unit: row.unit || '',
            start: row.start_time || '',
            end: row.end_time || '',
            computer: row.client_id || '',
        });
    });
    return grouped;
}

function hasTimeConflict(dateStr, testerName, start, end, ignoreStart = null) {
    const dayAppointments = ((appointments[dateStr] || {})[testerName] || []);
    const startMinutes = parseTimeToMinutes(start);
    const endMinutes = parseTimeToMinutes(end);

    return dayAppointments.some((appt) => {
        if (ignoreStart && appt.start === ignoreStart) {
            return false;
        }
        const existingStart = parseTimeToMinutes(appt.start);
        const existingEnd = parseTimeToMinutes(appt.end);
        return startMinutes < existingEnd && endMinutes > existingStart;
    });
}

function showTimeConflictAlert() {
    alert('⚠️ 此時段已有其他人預約，請改選其他時段。');
}

async function saveAppointmentToSupabase(payload) {
    const isEdit = payload.mode === 'update';
    if (hasTimeConflict(payload.date, payload.tester, payload.start, payload.end, isEdit ? payload.old_start : null)) {
        throw new Error('時間衝突，請調整時段');
    }

    if (isEdit && payload.old_start) {
        await deleteAppointmentFromSupabase({
            date: payload.date,
            tester: payload.tester,
            start: payload.old_start,
            computer: payload.computer || '',
        });
    }

    const insertBody = [{
        booking_date: payload.date,
        tester: payload.tester,
        user_name: payload.name,
        unit: payload.unit,
        start_time: payload.start,
        end_time: payload.end,
        client_id: payload.computer || '',
    }];

    const response = await fetch(getSupabaseTableUrl(), {
        method: 'POST',
        headers: getSupabaseHeaders({ Prefer: 'return=representation' }),
        body: JSON.stringify(insertBody),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
        throw new Error(data.message || '寫入 Supabase 失敗');
    }
}

async function deleteAppointmentFromSupabase(payload) {
    if (!payload.computer) {
        throw new Error('缺少客戶端識別，無法刪除');
    }

    const deleteUrl = buildSupabaseUrl({
        booking_date: `eq.${payload.date}`,
        tester: `eq.${payload.tester}`,
        start_time: `eq.${payload.start}`,
        client_id: `eq.${payload.computer}`,
    });
    const response = await fetch(deleteUrl.toString(), {
        method: 'DELETE',
        headers: getSupabaseHeaders({ Prefer: 'return=representation' }),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) {
        throw new Error(data.message || '刪除 Supabase 資料失敗');
    }
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error('僅能刪除本機建立的預約');
    }
}

// 工作時間列表
const WORK_HOURS = [
    ...Array.from({length: 16}, (_, i) => {
        const hour = i + 8;
        return [`${hour.toString().padStart(2, '0')}:00`, `${hour.toString().padStart(2, '0')}:30`];
    }).flat(),
    ...Array.from({length: 8}, (_, i) => {
        return [`${i.toString().padStart(2, '0')}:00`, `${i.toString().padStart(2, '0')}:30`];
    }).flat()
];

// 測試機台列表（從 HTML 全域變數取得）
let TESTERS = [];

// 初始化手機版選單控制
function initializeMobileMenu() {
    const menuToggleBtn = document.getElementById('menuToggleBtn');
    const menuCloseBtn = document.getElementById('menuCloseBtn');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebar = document.querySelector('.sidebar');

    if (!sidebar) return;

    const openMenu = () => {
        sidebar.classList.add('active');
        if (sidebarOverlay) {
            sidebarOverlay.classList.add('active');
        }
    };

    const closeMenu = () => {
        sidebar.classList.remove('active');
        if (sidebarOverlay) {
            sidebarOverlay.classList.remove('active');
        }
    };

    if (menuToggleBtn) {
        menuToggleBtn.addEventListener('click', openMenu);
    }

    if (menuCloseBtn) {
        menuCloseBtn.addEventListener('click', closeMenu);
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeMenu);
    }

    // 當切換卡片模式/平面圖模式時，自動收合側邊欄
    const cardBtn = document.getElementById('cardViewBtn');
    const floorBtn = document.getElementById('floorViewBtn');
    if (cardBtn) cardBtn.addEventListener('click', closeMenu);
    if (floorBtn) floorBtn.addEventListener('click', closeMenu);
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// 初始化應用程式
function initializeApp() {
    console.log('開始初始化應用程式...');
    
    TESTERS = TESTERS_SOURCE.filter((tester) => !HIDDEN_TESTERS.has(tester));
    if (TESTERS.length > 0) {
        console.log('成功載入 TESTERS，數量:', TESTERS.length);
    } else {
        console.error('警告：未找到 TESTERS_DATA 或 BOOKING_CONFIG.testers');
    }

    populateStaticSelectors();
    initializeClientIdentity();
    initializeScheduleViewControls();
    initializeMobileMenu(); // 呼叫手機選單初始化
    buildFloorLayout();
    
    updateMonthDisplay();
    
    // 初始化所選日期與右側大標題
    const titleEl = document.getElementById('selectedDateTitle');
    if (titleEl) {
        titleEl.textContent = `${formatDate(selectedDate)} 預約狀態`;
    }
    
    renderCalendar();
    initializeTimeSelectors();
    
    // 立即顯示機台列表（即使沒有預約資料）
    if (TESTERS.length > 0) {
        renderScheduleView();
    }
    
    // 然後載入預約資料
    loadAppointments();
}

// 初始化客戶端識別
function initializeClientIdentity() {
    computerName = getClientIdentity();
    console.log('客戶端識別:', computerName);
}

// 更新月份顯示
function updateMonthDisplay() {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const monthElement = document.getElementById('currentMonth');
    if (monthElement) {
        monthElement.textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
}

// 渲染日曆
function renderCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    if (!calendarGrid) return;
    
    calendarGrid.innerHTML = '';
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // 取得當月第一天和最後一天
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // 取得第一天是星期幾（0 = 星期日）
    const firstDayOfWeek = firstDay.getDay();
    
    // 填充上個月的日期
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const day = prevMonthLastDay - i;
        const dayElement = createDayElement(day, true, false);
        calendarGrid.appendChild(dayElement);
    }
    
    // 填充當月的日期
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(year, month, day);
        const isToday = isSameDay(date, new Date());
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const hasEvents = hasAppointmentsOnDate(date);
        
        const dayElement = createDayElement(day, false, isToday, isWeekend, hasEvents, date);
        calendarGrid.appendChild(dayElement);
    }
    
    // 填充下個月的日期
    const remainingDays = 42 - calendarGrid.children.length;
    for (let day = 1; day <= remainingDays; day++) {
        const dayElement = createDayElement(day, true, false);
        calendarGrid.appendChild(dayElement);
    }
}

// 建立日期元素
function createDayElement(day, isOtherMonth, isToday = false, isWeekend = false, hasEvents = false, date = null) {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    
    if (isOtherMonth) {
        dayElement.classList.add('other-month');
    }
    if (isToday) {
        dayElement.classList.add('today');
    }
    if (isWeekend) {
        dayElement.classList.add('weekend');
    }
    
    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = day;
    dayElement.appendChild(dayNumber);
    
    if (hasEvents) {
        const indicator = document.createElement('div');
        indicator.className = 'event-indicator';
        dayElement.appendChild(indicator);
    }
    
    if (date && !isOtherMonth) {
        dayElement.addEventListener('click', () => selectDate(date));
    }
    
    return dayElement;
}

// 檢查是否為同一天
function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

// 檢查日期是否有預約
function hasAppointmentsOnDate(date) {
    const dateStr = formatDate(date);
    return appointments[dateStr] && Object.keys(appointments[dateStr]).length > 0;
}

// 格式化日期為 YYYY-MM-DD
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 選擇日期
function selectDate(date) {
    selectedDate = date;
    const titleEl = document.getElementById('selectedDateTitle');
    if (titleEl) {
        titleEl.textContent = `${formatDate(date)} 預約狀態`;
    }
    renderCalendar();
    renderScheduleView();

    // 行動版在點選日期後自動收起側邊欄
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    if (sidebar && window.innerWidth <= 768) {
        sidebar.classList.remove('active');
        if (sidebarOverlay) {
            sidebarOverlay.classList.remove('active');
        }
    }
}

// 新增群組判斷函數
function getTesterGroup(testerName) {
    const name = String(testerName).toUpperCase();
    if (name.startsWith('T5385')) return 'T5385*';
    if (name.startsWith('T5830')) return 'T5830*';
    if (name.startsWith('MS34')) return 'MS34*';
    if (name.startsWith('T5833')) return 'T5833*';
    if (name.startsWith('T5781')) return 'T5781*';
    return 'Other';
}

// 渲染測試機台列表
function renderTesterList(date) {
    const testerList = document.getElementById('testerList');
    const groupNav = document.getElementById('testerGroupNav');
    if (!testerList) {
        console.error('找不到 testerList 元素');
        return;
    }
    
    if (!TESTERS || TESTERS.length === 0) {
        console.error('TESTERS 列表為空');
        testerList.innerHTML = '<div class="no-appointments">載入中...</div>';
        return;
    }
    
    console.log('渲染分組機台列表，日期:', date, 'TESTERS 數量:', TESTERS.length);
    
    testerList.innerHTML = '';
    if (groupNav) {
        groupNav.innerHTML = '';
    }
    
    const dateStr = formatDate(date);
    const dateAppointments = appointments[dateStr] || {};
    
    // 分組容器初始化
    const groups = {
        'T5385*': [],
        'T5830*': [],
        'MS34*': [],
        'T5833*': [],
        'T5781*': [],
        'Other': []
    };
    
    TESTERS.forEach(tester => {
        const groupKey = getTesterGroup(tester);
        groups[groupKey].push(tester);
    });
    
    // 渲染分組區塊與導覽書籤
    Object.entries(groups).forEach(([groupName, testersInGroup]) => {
        if (testersInGroup.length === 0) return;
        
        const groupNameSafe = groupName.replace('*', '');
        const sectionId = `group-section-${groupNameSafe}`;
        
        // 1. 動態建立導覽按鈕書籤
        if (groupNav) {
            const navBtn = document.createElement('button');
            navBtn.type = 'button';
            navBtn.className = 'group-nav-btn';
            navBtn.innerHTML = `📌 ${groupName}`;
            navBtn.onclick = () => {
                const targetSection = document.getElementById(sectionId);
                if (targetSection) {
                    targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            };
            groupNav.appendChild(navBtn);
        }
        
        // 2. 建立 Section 區塊
        const groupSection = document.createElement('div');
        groupSection.className = 'tester-group-section';
        groupSection.id = sectionId;
        
        const groupHeader = document.createElement('h3');
        groupHeader.className = 'tester-group-title';
        groupHeader.innerHTML = `📁 ${groupName} 系列 <span class="group-count">(${testersInGroup.length} 台)</span>`;
        groupSection.appendChild(groupHeader);
        
        const groupGrid = document.createElement('div');
        groupGrid.className = 'tester-group-grid';
        
        testersInGroup.forEach(tester => {
            const testerCard = createTesterCard(tester, dateAppointments[tester] || [], dateStr);
            groupGrid.appendChild(testerCard);
        });
        
        groupSection.appendChild(groupGrid);
        testerList.appendChild(groupSection);
    });
}

function renderFloorPlan(date) {
    const floorPlanCanvas = document.getElementById('floorPlanCanvas');
    const floorPlanTitle = document.getElementById('floorPlanTitle');
    if (!floorPlanCanvas) {
        return;
    }

    const dateStr = formatDate(date || selectedDate);
    const dateAppointments = appointments[dateStr] || {};
    const layout = floorLayoutTesters;

    if (floorPlanTitle) {
        floorPlanTitle.textContent = '竹北4F LAB';
    }

    floorPlanCanvas.innerHTML = '';

    FLOOR_PLAN_STATIC_BLOCKS.forEach((blockDef) => {
        const block = document.createElement('div');
        block.className = `floor-static-block ${blockDef.kind || 'machine'}`;
        block.style.left = `${blockDef.x}%`;
        block.style.top = `${blockDef.y}%`;
        block.style.width = `${blockDef.w}%`;
        block.style.height = `${blockDef.h}%`;
        block.textContent = blockDef.label;
        floorPlanCanvas.appendChild(block);
    });

    FLOOR_PLAN_EXITS.forEach((exitDef) => {
        const exitMarker = document.createElement('div');
        exitMarker.className = 'exit-marker';
        exitMarker.style.left = `${exitDef.x}%`;
        exitMarker.style.top = `${exitDef.y}%`;
        exitMarker.textContent = exitDef.label;
        floorPlanCanvas.appendChild(exitMarker);
    });

    if (layout.length === 0) {
        const noData = document.createElement('div');
        noData.className = 'no-appointments';
        noData.textContent = '目前沒有可顯示的 T* 機台配置';
        noData.style.position = 'absolute';
        noData.style.left = '4%';
        noData.style.top = '45%';
        noData.style.width = '92%';
        floorPlanCanvas.appendChild(noData);
        return;
    }

    layout.forEach((slot) => {
        const machineAppointments = dateAppointments[slot.tester] || [];
        const block = document.createElement('button');
        block.type = 'button';
        block.className = 'tester-block';
        if (machineAppointments.length > 0) {
            block.classList.add('has-booking');
        }
        block.style.left = `${slot.x}%`;
        block.style.top = `${slot.y}%`;
        block.style.width = `${FLOOR_PLAN_BLOCK_SIZE.w}%`;
        block.style.height = `${FLOOR_PLAN_BLOCK_SIZE.h}%`;

        const bookingText = machineAppointments.length > 0
            ? `${machineAppointments.length} 筆預約`
            : '可預約';

        block.innerHTML = `
            <div class="tester-block-name">${slot.tester}</div>
            <div class="tester-block-status">${bookingText}</div>
        `;

        block.addEventListener('click', () => {
            openAppointmentModal(slot.tester, dateStr);
        });

        floorPlanCanvas.appendChild(block);
    });
}

function renderScheduleView() {
    applyScheduleViewState();
    renderTesterList(selectedDate);
    if (currentViewMode === 'floor') {
        renderFloorPlan(selectedDate);
    }
}

// 建立測試機台卡片
function createTesterCard(testerName, testerAppointments, dateStr) {
    const card = document.createElement('div');
    card.className = 'tester-card';
    
    const header = document.createElement('div');
    header.className = 'tester-header';
    
    const name = document.createElement('div');
    name.className = 'tester-name';
    name.textContent = testerName;
    
    const status = document.createElement('div');
    status.className = 'tester-status';
    status.textContent = testerAppointments.length > 0 ? `已預約 ${testerAppointments.length} 個時段` : '可預約';
    
    header.appendChild(name);
    header.appendChild(status);
    card.appendChild(header);
    
    const cardBody = document.createElement('div');
    cardBody.className = 'tester-body';

    const appointmentsContainer = document.createElement('div');
    appointmentsContainer.className = 'tester-appointments';
    
    if (testerAppointments.length === 0) {
        const noAppt = document.createElement('div');
        noAppt.className = 'no-appointments';
        noAppt.textContent = '目前無預約';
        appointmentsContainer.appendChild(noAppt);
    } else {
        testerAppointments.forEach(appt => {
            const apptItem = createAppointmentItem(appt, testerName, dateStr);
            appointmentsContainer.appendChild(apptItem);
        });
    }
    
    const totalDayMinutes = 12 * 60;
    const bookedMinutes = testerAppointments.reduce((total, appointment) => {
        const start = parseTimeToMinutes(appointment.start || '00:00');
        const end = parseTimeToMinutes(appointment.end || '00:00');
        return end > start ? total + (end - start) : total;
    }, 0);
    const usagePct = Math.min(100, Math.max(0, (bookedMinutes / totalDayMinutes) * 100));

    const meterPanel = document.createElement('div');
    meterPanel.className = 'tester-meter';
    meterPanel.innerHTML = `
        <div class="meter-ring" style="--meter-value: ${usagePct.toFixed(2)}%;">
            <div class="meter-inner">
                <div class="meter-value">${Math.round(usagePct)}%</div>
            </div>
        </div>
        <div class="meter-label">當日使用率</div>
        <div class="meter-caption">${(bookedMinutes / 60).toFixed(1)}h / 12h</div>
    `;

    cardBody.appendChild(appointmentsContainer);
    cardBody.appendChild(meterPanel);
    card.appendChild(cardBody);
    
    // 新增預約按鈕
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-primary tester-add-btn';
    addBtn.textContent = '新增預約';
    addBtn.onclick = () => openAppointmentModal(testerName, dateStr);
    card.appendChild(addBtn);
    
    return card;
}

// 建立預約項目
function createAppointmentItem(appointment, testerName, dateStr) {
    const item = document.createElement('div');
    item.className = 'appointment-item';
    
    const info = document.createElement('div');
    info.className = 'appointment-info';
    
    const time = document.createElement('div');
    time.className = 'appointment-time';
    time.textContent = `${appointment.start} - ${appointment.end}`;
    
    const details = document.createElement('div');
    details.className = 'appointment-details';
    details.textContent = `${appointment.name} (${appointment.unit})`;
    
    info.appendChild(time);
    info.appendChild(details);
    
    const actions = document.createElement('div');
    actions.className = 'appointment-actions';
    
    // 編輯按鈕
    const editBtn = document.createElement('button');
    editBtn.className = 'btn-edit';
    editBtn.textContent = '編輯';
    const isOwner = !appointment.computer || appointment.computer === computerName;
    if (!isOwner) {
        editBtn.disabled = true;
        editBtn.title = '僅建立此預約的電腦可編輯';
    }
    editBtn.onclick = () => editAppointment(dateStr, testerName, appointment);
    actions.appendChild(editBtn);
    
    // 刪除按鈕
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete';
    deleteBtn.textContent = '刪除';
    if (!isOwner) {
        deleteBtn.disabled = true;
        deleteBtn.title = '僅建立此預約的電腦可刪除';
    }
    deleteBtn.onclick = () => deleteAppointment(dateStr, testerName, appointment.start, appointment.computer || '');
    actions.appendChild(deleteBtn);
    
    item.appendChild(info);
    item.appendChild(actions);
    
    return item;
}

// 載入預約資料
async function loadAppointments() {
    showLoading();
    try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;

        console.log(`載入預約資料: ${year}/${month}`);

        const data = await requestBookingData('appointments', {
            method: 'GET',
            params: { year, month },
        });

        console.log('API 回應:', data);

        appointments = data.data || {};
        renderCalendar();
        renderScheduleView();
        console.log('資料載入成功');
    } catch (error) {
        console.error('載入錯誤:', error);
        showNotification('載入失敗: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// 重新整理資料
async function refreshData() {
    showLoading();
    try {
        await requestBookingData('refresh', {
            method: 'POST',
            payload: { clientId: computerName },
        });
        await loadAppointments();
        showNotification('重新整理成功', 'success');
    } catch (error) {
        showNotification('重新整理失敗: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// 更新彈窗中的今日已預約時段
function updateModalTodayAppointments(testerName, dateStr, currentStart = null) {
    const dateAppointments = appointments[dateStr] || {};
    const machineAppointments = dateAppointments[testerName] || [];
    
    const apptsContainer = document.getElementById('modalTodayAppointments');
    if (!apptsContainer) return;
    
    apptsContainer.innerHTML = '';
    if (machineAppointments.length === 0) {
        apptsContainer.innerHTML = '<div class="modal-no-appt">🟢 本日尚無其他預約，時段皆可選擇</div>';
    } else {
        machineAppointments.forEach(appt => {
            const item = document.createElement('div');
            item.className = 'modal-appt-item';
            const isCurrent = currentStart && appt.start === currentStart;
            if (isCurrent) {
                item.classList.add('current-editing');
                item.innerHTML = `🔵 <strong>${appt.start} - ${appt.end}</strong> : ${appt.name} (${appt.unit}) <span class="editing-tag">(本次編輯中)</span>`;
            } else {
                item.innerHTML = `🔴 <strong>${appt.start} - ${appt.end}</strong> : ${appt.name} (${appt.unit})`;
            }
            apptsContainer.appendChild(item);
        });
    }
}

// 開啟預約對話框（新增模式）
function openAppointmentModal(testerName, dateStr) {
    currentEditingAppointment = null; // 清除編輯狀態
    selectedTester = testerName;
    selectedDay = dateStr;
    
    document.getElementById('modalTitle').textContent = '預約資訊輸入';
    document.getElementById('modalTester').value = testerName;
    document.getElementById('modalDate').value = dateStr;
    document.getElementById('modalName').value = '';
    document.getElementById('modalUnit').value = '';
    
    // 重置時間選擇器
    const startTimeSelect = document.getElementById('modalStartTime');
    const endTimeSelect = document.getElementById('modalEndTime');
    if (startTimeSelect.options.length > 0) {
        startTimeSelect.selectedIndex = 0;
        startTimeSelect.dispatchEvent(new Event('change'));
    }
    
    // 渲染當日已預約時段
    updateModalTodayAppointments(testerName, dateStr);
    
    document.getElementById('appointmentModal').style.display = 'block';
}

// 編輯預約
function editAppointment(dateStr, testerName, appointment) {
    if (appointment.computer && appointment.computer !== computerName) {
        showNotification('這筆預約不是由本機建立，無法編輯', 'error');
        return;
    }

    currentEditingAppointment = {
        date: dateStr,
        tester: testerName,
        oldStart: appointment.start
    };
    
    selectedTester = testerName;
    selectedDay = dateStr;
    
    document.getElementById('modalTitle').textContent = '編輯預約';
    document.getElementById('modalTester').value = testerName;
    document.getElementById('modalDate').value = dateStr;
    document.getElementById('modalName').value = appointment.name;
    document.getElementById('modalUnit').value = appointment.unit;
    
    // 設定時間
    const startTimeSelect = document.getElementById('modalStartTime');
    const endTimeSelect = document.getElementById('modalEndTime');
    
    startTimeSelect.value = appointment.start;
    startTimeSelect.dispatchEvent(new Event('change'));
    endTimeSelect.value = appointment.end;
    
    // 渲染當日已預約時段 (排除或標註自身)
    updateModalTodayAppointments(testerName, dateStr, appointment.start);
    
    document.getElementById('appointmentModal').style.display = 'block';
}

// 關閉對話框
function closeModal() {
    document.getElementById('appointmentModal').style.display = 'none';
    currentEditingAppointment = null;
}

// 儲存預約
async function saveAppointment() {
    const name = document.getElementById('modalName').value.trim();
    const unit = document.getElementById('modalUnit').value;
    const start = document.getElementById('modalStartTime').value;
    const end = document.getElementById('modalEndTime').value;
    
    if (!name) {
        showNotification('請輸入姓名', 'error');
        return;
    }
    
    if (!unit) {
        showNotification('請選擇部門', 'error');
        return;
    }
    
    if (!start || !end) {
        showNotification('請選擇開始和結束時間', 'error');
        return;
    }
    
    if (start >= end) {
        showNotification('結束時間必須晚於開始時間', 'error');
        return;
    }

    const isEdit = currentEditingAppointment !== null;
    if (hasTimeConflict(selectedDay, selectedTester, start, end, isEdit ? currentEditingAppointment.oldStart : null)) {
        showTimeConflictAlert();
        showNotification('此時段已有其他人預約', 'error');
        return;
    }
    
    showLoading();
    try {
        const payload = {
            date: selectedDay,
            tester: selectedTester,
            name: name,
            unit: unit,
            start: start,
            end: end,
            computer: computerName
        };
        
        // 如果是編輯模式，加入舊的開始時間
        if (isEdit) {
            payload.old_start = currentEditingAppointment.oldStart;
        }

        await requestBookingData('save_appointment', {
            method: 'POST',
            payload: {
                ...payload,
                mode: isEdit ? 'update' : 'create',
            },
        });
        closeModal();
        await loadAppointments();
        showNotification(isEdit ? '預約已更新' : '預約成功', 'success');
    } catch (error) {
        if (String(error.message || '').includes('時間衝突')) {
            showTimeConflictAlert();
        }
        showNotification((isEdit ? '更新' : '預約') + '失敗: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// 刪除預約
async function deleteAppointment(dateStr, testerName, startTime, ownerComputer = '') {
    if (ownerComputer && ownerComputer !== computerName) {
        showNotification('這筆預約不是由本機建立，無法刪除', 'error');
        return;
    }

    if (!confirm('確定要刪除此預約嗎？')) {
        return;
    }
    
    showLoading();
    try {
        const payload = {
            date: dateStr,
            tester: testerName,
            start: startTime,
            computer: computerName,
        };

        await requestBookingData('delete_appointment', {
            method: 'POST',
            payload,
        });
        await loadAppointments();
        showNotification('刪除成功', 'success');
    } catch (error) {
        showNotification('刪除失敗: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// 初始化時間選擇器
function initializeTimeSelectors() {
    const startTimeSelect = document.getElementById('modalStartTime');
    const endTimeSelect = document.getElementById('modalEndTime');
    
    if (startTimeSelect && endTimeSelect) {
        // 填充開始時間選項
        WORK_HOURS.forEach(time => {
            const option = document.createElement('option');
            option.value = time;
            option.textContent = time;
            startTimeSelect.appendChild(option);
        });
        
        // 開始時間變更時更新結束時間選項
        startTimeSelect.addEventListener('change', function() {
            const startIdx = WORK_HOURS.indexOf(this.value);
            endTimeSelect.innerHTML = '';
            
            WORK_HOURS.slice(startIdx + 1).forEach(time => {
                const option = document.createElement('option');
                option.value = time;
                option.textContent = time;
                endTimeSelect.appendChild(option);
            });
            
            if (endTimeSelect.options.length > 0) {
                endTimeSelect.selectedIndex = Math.min(3, endTimeSelect.options.length - 1);
            }
        });
        
        // 觸發初始化
        if (startTimeSelect.options.length > 0) {
            startTimeSelect.selectedIndex = 0;
            startTimeSelect.dispatchEvent(new Event('change'));
        }
    }
}

// 上個月
function previousMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    updateMonthDisplay();
    loadAppointments();
}

// 下個月
function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    updateMonthDisplay();
    loadAppointments();
}

// 回到今天
function goToToday() {
    currentDate = new Date();
    selectedDate = new Date();
    updateMonthDisplay();
    loadAppointments();
}

// 匯出報告
function exportReport() {
    exportFullReport();
}

// 顯示載入中
function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

// 隱藏載入中
function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

// 顯示通知
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// 點擊對話框外部關閉
window.onclick = function(event) {
    const modal = document.getElementById('appointmentModal');
    const monthlyModal = document.getElementById('monthlyReportModal');
    if (event.target === modal) {
        closeModal();
    } else if (event.target === monthlyModal) {
        closeMonthlyReport();
    }
}

// ============ 報告功能 ============

function collectAppointmentsForReport() {
    const rows = [];
    Object.entries(appointments).forEach(([dateStr, testers]) => {
        Object.entries(testers).forEach(([tester, appts]) => {
            appts.forEach((appt) => {
                rows.push({
                    date: dateStr,
                    tester,
                    department: appt.unit || appt.dept || '',
                    name: appt.name || '',
                    start: appt.start || '',
                    end: appt.end || '',
                    computer: appt.computer || computerName || '',
                });
            });
        });
    });
    return rows.sort((a, b) => a.date.localeCompare(b.date) || a.tester.localeCompare(b.tester) || a.start.localeCompare(b.start));
}

function buildMonthlyReportData() {
    const deptStats = {};
    let totalHours = 0;

    collectAppointmentsForReport().forEach((row) => {
        const dept = row.department || 'Unknown';
        if (!deptStats[dept]) {
            deptStats[dept] = { count: 0, hours: 0, testers: new Set() };
        }

        const startTime = row.start || '00:00';
        const endTime = row.end || '00:00';
        const startMinutes = parseTimeToMinutes(startTime);
        const endMinutes = parseTimeToMinutes(endTime);
        const durationHours = endMinutes > startMinutes ? (endMinutes - startMinutes) / 60 : 0;

        deptStats[dept].count += 1;
        deptStats[dept].hours += durationHours;
        deptStats[dept].testers.add(row.tester);
        totalHours += durationHours;
    });

    const result = {};
    Object.entries(deptStats)
        .sort((a, b) => b[1].hours - a[1].hours)
        .forEach(([dept, stats]) => {
            result[dept] = {
                count: stats.count,
                hours: stats.hours,
                testers: Array.from(stats.testers).sort(),
                percentage: totalHours > 0 ? (stats.hours / totalHours) * 100 : 0,
            };
        });

    return {
        total_departments: Object.keys(result).length,
        total_bookings: Object.values(result).reduce((sum, stats) => sum + stats.count, 0),
        total_hours: totalHours,
        departments: result,
    };
}

function parseTimeToMinutes(timeText) {
    const [hours, minutes] = String(timeText).split(':').map((part) => Number(part));
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        return 0;
    }
    return hours * 60 + minutes;
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function downloadTextFile(filename, content, mimeType = 'text/plain;charset=utf-8') {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(anchor);
}

async function getAllAppointmentsForExport() {
    const data = await requestBookingData('all_appointments', {
        method: 'GET',
    });
    return data.data || {};
}

// 匯出完整報告
async function exportFullReport() {
    try {
        showLoading();

        const allAppointments = await getAllAppointmentsForExport();
        const csvRows = [['Date', 'Tester', 'Department', 'User', 'Start Time', 'End Time', 'Computer']];
        Object.entries(allAppointments).forEach(([dateStr, testers]) => {
            Object.entries(testers).forEach(([tester, appts]) => {
                appts.forEach((appt) => {
                    csvRows.push([
                        dateStr,
                        tester,
                        appt.unit || appt.dept || '',
                        appt.name || '',
                        appt.start || '',
                        appt.end || '',
                        appt.computer || '',
                    ]);
                });
            });
        });
        const csvContent = csvRows
            .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        downloadTextFile(`booking_report_${new Date().toISOString().slice(0, 10)}.csv`, csvContent, 'text/csv;charset=utf-8');
        showNotification('報告已匯出為 CSV', 'success');
    } catch (error) {
        showNotification('匯出失敗: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// 顯示當月報告
async function showMonthlyReport() {
    try {
        showLoading();
        const reportData = buildMonthlyReportData();
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'];
        document.getElementById('monthlyReportTitle').textContent =
            `當月報告 - ${monthNames[month - 1]} ${year}`;

        const deptEntries = Object.entries(reportData.departments);
        const topDept = deptEntries[0]?.[0] || 'N/A';
        document.getElementById('monthlySummary').innerHTML = `
            <div class="kpi-card">
                <div class="kpi-label">總部門數</div>
                <div class="kpi-value accent">${reportData.total_departments}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">總預約次數</div>
                <div class="kpi-value accent">${reportData.total_bookings}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">總使用時數</div>
                <div class="kpi-value accent">${reportData.total_hours.toFixed(2)} h</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Top 部門</div>
                <div class="kpi-value">${escapeHtml(topDept)}</div>
            </div>
        `;

        const barsContainer = document.getElementById('monthlyDeptBars');
        barsContainer.innerHTML = deptEntries
            .slice(0, 8)
            .map(([dept, stats]) => `
                <div class="dept-bar-row">
                    <div class="dept-name">${escapeHtml(dept)}</div>
                    <div class="dept-track">
                        <div class="dept-fill" style="width: ${Math.max(3, Math.min(100, stats.percentage)).toFixed(2)}%;"></div>
                    </div>
                    <div class="dept-pct">${stats.percentage.toFixed(1)}%</div>
                </div>
            `)
            .join('');
        if (deptEntries.length === 0) {
            barsContainer.innerHTML = '<div class="no-appointments">本月尚無可視化資料</div>';
        }

        const tbody = document.getElementById('monthlyReportTableBody');
        tbody.innerHTML = '';

        deptEntries.forEach(([dept, stats], index) => {
            const row = document.createElement('tr');
            row.style.backgroundColor = index % 2 === 0 ? 'var(--surface)' : 'var(--background)';
            row.innerHTML = `
                <td>${escapeHtml(dept)}</td>
                <td>${stats.count}</td>
                <td>${stats.hours.toFixed(2)}</td>
                <td>${stats.percentage.toFixed(2)}%</td>
                <td>${escapeHtml(stats.testers.join(', '))}</td>
            `;
            tbody.appendChild(row);
        });
        if (deptEntries.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="5" class="no-appointments">本月尚無預約資料</td>';
            tbody.appendChild(row);
        }

        document.getElementById('monthlyReportModal').style.display = 'flex';
    } catch (error) {
        showNotification('載入報告失敗: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// 關閉當月報告
function closeMonthlyReport() {
    document.getElementById('monthlyReportModal').style.display = 'none';
}

// 匯出當月報告 Excel
async function exportMonthlyReportExcel() {
    try {
        showLoading();

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const reportData = buildMonthlyReportData();
        const csvRows = [['Department', 'Bookings', 'Hours', 'Percent', 'Unique Testers']];
        Object.entries(reportData.departments).forEach(([dept, stats]) => {
            csvRows.push([
                dept,
                stats.count,
                stats.hours.toFixed(2),
                stats.percentage.toFixed(2),
                stats.testers.join(' | '),
            ]);
        });
        const csvContent = csvRows
            .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        downloadTextFile(`monthly_report_${year}_${month.toString().padStart(2, '0')}.csv`, csvContent, 'text/csv;charset=utf-8');
        showNotification('當月報告已匯出為 CSV', 'success');
    } catch (error) {
        showNotification('匯出失敗: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

