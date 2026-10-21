// ============================================================================
// Dongle Program Generator — Web Application Core
// 100% Byte-Compatible with Dongle_UserSetting_V2.exe (0x3000 Binary Spec)
// ============================================================================

const PATTERN_SIZE = 2048;        // 0x800
const PATTERN_BLOCK_SIZE = 64;    // 0x40 (32 blocks)
const BIN_TOTAL_SIZE = 0x3000;    // 12,288 bytes

const LOG_REGION_SIZE = 4194304;  // 4 MB
const LOG_SLOT_MAX = 2048;
const LOG_SLOT_MIN = 16;
const LOG_PS_ARRAY_SIZE = 1024;

const SECTORS_PER_UNIT = { 0: 1, 1: 8, 2: 16 };
const SCALE_NAME = {
  0: 'Sector(4KB)',
  1: 'Half-Block(32KB)',
  2: 'Block(64KB)'
};
const UNIT_BYTES = {
  0: 4096,
  1: 32768,
  2: 65536
};

// Application State
const state = {
  activeTab: 'select', // 'select' | 'unselect' | 'initial' | 'timesel'
  activePatternType: 'select', // 'select' | 'unselect'
  selPattern: new Uint8Array(PATTERN_SIZE),
  unselPattern: new Uint8Array(PATTERN_SIZE),
  areas: {
    select: new Array(128).fill(false),
    unselect: new Array(128).fill(false),
    initial: new Array(128).fill(false),
    timesel: new Array(128).fill(false)
  },
  suggestedSaveFlag: null
};

// Helper: Today's YYYYMMDD
function getTodayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

// Helper: GetLogSlot (Matches Python GetLogSlot)
function getLogSlot(recordSize) {
  let slot = LOG_SLOT_MIN;
  while (slot < recordSize && slot < LOG_SLOT_MAX) {
    slot *= 2;
  }
  return slot;
}

// Helper: ParsePatternByte (Matches Python ParsePatternByte)
function parsePatternByte(hexText) {
  const normalized = String(hexText || '').trim().toLowerCase();
  if (normalized.length === 0 || normalized.length > 2 || !/^[0-9a-f]+$/.test(normalized)) {
    throw new Error('請輸入 00 至 ff 的 HEX 值，不含 0x 或 h。');
  }
  return parseInt(normalized, 16);
}

// Helper: FormatPatternData (Matches Python FormatPatternData)
function formatPatternData(patternData) {
  const lines = [];
  for (let offset = 0; offset < PATTERN_SIZE; offset += 16) {
    const slice = patternData.subarray(offset, offset + 16);
    const hexParts = [];
    let asciiPart = '';
    for (let i = 0; i < slice.length; i++) {
      const val = slice[i];
      hexParts.push(val.toString(16).padStart(2, '0'));
      asciiPart += (val >= 32 && val <= 126) ? String.fromCharCode(val) : '.';
    }
    const hexStr = hexParts.join(' ').padEnd(47, ' ');
    lines.push(`${offset.toString(16).padStart(4, '0')}       ${hexStr}  ${asciiPart}`);
  }
  return lines.join('\n');
}

// Summarize Pattern Badge
function getPatternSummaryText(buf) {
  let allSame = true;
  const first = buf[0];
  let isSeq = true;
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] !== first) allSame = false;
    if (buf[i] !== (i & 0xff)) isSeq = false;
  }
  if (allSame) return `All 0x${first.toString(16).padStart(2, '0').toUpperCase()}`;
  if (isSeq) return 'Seq 00-FF';
  return 'Custom BIN';
}

function isAllZeroPattern(buf) {
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] !== 0) return false;
  }
  return true;
}

// Form Getters & Setters
function getRadioValue(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : '0';
}

function setRadioValue(name, val) {
  const strVal = String(val);
  const el = document.querySelector(`input[name="${name}"][value="${strVal}"]`);
  if (el) el.checked = true;
}

function syncDelayInputs() {
  const eraseMode = getRadioValue('eraseDelayMode');
  const pgmMode = getRadioValue('pgmDelayMode');
  document.getElementById('inputEraseDelayTime').disabled = (eraseMode !== '1');
  document.getElementById('inputPGMDelayTime').disabled = (pgmMode !== '1');
}

