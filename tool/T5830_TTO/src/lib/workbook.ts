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
  const workbook = XLSX.utils.book_new();
  const usedSheets = new Set<string>();
  const mappingLookup = buildMappingLookup(mapping);
  const sortedRows = sortAnalysisRows(rows);
  const records = sortedRows.map((row) => analysisRowToRecord(row, mappingLookup));

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(records),
    uniqueSheetName('Master_Summary', usedSheets)
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(sortedRows.map((row) => detailRowToRecord(row, mappingLookup))),
    uniqueSheetName('Detail (各Site明細)', usedSheets)
  );

  const byStation = new Map<string, MasterSummaryRow[]>();
  for (const row of sortedRows) {
    const key = `${row.Product}_${row.Station}`;
    byStation.set(key, [...(byStation.get(key) ?? []), row]);
  }
  for (const [key, stationRows] of byStation) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(stationRows.map((row) => analysisRowToRecord(row, mappingLookup))),
      uniqueSheetName(key, usedSheets)
    );
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
    Station: row.Station,
    Step: row.Step,
    Test_Item: row.Test_Item,
    Sweep_Info: row.Sweep_Info,
    Test_No: row.Test_No,
    Original_Item_Name: row.Original_Item_Name,
    Test_Item_Merged: row.Test_Item_Merged,
    Mode: asClassifiedLabel(mapped?.Mode),
    Operation: asClassifiedLabel(mapped?.Operation),
    test_item_avg: row.test_item_avg,
    test_item_max: row.test_item_max,
    test_item_min: row.test_item_min,
    test_item_range: row.test_item_range,
    'Test_Item_Station_Ratio(%)': row.Test_Item_Station_Ratio,
    Grand_Total_Time: row.Grand_Total_Time,
    Grand_Total_Ratio: row.Grand_Total_Ratio,
    Total_Merged_Count: row.Total_Merged_Count,
    Station_Time: row.Station_Time,
    Station_Count: row.Station_Count,
    ...row.touchdownTimes
  };
}

function detailRowToRecord(row: MasterSummaryRow, mappingLookup?: Map<string, MappingRow>): Record<string, unknown> {
  const mapped = mappingLookup?.get(String(row.Original_Item_Name ?? '').trim());
  return {
    Product: row.Product,
    Process: row.Process,
    Size: row.Size,
    Voltage: row.Voltage,
    Station: row.Station,
    Step: row.Step,
    Test_Item: row.Test_Item,
    Sweep_Info: row.Sweep_Info,
    Original_Item_Name: row.Original_Item_Name,
    Test_Item_Merged: row.Test_Item_Merged,
    Mode: asClassifiedLabel(mapped?.Mode),
    Operation: asClassifiedLabel(mapped?.Operation),
    test_item_avg: row.test_item_avg,
    test_item_max: row.test_item_max,
    test_item_min: row.test_item_min,
    test_item_range: row.test_item_range,
    'Test_Item_Station_Ratio(%)': row.Test_Item_Station_Ratio
  };
}

function sortAnalysisRows(rows: MasterSummaryRow[]) {
  return [...rows].sort(
    (a, b) =>
      a.Product.localeCompare(b.Product) ||
      a.Process.localeCompare(b.Process) ||
      a.Size.localeCompare(b.Size) ||
      a.Voltage.localeCompare(b.Voltage) ||
      (a.Step ?? Number.MAX_SAFE_INTEGER) - (b.Step ?? Number.MAX_SAFE_INTEGER) ||
      a.Original_Item_Name.localeCompare(b.Original_Item_Name) ||
      a.Station.localeCompare(b.Station)
  );
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
  const sortedRows = sortAnalysisRows(rows);
  const masterRows = sortedRows.map((row) => analysisRowToRecord(row, mappingLookup));
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(masterRows),
    uniqueSheetName('Master_Summary', usedSheets)
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(sortedRows.map((row) => detailRowToRecord(row, mappingLookup))),
    uniqueSheetName('Detail (各Site明細)', usedSheets)
  );

  const groups = new Map<string, MasterSummaryRow[]>();
  for (const row of sortedRows) {
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

  appendSunburstSheets(workbook, sortedRows, mapping, usedSheets);

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
      Step: row.Step === '' || row.Step === undefined ? undefined : asNumber(row.Step),
      Test_Item: String(row.Test_Item || '') || undefined,
      Sweep_Info: String(row.Sweep_Info || '') || undefined,
      Test_No: row.Test_No === '' || row.Test_No === undefined ? undefined : asNumber(row.Test_No),
      Original_Item_Name: String(row.Original_Item_Name || row.Test_Item_Merged),
      Test_Item_Merged: String(row.Test_Item_Merged),
      Mode: String(row.Mode || '') || undefined,
      Operation: String(row.Operation || '') || undefined,
      Grand_Total_Time: asNumber(row.Grand_Total_Time),
      Grand_Total_Ratio: asNumber(row.Grand_Total_Ratio),
      Total_Merged_Count: asNumber(row.Total_Merged_Count),
      Station: String(row.Station || 'Unknown'),
      Station_Time: asNumber(row.Station_Time ?? row.Grand_Total_Time),
      Station_Count: asNumber(row.Station_Count ?? row.Total_Merged_Count),
      test_item_avg: row.test_item_avg === '' || row.test_item_avg === undefined ? undefined : asNumber(row.test_item_avg),
      test_item_max: row.test_item_max === '' || row.test_item_max === undefined ? undefined : asNumber(row.test_item_max),
      test_item_min: row.test_item_min === '' || row.test_item_min === undefined ? undefined : asNumber(row.test_item_min),
      test_item_range: row.test_item_range === '' || row.test_item_range === undefined ? undefined : asNumber(row.test_item_range),
      Test_Item_Station_Ratio: row['Test_Item_Station_Ratio(%)'] === '' || row['Test_Item_Station_Ratio(%)'] === undefined
        ? undefined
        : asNumber(row['Test_Item_Station_Ratio(%)']),
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
      Step: row.Step === '' || row.Step === undefined ? undefined : asNumber(row.Step),
      Test_Item: String(row.Test_Item || '') || undefined,
      Sweep_Info: String(row.Sweep_Info || '') || undefined,
      Test_No: row.Test_No === '' || row.Test_No === undefined ? undefined : asNumber(row.Test_No),
      Original_Item_Name: originalName,
      Test_Item_Merged: mergedName,
      Mode: String(row.Mode || '') || undefined,
      Operation: String(row.Operation || '') || undefined,
      Grand_Total_Time: grandTotalTime,
      Grand_Total_Ratio: asNumber(row['Grand_Total_Ratio(%)'] ?? row.Grand_Total_Ratio),
      Total_Merged_Count: totalMergedCount,
      Station: 'Unknown',
      Station_Time: grandTotalTime,
      Station_Count: totalMergedCount,
      test_item_avg: row.test_item_avg === '' || row.test_item_avg === undefined ? undefined : asNumber(row.test_item_avg),
      test_item_max: row.test_item_max === '' || row.test_item_max === undefined ? undefined : asNumber(row.test_item_max),
      test_item_min: row.test_item_min === '' || row.test_item_min === undefined ? undefined : asNumber(row.test_item_min),
      test_item_range: row.test_item_range === '' || row.test_item_range === undefined ? undefined : asNumber(row.test_item_range),
      Test_Item_Station_Ratio: row['Test_Item_Station_Ratio(%)'] === '' || row['Test_Item_Station_Ratio(%)'] === undefined
        ? undefined
        : asNumber(row['Test_Item_Station_Ratio(%)'])
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
