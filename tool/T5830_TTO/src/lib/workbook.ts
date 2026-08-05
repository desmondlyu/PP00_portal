import * as XLSX from 'xlsx';
import { standardizeTestItem } from './standardizeTestItem';
import { getProductMeta } from './productMetadata';
import type { MasterSummaryRow } from '../types/analysis';

const requiredColumns = ['Test_Item_Merged', 'Grand_Total_Time', 'Total_Merged_Count'];
const analysisColumns = ['Product', 'Test_Item_Merged', 'Grand_Total_Time', 'Total_Merged_Count'];
const mappingColumns = ['Original_Item_Name', 'Mode', 'Operation'];
const encryptedWorkbookPattern = /ECMA-376|\/EncryptionInfo|Encrypted|password-protected/i;
const notClassified = 'Not Classified';

export type MappingRow = {
  Original_Item_Name: string;
  Mode: string;
  Operation: string;
};

type SunburstOperationRow = {
  Product: string;
  Station: string;
  Mode: string;
  Operation: string;
  Test_Item_Merged: string;
  Original_Item_Name: string;
  Station_Time: number;
  Station_Count: number;
  Ratio: number;
};

export class EncryptedWorkbookError extends Error {
  constructor() {
    super('系統無法分析受保護的 Excel 檔案，請解除加密設定後重新上傳。');
    this.name = 'EncryptedWorkbookError';
  }
}

export function isEncryptedWorkbookError(error: unknown): boolean {
  if (error instanceof EncryptedWorkbookError) return true;
  return error instanceof Error && encryptedWorkbookPattern.test(error.message);
}

function readAsArrayBuffer(blob: Blob) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.readAsArrayBuffer(blob);
  });
}

function asNumber(value: unknown) {
  const number = typeof value === 'number' ? value : Number.parseFloat(String(value).replace('%', ''));
  return Number.isFinite(number) ? number : 0;
}

function asClassifiedLabel(value: unknown) {
  const label = String(value ?? '').trim();
  return label || notClassified;
}

function getRowTime(row: MasterSummaryRow) {
  return asNumber(row.Station_Time ?? row.Grand_Total_Time);
}

function buildMappingLookup(mapping: MappingRow[]) {
  const lookup = new Map<string, MappingRow>();
  for (const row of mapping) {
    const key = String(row.Original_Item_Name ?? '').trim();
    if (key) lookup.set(key, row);
  }
  return lookup;
}

function buildSunburstRows(rows: MasterSummaryRow[], mapping: MappingRow[]): SunburstOperationRow[] {
  const mappingLookup = buildMappingLookup(mapping);
  const productTotals = new Map<string, number>();
  const operationRows = rows.map((row) => {
    const mapped = mappingLookup.get(String(row.Original_Item_Name ?? '').trim());
    const totalTime = getRowTime(row);
    productTotals.set(row.Product, (productTotals.get(row.Product) ?? 0) + totalTime);
    return {
      Product: row.Product,
      Station: row.Station,
      Mode: asClassifiedLabel(mapped?.Mode),
      Operation: asClassifiedLabel(mapped?.Operation),
      Test_Item_Merged: row.Test_Item_Merged,
      Original_Item_Name: row.Original_Item_Name,
      Station_Time: Math.round(totalTime * 100) / 100,
      Station_Count: row.Station_Count,
      Ratio: 0
    };
  });

  return operationRows
    .map((row) => ({
      ...row,
      Ratio: Math.round((row.Station_Time / (productTotals.get(row.Product) || 0.000001)) * 100 * 100) / 100
    }))
    .sort(
      (a, b) =>
        a.Product.localeCompare(b.Product) ||
        a.Mode.localeCompare(b.Mode) ||
        a.Operation.localeCompare(b.Operation) ||
        a.Test_Item_Merged.localeCompare(b.Test_Item_Merged) ||
        a.Original_Item_Name.localeCompare(b.Original_Item_Name) ||
        a.Station.localeCompare(b.Station)
    );
}

function appendSunburstSheets(workbook: XLSX.WorkBook, rows: MasterSummaryRow[], mapping: MappingRow[], usedSheets?: Set<string>) {
  const operationRows = buildSunburstRows(rows, mapping);
  const sheetNames = usedSheets ?? new Set<string>(workbook.SheetNames);
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(operationRows),
    uniqueSheetName('Sunburst_Operation', sheetNames)
  );
}

