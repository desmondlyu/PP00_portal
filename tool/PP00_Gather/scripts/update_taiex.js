/**
 * update_taiex.js - 臺灣證券交易所 (TWSE) 加權股價指數盤後資料自動抓取腳本 (ES Module)
 *
 * 說明：
 * 本腳本由 GitHub Actions 或本機 Node.js 排程執行，主動向 TWSE OpenAPI (MI_INDEX)
 * 抓取最新官方收盤數據，轉換為格式化 JSON 存入 static/data/taiex.json。
 * GitHub Pages 前端可直接以同源 (Same-Origin) 靜態檔案讀取，徹底克服瀏覽器 CORS 限制。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TWSE_API_URL = 'https://openapi.twse.com.tw/v1/exchangeReport/MI_INDEX';
const TARGET_FILE = path.join(__dirname, '../static/data/taiex.json');

function parseNumeric(raw) {
  if (raw === null || raw === undefined || String(raw).trim() === '') {
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
    // 西元年 YYYYMMDD
    year = Number(s.slice(0, 4));
    month = Number(s.slice(4, 6));
    day = Number(s.slice(6, 8));
  } else {
    throw new Error(`不支援的行情日期格式: ${raw}`);
  }
  return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
}

async function fetchTaiex() {
  console.log(`[TWSE] 正在連線臺灣證券交易所 OpenAPI: ${TWSE_API_URL}`);
  const response = await fetch(TWSE_API_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) PP00-Portal-Updater/1.0',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP 請求失敗，狀態碼: ${response.status} ${response.statusText}`);
  }

  const records = await response.json();
  if (!Array.isArray(records)) {
    throw new Error('TWSE 回傳資料格式錯誤（非陣列）');
  }

  const item = records.find(
    (x) => String(x?.['指數'] ?? '').trim() === '發行量加權股價指數'
  );
  if (!item) {
    throw new Error('未在 TWSE 回傳資料中找到【發行量加權股價指數】');
  }

  const value = parseNumeric(item['收盤指數']);
  const magnitude = parseNumeric(item['漲跌點數']);
  const percentMagnitude = parseNumeric(item['漲跌百分比']);

  if (![value, magnitude, percentMagnitude].every(Number.isFinite)) {
    throw new Error(`行情數值無效: value=${value}, magnitude=${magnitude}, percent=${percentMagnitude}`);
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

  const payload = {
    hasData: true,
    name: '發行量加權股價指數',
    value,
    change,
    percent,
    sign,
    date: dateStr,
    formattedValue,
    formattedChange,
    statusText: '最近交易日收盤資料 (TWSE 官方盤後)',
    updatedAt: new Date().toISOString(),
    source: '臺灣證券交易所 (TWSE) 官方 OpenAPI (MI_INDEX)',
  };

  const targetDir = path.dirname(TARGET_FILE);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  fs.writeFileSync(TARGET_FILE, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`✅ [TWSE] 台股加權指數成功寫入: ${TARGET_FILE}`);
  console.log(`   指數: ${formattedValue} | 漲跌: ${formattedChange} | 日期: ${dateStr}`);
}

fetchTaiex().catch((err) => {
  console.error(`❌ [TWSE] 更新失敗:`, err.message);
  process.exit(1);
});