// Dialog Helper (Replaces tkinter messagebox)
function showDialog({ title, message, type = 'info', confirmText = '確定', cancelText = null }) {
  return new Promise((resolve) => {
    const modal = document.getElementById('dialogModal');
    const titleEl = document.getElementById('dialogTitle');
    const msgEl = document.getElementById('dialogMessage');
    const footerEl = document.getElementById('dialogFooter');
    const closeBtn = document.getElementById('btnCloseDialog');

    titleEl.textContent = title;
    msgEl.textContent = message;
    footerEl.innerHTML = '';

    const cleanup = (result) => {
      modal.hidden = true;
      resolve(result);
    };

    closeBtn.onclick = () => cleanup(false);

    if (cancelText) {
      const btnCancel = document.createElement('button');
      btnCancel.type = 'button';
      btnCancel.className = 'btn btn-ghost';
      btnCancel.textContent = cancelText;
      btnCancel.onclick = () => cleanup(false);
      footerEl.appendChild(btnCancel);
    }

    const btnOk = document.createElement('button');
    btnOk.type = 'button';
    btnOk.className = type === 'error' ? 'btn btn-secondary' : 'btn btn-primary';
    btnOk.textContent = confirmText;
    btnOk.onclick = () => cleanup(true);
    footerEl.appendChild(btnOk);

    modal.hidden = false;
  });
}

// Build 8x16 Matrix UI
function renderMatrix() {
  const grid = document.getElementById('matrixGrid');
  grid.innerHTML = '';

  const activeArea = state.areas[state.activeTab];
  const startHex = document.getElementById('inputAddrStart').value.trim() || '0';
  const startAddr = parseInt(startHex, 16) || 0;

  let scaleKey = 2;
  if (state.activeTab === 'select' || state.activeTab === 'timesel') {
    scaleKey = parseInt(getRadioValue('selScale'), 10);
  } else if (state.activeTab === 'unselect') {
    scaleKey = parseInt(getRadioValue('verScale'), 10);
  } else if (state.activeTab === 'initial') {
    scaleKey = parseInt(getRadioValue('preScale'), 10);
  }
  const unitSize = UNIT_BYTES[scaleKey] || 65536;

  for (let i = 0; i < 128; i++) {
    const hexLabel = `0x${i.toString(16)}`;
    const cell = document.createElement('div');
    cell.className = 'matrix-cell';
    if (activeArea[i]) {
      cell.classList.add(`checked-${state.activeTab}`);
    }
    if (state.activeTab === 'timesel' && state.areas.timesel[i] && !state.areas.select[i]) {
      cell.classList.add('invalid-timesel');
    }

    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = activeArea[i];
    chk.style.pointerEvents = 'none';

    const span = document.createElement('span');
    span.textContent = hexLabel;

    // Mini cross-tab dots
    const dots = document.createElement('div');
    dots.className = 'cell-dots';
    if (state.areas.select[i]) {
      const d = document.createElement('span');
      d.className = 'cell-mini-dot';
      d.style.background = 'var(--accent-cyan)';
      dots.appendChild(d);
    }
    if (state.areas.unselect[i]) {
      const d = document.createElement('span');
      d.className = 'cell-mini-dot';
      d.style.background = 'var(--accent-purple)';
      dots.appendChild(d);
    }
    if (state.areas.initial[i]) {
      const d = document.createElement('span');
      d.className = 'cell-mini-dot';
      d.style.background = 'var(--accent-orange)';
      dots.appendChild(d);
    }
    if (state.areas.timesel[i]) {
      const d = document.createElement('span');
      d.className = 'cell-mini-dot';
      d.style.background = 'var(--accent-green)';
      dots.appendChild(d);
    }

    cell.appendChild(chk);
    cell.appendChild(span);
    cell.appendChild(dots);

    const addrFrom = (startAddr + i * unitSize) >>> 0;
    const addrTo = (addrFrom + unitSize - 1) >>> 0;
    const addrInfo = `單位 ${hexLabel} (#${i}) | 實體位址: 0x${addrFrom.toString(16).toUpperCase().padStart(8, '0')} ~ 0x${addrTo.toString(16).toUpperCase().padStart(8, '0')} (${SCALE_NAME[scaleKey]})`;

    cell.addEventListener('mouseenter', () => {
      document.getElementById('matrixHoverInfo').textContent = addrInfo;
    });

    cell.addEventListener('click', () => {
      activeArea[i] = !activeArea[i];
      updateAllUI();
    });

    grid.appendChild(cell);
  }

  // Selected indices summary
  const selectedHexes = [];
  for (let i = 0; i < 128; i++) {
    if (activeArea[i]) selectedHexes.push(`0x${i.toString(16)}`);
  }
  const listEl = document.getElementById('matrixSelectedList');
  if (selectedHexes.length === 0) {
    listEl.textContent = '已勾選: 無 (0 個)';
  } else if (selectedHexes.length <= 14) {
    listEl.textContent = `已勾選 (${selectedHexes.length}): ${selectedHexes.join(', ')}`;
  } else {
    listEl.textContent = `已勾選 (${selectedHexes.length}): ${selectedHexes.slice(0, 12).join(', ')} ...`;
  }
}