async function readWorkbook(file: File) {
  try {
    return XLSX.read(await readAsArrayBuffer(file), { type: 'array' });
  } catch (error) {
    if (isEncryptedWorkbookError(error)) throw new EncryptedWorkbookError();
    throw error;
  }
}

export function writeMasterSummaryWorkbook(rows: MasterSummaryRow[], mapping: MappingRow[] = []): ArrayBuffer {
  const mappingLookup = buildMappingLookup(mapping);
  // 按產品分組（與 Python aggregate_product_reports 邏輯對齊）
  const byProduct = new Map<string, MasterSummaryRow[]>();
  for (const row of rows) {
    if (!byProduct.has(row.Product)) byProduct.set(row.Product, []);
    byProduct.get(row.Product)!.push(row);
  }

  const workbook = XLSX.utils.book_new();

  for (const [product, productRows] of byProduct) {
    // 收集站點名稱並排序
    const stationSet = new Set<string>();
    for (const row of productRows) stationSet.add(row.Station);
    const stations = Array.from(stationSet).sort();

    // 按 Test_Item_Merged 分組
    const byTestItem = new Map<string, MasterSummaryRow[]>();
    for (const row of productRows) {
      if (!byTestItem.has(row.Test_Item_Merged)) byTestItem.set(row.Test_Item_Merged, []);
      byTestItem.get(row.Test_Item_Merged)!.push(row);
    }

    // ─── Master_Summary sheet（跨站點彙整）───
    // Python: summary_df = pd.concat(stage_dfs, axis=1).fillna(0)
    // 每個 test item 跨站點加總
    type SummaryEntry = {
      testItem: string;
      totalMergedCount: number;
      stationCounts: Map<string, number>;
      grandTotalTime: number;
      stationTimes: Map<string, number>;
    };
    const entries: SummaryEntry[] = [];
    for (const [testItem, itemRows] of byTestItem) {
      const stationCounts = new Map<string, number>();
      const stationTimes = new Map<string, number>();
      for (const row of itemRows) {
        stationCounts.set(row.Station, (stationCounts.get(row.Station) ?? 0) + row.Station_Count);
        stationTimes.set(row.Station, (stationTimes.get(row.Station) ?? 0) + row.Station_Time);
      }
      const totalMergedCount = [...stationCounts.values()].reduce((s, v) => s + v, 0);
      const grandTotalTime = [...stationTimes.values()].reduce((s, v) => s + v, 0);
      entries.push({ testItem, totalMergedCount, stationCounts, grandTotalTime, stationTimes });
    }

    // Python: u_deno = summary_df['Grand_Total_Time'].sum()
    const uDeno = entries.reduce((s, e) => s + e.grandTotalTime, 0) || 0.000001;

    // 按 Grand_Total_Time 降序排序
    entries.sort((a, b) => b.grandTotalTime - a.grandTotalTime);

    // 構建 Master_Summary 資料列
    // Python 欄位順序: Total_Merged_Count, {station}_Count..., Grand_Total_Time, {station}_Time..., Grand_Total_Ratio(%), {station}_Ratio(%)...
    const masterRows: Record<string, unknown>[] = [];
    for (const entry of entries) {
      const modes = new Set<string>();
      const operations = new Set<string>();
      for (const itemRow of byTestItem.get(entry.testItem) ?? []) {
        const mapped = mappingLookup.get(String(itemRow.Original_Item_Name ?? '').trim());
        modes.add(asClassifiedLabel(mapped?.Mode));
        operations.add(asClassifiedLabel(mapped?.Operation));
      }
      const row: Record<string, unknown> = {
        Test_Item_Merged: entry.testItem,
        Mode: [...modes].sort().join(' / '),
        Operation: [...operations].sort().join(' / ')
      };
      row['Total_Merged_Count'] = entry.totalMergedCount;
      for (const st of stations) row[`${st}_Count`] = entry.stationCounts.get(st) ?? 0;
      row['Grand_Total_Time'] = Math.round(entry.grandTotalTime * 100) / 100;
      for (const st of stations) row[`${st}_Time`] = Math.round((entry.stationTimes.get(st) ?? 0) * 100) / 100;
      row['Grand_Total_Ratio(%)'] = `${((entry.grandTotalTime / uDeno) * 100).toFixed(2)}%`;
      for (const st of stations) {
        const stTime = entry.stationTimes.get(st) ?? 0;
        row[`${st}_Ratio(%)`] = `${((stTime / uDeno) * 100).toFixed(2)}%`;
      }
      masterRows.push(row);
    }

    const masterSheet = XLSX.utils.json_to_sheet(masterRows);
    XLSX.utils.book_append_sheet(workbook, masterSheet, 'Master_Summary');

    // ─── 每站點子分頁（對應 Python raw_sheet_dict[stage]）───
    // Python 寫入的是 Wafer_Analysis 的 'Merge (合併與排序)' sheet
    for (const station of stations) {
      const stationRows: Record<string, unknown>[] = [];
      // 收集此站點所有 touchdown 欄位名稱
      const allTdKeys = new Set<string>();
      for (const [, itemRows] of byTestItem) {
        const stRow = itemRows.find((r) => r.Station === station);
        if (stRow?.touchdownTimes) {
          for (const k of Object.keys(stRow.touchdownTimes)) allTdKeys.add(k);
        }
      }
      const tdKeys = [...allTdKeys].sort((a, b) => {
        const na = parseInt(a.replace('TD_', ''), 10);
        const nb = parseInt(b.replace('TD_', ''), 10);
        return (isNaN(na) ? 0 : na) - (isNaN(nb) ? 0 : nb);
      });

      // 站內全域分母
      let stationGrandTotal = 0;
      for (const [, itemRows] of byTestItem) {
        const stRow = itemRows.find((r) => r.Station === station);
        if (stRow) stationGrandTotal += stRow.Station_Time;
      }
      const stDeno = stationGrandTotal || 0.000001;

      for (const [testItem, itemRows] of byTestItem) {
        const stRow = itemRows.find((r) => r.Station === station);
        if (!stRow) continue;
        const row: Record<string, unknown> = { Test_Item_Merged: testItem };
        // 各 touchdown 欄位
        for (const td of tdKeys) {
          row[td] = stRow.touchdownTimes?.[td] ?? 0;
        }
        row['Merged_Count'] = stRow.Station_Count;
        row['Total_Time'] = Math.round(stRow.Station_Time * 100) / 100;
        row['Total_Ratio(%)'] = `${((stRow.Station_Time / stDeno) * 100).toFixed(2)}%`;
        stationRows.push(row);
      }

      // 按 Total_Time 降序
      stationRows.sort((a, b) => (b.Total_Time as number) - (a.Total_Time as number));

      if (stationRows.length > 0) {
        const stSheet = XLSX.utils.json_to_sheet(stationRows);
        XLSX.utils.book_append_sheet(workbook, stSheet, station.substring(0, 31));
      }
    }
  }

  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
}

