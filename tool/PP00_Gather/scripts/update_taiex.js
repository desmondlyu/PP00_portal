/**
 * update_taiex.js - 臺灣證券交易所 (TWSE) 加權股價指數盤中/收盤行情自動抓取腳本 (ES Module)
 *
 * 說明：
 * 本腳本由 GitHub Actions 或本機 Node.js 排程執行：
 * 1. 優先向 TWSE MIS 基本市況報導 API (getStockInfo.jsp) 抓取盤中即時行情（含時間、成交價、昨收價、開高低）
 * 2. 若 MIS 無法連線，平滑降級至 TWSE OpenAPI (MI_INDEX) 盤後資料
 * 3. 轉換為格式化 JSON 存入 static/data/taiex.json，供前端同源 (Same-Origin) 零 CORS 讀取。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TWSE_MIS_URL = 'https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_t00.tw&json=1&delay=0';
const TWSE_OPENAPI_URL = 'https://openapi.twse.com.tw/v1/exchangeReport/MI_INDEX';
const TARGET_FILE = path.join(__dirname, '../static/data/taiex.json');

function parseNumeric(raw) {
  if (raw === null || raw === undefined || String(raw).trim() === '' || String(raw).trim() === '-') {
    return NaN;
  }
  return Number(String(raw).replace(/,/g, '').replace(/%/g, '').trim());
}

function parseMarketDate(raw) {
  const s = String(raw ?? '').trim();
  let year, month, day;
  if (/^\d{7}$/.test(s)) {
    // 民國年 YYYMMDD (例如 1151022 -> 2026/10/22)
    year = Number(s.slice(0, 3)) + 1911;
    month = Number(s.slice(3, 5));
    day = Number(s.slice(5, 7));
  } else if (/^\d{8}$/.test(s)) {
    // 西元年 YYYYMMDD (例如 20261027 -> 2026/10/27)
    year = Number(s.slice(0, 4));
    month = Number(s.slice(4, 6));
    day = Number(s.slice(6, 8));
  } else {
    throw new Error(`不支援的行情日期格式: ${raw}`);
  }
  return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
}

async function fetchFromMIS() {
  console.log(`[TWSE] 正在連線臺灣證交所 MIS 盤中即時行情 API: ${TWSE_MIS_URL}`);
  const response = await fetch(TWSE_MIS_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) PP00-Portal-Updater/1.0',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`MIS HTTP 請求失敗: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  const item = json?.msgArray?.find((x) => String(x?.c ?? '').trim() === 't00');
  if (!item) {
    throw new Error('未在 MIS 回傳資料中找到加權指數 (t00)');
  }

  const value = parseNumeric(item.z);
  const yesterdayClose = parseNumeric(item.y);

  if (!Number.isFinite(yesterdayClose)) {
    throw new Error(`昨收價無效: y=${item.y}`);
  }

  // 盤前或撮合空檔時若無現價 z，以昨收價為基準
  const currentValue = Number.isFinite(value) ? value : yesterdayClose;
  const change = Number((currentValue - yesterdayClose).toFixed(2));
  const percent = yesterdayClose > 0 ? Number(((change / yesterdayClose) * 100).toFixed(2)) : 0;
  const sign = change > 0 ? 1 : change < 0 ? -1 : 0;

  const dateStr = parseMarketDate(item.d);
  const timeStr = item.t || '';

  const formattedValue = currentValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const arrow = change > 0 ? '▲ ' : change < 0 ? '▼ ' : '';
  const signPrefix = change > 0 ? '+' : '';
  const pctSignPrefix = percent > 0 ? '+' : '';
  const formattedChange = `${arrow}${signPrefix}${change.toFixed(2)} (${pctSignPrefix}${percent.toFixed(2)}%)`;

  return {
    hasData: true,
    name: '發行量加權股價指數',
    value: currentValue,
    change,
    percent,
    sign,
    date: dateStr,
    time: timeStr,
    open: parseNumeric(item.o) || currentValue,
    high: parseNumeric(item.h) || currentValue,
    low: parseNumeric(item.l) || currentValue,
    yesterdayClose,
    formattedValue,
    formattedChange,
    statusText: 'TWSE 官方盤中即時資料',
    updatedAt: new Date().toISOString(),
    source: '臺灣證券交易所 (TWSE) 基本市況報導 (MIS)',
  };
}

async function fetchFromOpenAPI() {
  console.log(`[TWSE] 降級連線臺灣證交所 OpenAPI (盤後): ${TWSE_OPENAPI_URL}`);
  const response = await fetch(TWSE_OPENAPI_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) PP00-Portal-Updater/1.0',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`OpenAPI HTTP 請求失敗: ${response.status} ${response.statusText}`);
  }

  const records = await response.json();
  if (!Array.isArray(records)) {
    throw new Error('TWSE OpenAPI 回傳非陣列');
  }

  const item = records.find(
    (x) => String(x?.['指數'] ?? '').trim() === '發行量加權股價指數'
  );
  if (!item) {
    throw new Error('未在 TWSE OpenAPI 中找到【發行量加權股價指數】');
  }

  const value = parseNumeric(item['收盤指數']);
  const magnitude = parseNumeric(item['漲跌點數']);
  const percentMagnitude = parseNumeric(item['漲跌百分比']);

  if (![value, magnitude, percentMagnitude].every(Number.isFinite)) {
    throw new Error(`OpenAPI 數值無效`);
  }

  const rawDir = String(item['漲跌'] ?? '').replace(/<[^>]*>/g, '').trim();
  let sign = 0;
  if (['+', '＋', '▲', '漲'].includes(rawDir)) {
    sign = 1;
  } else if (['-', '－', '−', '▼', '跌'].includes(rawDir)) {
    sign = -1;
  } else if (magnitude === 0 && percentMagnitude === 0) {
    sign = 0;
  } else {
    throw new Error(`無法辨識漲跌方向: ${rawDir}`);
  }

  const change = sign * Math.abs(magnitude);
  const percent = sign * Math.abs(percentMagnitude);
  const dateStr = parseMarketDate(item['日期']);

  const formattedValue = value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const arrow = change > 0 ? '▲ ' : change < 0 ? '▼ ' : '';
  const signPrefix = change > 0 ? '+' : '';
  const pctSignPrefix = percent > 0 ? '+' : '';
  const formattedChange = `${arrow}${signPrefix}${change.toFixed(2)} (${pctSignPrefix}${percent.toFixed(2)}%)`;

  return {
    hasData: true,
    name: '發行量加權股價指數',
    value,
    change,
    percent,
    sign,
    date: dateStr,
    time: '',
    formattedValue,
    formattedChange,
    statusText: '最近交易日收盤資料 (TWSE 官方盤後)',
    updatedAt: new Date().toISOString(),
    source: '臺灣證券交易所 (TWSE) 官方 OpenAPI (MI_INDEX)',
  };
}

async function updateTaiex() {
  let payload;
  try {
    payload = await fetchFromMIS();
  } catch (misErr) {
    console.warn(`⚠️ [TWSE] MIS 連線失敗 (${misErr.message})，自動降級至 OpenAPI...`);
    payload = await fetchFromOpenAPI();
  }

  const targetDir = path.dirname(TARGET_FILE);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  fs.writeFileSync(TARGET_FILE, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`✅ [TWSE] 台股加權指數成功寫入: ${TARGET_FILE}`);
  console.log(`   來源: ${payload.source}`);
  console.log(`   指數: ${payload.formattedValue} | 漲跌: ${payload.formattedChange} | 日期: ${payload.date} ${payload.time || ''}`);
}

updateTaiex().catch((err) => {
  console.error(`❌ [TWSE] 更新失敗:`, err.message);
  process.exit(1);
});