// Update Telemetry, Capacity, Warnings, and Memory Map
function updateAllUI() {
  syncDelayInputs();

  const selCount = state.areas.select.filter(Boolean).length;
  const unselCount = state.areas.unselect.filter(Boolean).length;
  const preCount = state.areas.initial.filter(Boolean).length;
  const timeCount = state.areas.timesel.filter(Boolean).length;

  document.getElementById('statSelCount').textContent = selCount;
  document.getElementById('statUnselCount').textContent = unselCount;
  document.getElementById('statPreCount').textContent = preCount;
  document.getElementById('statTimeCount').textContent = timeCount;

  document.getElementById('tabCountSelect').textContent = selCount;
  document.getElementById('tabCountUnselect').textContent = unselCount;
  document.getElementById('tabCountInitial').textContent = preCount;
  document.getElementById('tabCountTimesel').textContent = timeCount;

  // Check if any timesel unit is outside select area
  let hasInvalidTimeSel = false;
  for (let i = 0; i < 128; i++) {
    if (state.areas.timesel[i] && !state.areas.select[i]) {
      hasInvalidTimeSel = true;
      break;
    }
  }
  document.getElementById('timeSelWarning').hidden = !hasInvalidTimeSel;

  // Pattern badges
  const selSummary = getPatternSummaryText(state.selPattern);
  const unselSummary = getPatternSummaryText(state.unselPattern);
  document.getElementById('badgeSelPattern').textContent = selSummary;
  document.getElementById('badgeUnselPattern').textContent = unselSummary;

  // Address foot
  const rawAddr = (document.getElementById('inputAddrStart').value.trim() || '0').replace(/^0x/i, '');
  const parsedAddr = parseInt(rawAddr, 16);
  const validAddrHex = Number.isNaN(parsedAddr) ? 'INVALID' : `0x${(parsedAddr >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
  document.getElementById('kpiAddressFoot').textContent = `起始位址: ${validAddrHex}`;

  // Auto-suggest save interval if log records exceed capacity
  const selectScale = parseInt(getRadioValue('selScale'), 10);
  const sectors = SECTORS_PER_UNIT[selectScale] || 16;
  const tsan = timeCount;
  const recordPgm = 2 * sectors * tsan;
  const cyclingTimes = parseInt(document.getElementById('inputCytimes').value, 10) || 0;
  const saveFlag = parseInt(document.getElementById('inputSaveTimes').value, 10) || 0;
  const slotPgm = getLogSlot(Math.max(recordPgm, 1));
  const slotErase = getLogSlot(Math.max(2 * tsan, 1));
  const maxRecord = Math.min(
    Math.floor(LOG_REGION_SIZE / slotPgm),
    Math.floor(LOG_REGION_SIZE / slotErase)
  );
  const recordCount = saveFlag > 0 ? (Math.floor(cyclingTimes / saveFlag) + 2) : 0;
  const btnSuggest = document.getElementById('btnAutoSuggestSave');

  if (cyclingTimes > 0 && saveFlag > 0 && tsan > 0 && recordCount > maxRecord) {
    const denom = Math.max(maxRecord - 2, 1);
    const suggest = Math.ceil(cyclingTimes / denom);
    state.suggestedSaveFlag = suggest;
    btnSuggest.textContent = `建議改為 >= ${suggest}`;
    btnSuggest.hidden = false;
  } else {
    state.suggestedSaveFlag = null;
    btnSuggest.hidden = true;
  }

  renderMatrix();
}

// Build the exact 0x3000 (12,288 bytes) Uint8Array matching save_file()
function buildBinBuffer() {
  const buf = new Uint8Array(BIN_TOTAL_SIZE); // zero-initialized
  const view = new DataView(buf.buffer);

  // 0x0000: b'Dongle_By_YA'
  const headerStr = 'Dongle_By_YA';
  for (let i = 0; i < headerStr.length; i++) {
    buf[i] = headerStr.charCodeAt(i);
  }

  // 0x0010: bytes.fromhex(var_Date.get())
  const dateStr = (document.getElementById('inputDate').value.trim() || getTodayStr()).padStart(8, '0').slice(0, 8);
  for (let i = 0; i < 4; i++) {
    const byteVal = parseInt(dateStr.slice(i * 2, i * 2 + 2), 16);
    buf[0x10 + i] = Number.isNaN(byteVal) ? 0 : byteVal;
  }

  // 0x0020: var_Cytimes (4B big-endian)
  const cyTimes = Math.max(0, parseInt(document.getElementById('inputCytimes').value, 10) || 0);
  view.setUint32(0x20, cyTimes >>> 0, false);

  // 0x0030: var_Vcc (1B)
  buf[0x30] = (parseInt(getRadioValue('vcc'), 10) || 0) & 0xff;

  // 0x0040: int(var_Addr_Start, 16) (4B big-endian)
  const addrHex = (document.getElementById('inputAddrStart').value.trim() || '0').replace(/^0x/i, '');
  const addrVal = parseInt(addrHex, 16) || 0;
  view.setUint32(0x40, addrVal >>> 0, false);

  // 0x0050: var_SelEscale (1B)
  buf[0x50] = (parseInt(getRadioValue('selScale'), 10) || 0) & 0xff;

  // 0x0060: var_VerEscale (1B)
  buf[0x60] = (parseInt(getRadioValue('verScale'), 10) || 0) & 0xff;

  // 0x0070: var_PreEscale (1B)
  buf[0x70] = (parseInt(getRadioValue('preScale'), 10) || 0) & 0xff;

  // 0x0080: var_VerTimes (4B big-endian)
  const verTimes = Math.max(0, parseInt(document.getElementById('inputVerTimes').value, 10) || 0);
  view.setUint32(0x80, verTimes >>> 0, false);

  // 0x0090: var_SaveTimes (4B big-endian)
  const saveTimes = Math.max(0, parseInt(document.getElementById('inputSaveTimes').value, 10) || 0);
  view.setUint32(0x90, saveTimes >>> 0, false);

  // 0x00A0: var_Freq (1B)
  buf[0xA0] = (parseInt(getRadioValue('freq'), 10) || 0) & 0xff;

  // 0x0130: var_QE (1B)
  buf[0x130] = document.getElementById('chkQE').checked ? 1 : 0;

  // 0x0140: var_PGMBAR (1B)
  buf[0x140] = document.getElementById('chkPGMBAR').checked ? 1 : 0;

  // 0x0150: var_Erase_Verify (1B)
  buf[0x150] = document.getElementById('chkEraseVerify').checked ? 1 : 0;

  // 0x0160: var_PGM_Verify (1B)
  buf[0x160] = document.getElementById('chkPGMVerify').checked ? 1 : 0;

  // 0x0170: var_UnSel_Verify (1B)
  buf[0x170] = document.getElementById('chkUnSelVerify').checked ? 1 : 0;

  // 0x01C0: var_Erase_Delay_Mode (1B)
  buf[0x1C0] = (parseInt(getRadioValue('eraseDelayMode'), 10) || 0) & 0xff;

  // 0x01D0: var_PGM_Delay_Mode (1B)
  buf[0x1D0] = (parseInt(getRadioValue('pgmDelayMode'), 10) || 0) & 0xff;

  // 0x01E0: var_Erase_Delay_Time (4B big-endian)
  const eraseDelay = Math.max(0, parseInt(document.getElementById('inputEraseDelayTime').value, 10) || 0);
  view.setUint32(0x1E0, eraseDelay >>> 0, false);

  // 0x01F0: var_PGM_Delay_Time (4B big-endian)
  const pgmDelay = Math.max(0, parseInt(document.getElementById('inputPGMDelayTime').value, 10) || 0);
  view.setUint32(0x1F0, pgmDelay >>> 0, false);

  // 0x1000..0x107F: Select_Area (128B)
  for (let i = 0; i < 128; i++) {
    buf[0x1000 + i] = state.areas.select[i] ? 1 : 0;
  }

  // 0x1080..0x10FF: Verify_Area (Unselect區域, 128B)
  for (let i = 0; i < 128; i++) {
    buf[0x1080 + i] = state.areas.unselect[i] ? 1 : 0;
  }

  // 0x1100..0x117F: TimeSel_Area (記錄Tpp/Terase區域, 128B)
  for (let i = 0; i < 128; i++) {
    buf[0x1100 + i] = state.areas.timesel[i] ? 1 : 0;
  }

  // 0x1180..0x11FF: Pre_Area (Initial區域, 128B)
  for (let i = 0; i < 128; i++) {
    buf[0x1180 + i] = state.areas.initial[i] ? 1 : 0;
  }

  // 0x2000..0x27FF: sel_pattern (2048B)
  buf.set(state.selPattern.subarray(0, PATTERN_SIZE), 0x2000);

  // 0x2800..0x2FFF: Unsel_pattern (2048B)
  buf.set(state.unselPattern.subarray(0, PATTERN_SIZE), 0x2800);

  return buf;
}

// Parse a loaded .bin file (Matches load_Setting() in Dongle_UserSetting.py)
function parseBinBuffer(bytes) {
  if (bytes.length < 0x3000) {
    const padded = new Uint8Array(0x3000);
    padded.set(bytes);
    bytes = padded;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  // Date @ 0x10..0x13
  let dateStr = '';
  for (let i = 0x10; i < 0x14; i++) {
    dateStr += bytes[i].toString(16).padStart(2, '0');
  }
  document.getElementById('inputDate').value = dateStr;

  // Cycling Times @ 0x20..0x23
  document.getElementById('inputCytimes').value = String(view.getUint32(0x20, false));

  // Vcc @ 0x30
  setRadioValue('vcc', String(bytes[0x30]));

  // Start Address @ 0x40..0x43
  let addrStr = '';
  for (let i = 0x40; i < 0x44; i++) {
    addrStr += bytes[i].toString(16).padStart(2, '0');
  }
  document.getElementById('inputAddrStart').value = addrStr;

  // Scales @ 0x50, 0x60, 0x70
  setRadioValue('selScale', String(bytes[0x50]));
  setRadioValue('verScale', String(bytes[0x60]));
  setRadioValue('preScale', String(bytes[0x70]));

  // Verify Times @ 0x80..0x83
  document.getElementById('inputVerTimes').value = String(view.getUint32(0x80, false));

  // Save Times @ 0x90..0x93
  document.getElementById('inputSaveTimes').value = String(view.getUint32(0x90, false));

  // Freq @ 0xA0
  setRadioValue('freq', String(bytes[0xA0]));

  // Flags @ 0x130..0x170
  document.getElementById('chkQE').checked = Boolean(bytes[0x130]);
  document.getElementById('chkPGMBAR').checked = Boolean(bytes[0x140]);
  document.getElementById('chkEraseVerify').checked = Boolean(bytes[0x150]);
  document.getElementById('chkPGMVerify').checked = Boolean(bytes[0x160]);
  document.getElementById('chkUnSelVerify').checked = Boolean(bytes[0x170]);

  // Delay modes @ 0x1C0, 0x1D0
  setRadioValue('eraseDelayMode', String(bytes[0x1C0]));
  setRadioValue('pgmDelayMode', String(bytes[0x1D0]));

  // Delay times @ 0x1E0..0x1E3, 0x1F0..0x1F3
  document.getElementById('inputEraseDelayTime').value = String(view.getUint32(0x1E0, false));
  document.getElementById('inputPGMDelayTime').value = String(view.getUint32(0x1F0, false));

  // Areas @ 0x1000, 0x1080, 0x1100, 0x1180
  for (let i = 0; i < 128; i++) {
    state.areas.select[i] = Boolean(bytes[0x1000 + i]);
    state.areas.unselect[i] = Boolean(bytes[0x1080 + i]);
    state.areas.timesel[i] = Boolean(bytes[0x1100 + i]);
    state.areas.initial[i] = Boolean(bytes[0x1180 + i]);
  }

  // Patterns @ 0x2000..0x27FF, 0x2800..0x2FFF
  state.selPattern = new Uint8Array(PATTERN_SIZE);
  state.selPattern.set(bytes.subarray(0x2000, 0x2800));

  state.unselPattern = new Uint8Array(PATTERN_SIZE);
  state.unselPattern.set(bytes.subarray(0x2800, 0x3000));

  updateAllUI();
}

// CheckLogCapacity & SaveBinFile (Exact match with Python implementation)
async function handleSaveBinFile() {
  // Validate Date (8 hex chars)
  const dateStr = document.getElementById('inputDate').value.trim();
  if (!/^[0-9a-fA-F]{8}$/.test(dateStr)) {
    await showDialog({
      title: '格式錯誤',
      message: '日期格式必須為 8 碼數字/HEX (例如 20261021)。',
      type: 'error'
    });
    return;
  }

  // Validate Start Address
  const addrStr = document.getElementById('inputAddrStart').value.trim().replace(/^0x/i, '');
  if (!/^[0-9a-fA-F]{1,8}$/.test(addrStr)) {
    await showDialog({
      title: '格式錯誤',
      message: '起始位置(HEX) 必須為有效的 1~8 碼十六進位數值。',
      type: 'error'
    });
    return;
  }

  const cyRaw = document.getElementById('inputCytimes').value.trim();
  const saveRaw = document.getElementById('inputSaveTimes').value.trim();
  if (!/^-?\d+$/.test(cyRaw) || !/^-?\d+$/.test(saveRaw)) {
    await showDialog({
      title: '格式錯誤',
      message: 'Cycling次數與記錄間隔必須是整數。',
      type: 'error'
    });
    return;
  }

  const cyclingTimes = parseInt(cyRaw, 10);
  const saveFlag = parseInt(saveRaw, 10);
  if (cyclingTimes <= 0 || saveFlag <= 0) {
    await showDialog({
      title: '設定錯誤',
      message: 'Cycling次數與記錄間隔必須大於 0。',
      type: 'error'
    });
    return;
  }

  const selectScale = parseInt(getRadioValue('selScale'), 10);
  const sectors = SECTORS_PER_UNIT[selectScale];
  const tsan = state.areas.timesel.filter(Boolean).length;

  if (tsan === 0) {
    const proceedNoLog = await showDialog({
      title: '記錄區域確認',
      message: '「記錄Tpp/Terase區域」沒有勾選任何單位。\n本次測試不會記錄任何 Tpp / Terase 資料。\n\n是否仍要輸出？',
      confirmText: '是 (仍要輸出)',
      cancelText: '否 (返回修改)'
    });
    if (!proceedNoLog) return;
  } else {
    const recordPgm = 2 * sectors * tsan;
    const maxTsan = Math.min(Math.floor(LOG_PS_ARRAY_SIZE / sectors), 128);
    if (tsan > maxTsan) {
      await showDialog({
        title: '記錄區域超出規格',
        message: `單筆 Tpp 需要 ${recordPgm} bytes，超過韌體 RAM 緩衝區上限 ${2 * sectors * maxTsan} bytes。\n\n目前 Select 單位 = ${SCALE_NAME[selectScale]}，記錄Tpp/Terase區域最多可勾選 ${maxTsan} 個，目前勾選 ${tsan} 個。`,
        type: 'error'
      });
      return;
    }

    const slotPgm = getLogSlot(recordPgm);
    const slotErase = getLogSlot(2 * tsan);
    const maxRecord = Math.min(
      Math.floor(LOG_REGION_SIZE / slotPgm),
      Math.floor(LOG_REGION_SIZE / slotErase)
    );
    const recordCount = Math.floor(cyclingTimes / saveFlag) + 2;

    if (recordCount > maxRecord) {
      const denom = Math.max(maxRecord - 2, 1);
      const suggestSaveFlag = Math.ceil(cyclingTimes / denom);
      await showDialog({
        title: '記錄筆數超出規格',
        message: `預估會記錄 ${recordCount} 筆，超過可存放的 ${maxRecord} 筆。\n\nCycling次數 = ${cyclingTimes} , 記錄間隔 = ${saveFlag} , 單筆佔用 ${slotPgm} bytes。\n（Select 單位 = ${SCALE_NAME[selectScale]} , 記錄區域勾選 ${tsan} 個）\n請將「多少次記錄一次Tpp/Terase」改為 ${suggestSaveFlag} 以上。`,
        type: 'error'
      });
      return;
    }
  }

  // All-zero pattern confirmation
  if (isAllZeroPattern(state.selPattern) && isAllZeroPattern(state.unselPattern)) {
    const confirmZero = await showDialog({
      title: 'Pattern 確認',
      message: '目前 Select Pattern 與 Unselect Pattern 均為 all 0 pattern。\n這可能表示尚未讀入 BIN 檔。\n\n是否確認以 all 0 pattern 輸出？',
      confirmText: '確認輸出',
      cancelText: '取消'
    });
    if (!confirmZero) return;
  }

  // Build and trigger download
  const binData = buildBinBuffer();
  const blob = new Blob([binData], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Dongle_UserSetting_${dateStr}.bin`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================================
// Pattern Editor Modal Logic
// ============================================================================
function getActivePatternBuffer() {
  return state.activePatternType === 'select' ? state.selPattern : state.unselPattern;
}

function setActivePatternBuffer(newBytes) {
  const normalized = new Uint8Array(PATTERN_SIZE);
  normalized.set(newBytes.subarray(0, PATTERN_SIZE));
  if (state.activePatternType === 'select') {
    state.selPattern = normalized;
  } else {
    state.unselPattern = normalized;
  }
  refreshPatternModal();
  updateAllUI();
}

function initPatternBlockGrid() {
  const grid = document.getElementById('patternBlockGrid');
  grid.innerHTML = '';
  const numBlocks = PATTERN_SIZE / PATTERN_BLOCK_SIZE; // 32
  for (let i = 0; i < numBlocks; i++) {
    const startOffset = (i * PATTERN_BLOCK_SIZE).toString(16).padStart(4, '0');
    const endOffset = ((i + 1) * PATTERN_BLOCK_SIZE - 1).toString(16).padStart(4, '0');
    const item = document.createElement('div');
    item.className = 'block-entry-item';
    item.innerHTML = `
      <label for="blockVar_${i}">${startOffset}-${endOffset}:</label>
      <input type="text" id="blockVar_${i}" class="input-text input-xs font-mono" value="00" maxlength="2" />
    `;
    grid.appendChild(item);
  }
}

function refreshPatternModal() {
  const buf = getActivePatternBuffer();
  const isSelect = state.activePatternType === 'select';
  document.getElementById('patternModalTitle').textContent = isSelect
    ? 'Select Pattern'
    : 'Unselect Pattern';

  document.getElementById('inputAllPatternHex').value = buf[0].toString(16).padStart(2, '0');
  const numBlocks = PATTERN_SIZE / PATTERN_BLOCK_SIZE;
  for (let i = 0; i < numBlocks; i++) {
    const input = document.getElementById(`blockVar_${i}`);
    if (input) {
      input.value = buf[i * PATTERN_BLOCK_SIZE].toString(16).padStart(2, '0');
    }
  }
  document.getElementById('patternHexText').textContent = formatPatternData(buf);
}

function openPatternModal(patternType) {
  state.activePatternType = patternType;
  refreshPatternModal();
  document.getElementById('patternModal').hidden = false;
}

// ============================================================================
// Initialize Event Listeners
// ============================================================================
// Mounted by GeneratorPanel.jsx; root scopes generic selectors so they never
// bind to Auto Loader elements. Guard keeps StrictMode double-mount idempotent.
export function initGenerator(root) {
  if (!root || root.dataset.generatorReady === '1') return;
  root.dataset.generatorReady = '1';

  // Set today's date
  document.getElementById('inputDate').value = getTodayStr();
  initPatternBlockGrid();

  // Today button
  document.getElementById('btnTodayDate').addEventListener('click', () => {
    document.getElementById('inputDate').value = getTodayStr();
    updateAllUI();
  });

  // Form inputs live update
  const formInputs = root.querySelectorAll('input[type="text"], input[type="number"], input[type="radio"], input[type="checkbox"]');
  formInputs.forEach((el) => {
    if (!el.id.startsWith('blockVar_') && el.id !== 'inputAllPatternHex' && el.id !== 'inputRangeFrom' && el.id !== 'inputRangeTo') {
      el.addEventListener('input', updateAllUI);
      el.addEventListener('change', updateAllUI);
    }
  });

  // Suggest save times button
  document.getElementById('btnAutoSuggestSave').addEventListener('click', () => {
    if (state.suggestedSaveFlag) {
      document.getElementById('inputSaveTimes').value = String(state.suggestedSaveFlag);
      updateAllUI();
    }
  });

  // Tabs switching
  root.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeTab = btn.dataset.tab;
      updateAllUI();
    });
  });

  // Check All / Uncheck All in current tab
  document.getElementById('btnCheckAll').addEventListener('click', () => {
    state.areas[state.activeTab].fill(true);
    updateAllUI();
  });

  document.getElementById('btnUncheckAll').addEventListener('click', () => {
    state.areas[state.activeTab].fill(false);
    updateAllUI();
  });

  // Copy Select Area to TimeSel Area
  document.getElementById('btnCopySelToTime').addEventListener('click', () => {
    for (let i = 0; i < 128; i++) {
      state.areas.timesel[i] = state.areas.select[i];
    }
    updateAllUI();
  });

  // Quick range selector
  document.getElementById('btnRangeSelect').addEventListener('click', () => {
    const fromHex = document.getElementById('inputRangeFrom').value.trim().replace(/^0x/i, '');
    const toHex = document.getElementById('inputRangeTo').value.trim().replace(/^0x/i, '');
    const fromIdx = Math.max(0, Math.min(127, parseInt(fromHex, 16) || 0));
    const toIdx = Math.max(0, Math.min(127, parseInt(toHex, 16) || 0));
    const start = Math.min(fromIdx, toIdx);
    const end = Math.max(fromIdx, toIdx);
    for (let i = start; i <= end; i++) {
      state.areas[state.activeTab][i] = true;
    }
    updateAllUI();
  });

  // Load Setting (.bin)
  const loadSettingInput = document.getElementById('loadSettingInput');
  document.getElementById('btnLoadSetting').addEventListener('click', () => {
    loadSettingInput.value = '';
    loadSettingInput.click();
  });
  loadSettingInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const arrayBuffer = await file.arrayBuffer();
    parseBinBuffer(new Uint8Array(arrayBuffer));
  });

  // Save Setting (.bin)
  document.getElementById('btnSaveBin').addEventListener('click', handleSaveBinFile);

  // Pattern Modal Open/Close
  document.getElementById('btnOpenSelectPattern').addEventListener('click', () => openPatternModal('select'));
  document.getElementById('btnOpenUnselectPattern').addEventListener('click', () => openPatternModal('unselect'));
  document.getElementById('btnClosePatternModal').addEventListener('click', () => {
    document.getElementById('patternModal').hidden = true;
  });
  document.getElementById('btnClosePatternModalFooter').addEventListener('click', () => {
    document.getElementById('patternModal').hidden = true;
  });

  // Pattern Modal Actions
  const loadPatternBinInput = document.getElementById('loadPatternBinInput');
  document.getElementById('btnLoadPatternBin').addEventListener('click', () => {
    loadPatternBinInput.value = '';
    loadPatternBinInput.click();
  });
  loadPatternBinInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const ab = await file.arrayBuffer();
      setActivePatternBuffer(new Uint8Array(ab));
    } catch (err) {
      await showDialog({ title: '讀取失敗', message: `無法讀取檔案:\n${err.message}`, type: 'error' });
    }
  });

  // Sequential 00-ff
  document.getElementById('btnSequentialPattern').addEventListener('click', () => {
    const seq = new Uint8Array(PATTERN_SIZE);
    for (let i = 0; i < PATTERN_SIZE; i++) {
      seq[i] = i & 0xff;
    }
    setActivePatternBuffer(seq);
  });

  // Apply All Specified Pattern
  document.getElementById('btnApplyAllPattern').addEventListener('click', async () => {
    try {
      const val = parsePatternByte(document.getElementById('inputAllPatternHex').value);
      const buf = new Uint8Array(PATTERN_SIZE);
      buf.fill(val);
      setActivePatternBuffer(buf);
    } catch (err) {
      await showDialog({ title: '格式錯誤', message: err.message, type: 'error' });
    }
  });

  // Apply Block Specified Pattern (32 blocks x 64B)
  document.getElementById('btnApplyBlockPattern').addEventListener('click', async () => {
    try {
      const buf = new Uint8Array(PATTERN_SIZE);
      const numBlocks = PATTERN_SIZE / PATTERN_BLOCK_SIZE;
      for (let i = 0; i < numBlocks; i++) {
        const val = parsePatternByte(document.getElementById(`blockVar_${i}`).value);
        buf.fill(val, i * PATTERN_BLOCK_SIZE, (i + 1) * PATTERN_BLOCK_SIZE);
      }
      setActivePatternBuffer(buf);
    } catch (err) {
      await showDialog({ title: '格式錯誤', message: err.message, type: 'error' });
    }
  });

  // Toggle 32-block grid visibility
  document.getElementById('btnToggleBlockGrid').addEventListener('click', () => {
    const panel = document.getElementById('patternBlockPanel');
    panel.hidden = !panel.hidden;
  });

  updateAllUI();
}