function analysisRowToRecord(row: MasterSummaryRow, mappingLookup?: Map<string, MappingRow>): Record<string, unknown> {
  const mapped = mappingLookup?.get(String(row.Original_Item_Name ?? '').trim());
  return {
    Product: row.Product,
    Process: row.Process,
    Size: row.Size,
    Voltage: row.Voltage,
    Original_Item_Name: row.Original_Item_Name,
    Test_Item_Merged: row.Test_Item_Merged,
    Mode: asClassifiedLabel(mapped?.Mode),
    Operation: asClassifiedLabel(mapped?.Operation),
    Grand_Total_Time: row.Grand_Total_Time,
    Grand_Total_Ratio: row.Grand_Total_Ratio,
    Total_Merged_Count: row.Total_Merged_Count,
    Station: row.Station,
    Station_Time: row.Station_Time,
    Station_Count: row.Station_Count,
    ...row.touchdownTimes
  };
}

function uniqueSheetName(name: string, used: Set<string>) {
  const base = name.slice(0, 31) || 'Details';
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) {
    const suffixText = `_${suffix}`;
    candidate = `${base.slice(0, 31 - suffixText.length)}${suffixText}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

export function writeSunburstWorkbook(rows: MasterSummaryRow[], mapping: MappingRow[]): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  appendSunburstSheets(workbook, rows, mapping);
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
}

export function writeAnalysisWorkbook(rows: MasterSummaryRow[], mapping: MappingRow[] = []): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  const usedSheets = new Set<string>();
  const mappingLookup = buildMappingLookup(mapping);
  const masterRows = rows.map((row) => analysisRowToRecord(row, mappingLookup));
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(masterRows),
    uniqueSheetName('Master_Summary', usedSheets)
  );

  const groups = new Map<string, MasterSummaryRow[]>();
  for (const row of rows) {
    const key = `${row.Product}_${row.Station}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  for (const [key, groupRows] of groups) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(groupRows.map((row) => analysisRowToRecord(row, mappingLookup))),
      uniqueSheetName(key, usedSheets)
    );
  }

  appendSunburstSheets(workbook, rows, mapping, usedSheets);

  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
}

export async function readAnalysisWorkbook(file: File): Promise<MasterSummaryRow[]> {
  const workbook = await readWorkbook(file);
  const worksheet = workbook.Sheets.Master_Summary;
  if (!worksheet) throw new Error('找不到 Master_Summary 工作表');

  const sourceRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
  const columns = new Set(Object.keys(sourceRows[0] ?? {}));
  const missing = analysisColumns.filter((column) => !columns.has(column));
  if (missing.length > 0) throw new Error(`分析結構缺少必要欄位：${missing.join(', ')}`);

  return sourceRows.map((row) => {
    const product = String(row.Product);
    const meta = getProductMeta(product);
    const touchdownTimes: Record<string, number> = {};
    for (const [key, value] of Object.entries(row)) {
      if (/^TD_\d+$/.test(key)) touchdownTimes[key] = asNumber(value);
    }
    return {
      Product: product,
      Process: String(row.Process || '') || meta.Process,
      Size: String(row.Size || '') || meta.Size,
      Voltage: String(row.Voltage || '') || meta.Voltage,
      Original_Item_Name: String(row.Original_Item_Name || row.Test_Item_Merged),
      Test_Item_Merged: String(row.Test_Item_Merged),
      Grand_Total_Time: asNumber(row.Grand_Total_Time),
      Grand_Total_Ratio: asNumber(row.Grand_Total_Ratio),
      Total_Merged_Count: asNumber(row.Total_Merged_Count),
      Station: String(row.Station || 'Unknown'),
      Station_Time: asNumber(row.Station_Time ?? row.Grand_Total_Time),
      Station_Count: asNumber(row.Station_Count ?? row.Total_Merged_Count),
      touchdownTimes: Object.keys(touchdownTimes).length > 0 ? touchdownTimes : undefined
    };
  });
}

export async function readMasterSummaryWorkbook(file: File): Promise<MasterSummaryRow[]> {
  const workbook = await readWorkbook(file);
  const worksheet = workbook.Sheets.Master_Summary;
  if (!worksheet) throw new Error('找不到 Master_Summary 工作表');

  const sourceRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
  const columns = new Set(Object.keys(sourceRows[0] ?? {}));
  const missing = requiredColumns.filter((column) => !columns.has(column));
  if (missing.length > 0) throw new Error(`缺少必要欄位：${missing.join(', ')}`);

  // ponytail: Python Master_Summary 沒有 Product/Process/Size/Voltage 欄位
  // 從檔名擷取產品名，再查 PRODUCT_METADATA
  const fileProduct = file.name.split('_Master_Summary')[0] || 'N/A';

  return sourceRows.map((row) => {
    const hasOriginal = Boolean(row.Original_Item_Name);
    const originalName = String(row.Original_Item_Name || row.Test_Item_Merged || '');
    const mergedName = hasOriginal
      ? String(row.Test_Item_Merged)
      : standardizeTestItem(originalName);
    const productName = String(row.Product || fileProduct);
    const meta = getProductMeta(productName);
    const grandTotalTime = asNumber(row.Grand_Total_Time);
    const totalMergedCount = asNumber(row.Total_Merged_Count);
    return {
      Product: productName,
      Process: String(row.Process || '') || meta.Process,
      Size: String(row.Size || '') || meta.Size,
      Voltage: String(row.Voltage || '') || meta.Voltage,
      Original_Item_Name: originalName,
      Test_Item_Merged: mergedName,
      Grand_Total_Time: grandTotalTime,
      Grand_Total_Ratio: asNumber(row['Grand_Total_Ratio(%)'] ?? row.Grand_Total_Ratio),
      Total_Merged_Count: totalMergedCount,
      Station: 'Unknown',
      Station_Time: grandTotalTime,
      Station_Count: totalMergedCount
    };
  });
}

export async function readMappingWorkbook(file: File): Promise<MappingRow[]> {
  const workbook = await readWorkbook(file);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
  const columns = new Set(Object.keys(rows[0] ?? {}));
  const missing = mappingColumns.filter((column) => !columns.has(column));
  if (missing.length > 0) throw new Error(`Mapping 缺少必要欄位：${missing.join(', ')}`);

  return rows.map((row) => ({
    Original_Item_Name: String(row.Original_Item_Name),
    Mode: String(row.Mode),
    Operation: String(row.Operation)
  }));
}
