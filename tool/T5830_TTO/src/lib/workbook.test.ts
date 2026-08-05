import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import {
  EncryptedWorkbookError,
  isEncryptedWorkbookError,
  readAnalysisWorkbook,
  readMappingWorkbook,
  readMasterSummaryWorkbook,
  writeAnalysisWorkbook,
  writeSunburstWorkbook,
  writeMasterSummaryWorkbook
} from './workbook';
import type { MasterSummaryRow } from '../types/analysis';

const rows: MasterSummaryRow[] = [{
  Product: 'EAG119',
  Process: 'F58',
  Size: '512M',
  Voltage: '1.8',
  Original_Item_Name: 'READ_ARRAY_(M)',
  Test_Item_Merged: 'READ_ARRAY',
  Grand_Total_Time: 1.25,
  Grand_Total_Ratio: 100,
  Total_Merged_Count: 1,
  Station: 'S1P1',
  Station_Time: 1.25,
  Station_Count: 1
}];

const multiProductRows: MasterSummaryRow[] = [
  ...rows,
  {
    ...rows[0],
    Product: 'EAG120',
    Test_Item_Merged: 'PROGRAM',
    Original_Item_Name: 'PROGRAM_(M)',
    Grand_Total_Time: 2.5,
    Grand_Total_Ratio: 100,
    Station_Time: 2.5
  }
];

const mappingRows = [{
  Original_Item_Name: 'READ_ARRAY_(M)',
  Mode: 'User Mode',
  Operation: 'Read'
}];

function stripRowNumbers<T extends Record<string, unknown>>(rows: T[]): T[] {
  return rows.map(({ __rowNum__, ...row }) => row as T);
}

describe('Master Summary workbook', () => {
  it('writes and reads the dashboard required fields', async () => {
    const workbook = writeMasterSummaryWorkbook(rows, mappingRows);
    const parsed = XLSX.read(workbook, { type: 'array' });
    const summaryRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(parsed.Sheets.Master_Summary, { defval: '' });
    expect(summaryRows[0]).toMatchObject({ Mode: 'User Mode', Operation: 'Read' });
    const loaded = await readMasterSummaryWorkbook(new File([workbook], 'EAG119_Master_Summary.xlsx'));

    // 讀回後 Station 為 Unknown（Master_Summary sheet 為跨站彙整，無個別站點），
    // touchdownTimes 不保留在 reader 中，Grand_Total_Ratio 為 "100.00%" → 100
    expect(loaded.length).toBe(1);
    expect(loaded[0]).toMatchObject({
      Product: 'EAG119',
      Test_Item_Merged: 'READ_ARRAY',
      Grand_Total_Time: 1.25,
      Total_Merged_Count: 1,
      Grand_Total_Ratio: 100,
      Station: 'Unknown'
    });
  });

  it('reads the Management Mapping columns', async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{
      Original_Item_Name: 'READ_ARRAY',
      Mode: 'User Mode',
      Operation: 'Read'
    }]), 'Mapping_Table');

    const file = new File(
      [XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })],
      'Management_Mapping.xlsx'
    );

    await expect(readMappingWorkbook(file)).resolves.toEqual([{
      Original_Item_Name: 'READ_ARRAY',
      Mode: 'User Mode',
      Operation: 'Read'
    }]);
  });

  it('round-trips all products through one analysis workbook', async () => {
    const workbook = writeAnalysisWorkbook(multiProductRows, mappingRows);
    const parsed = XLSX.read(workbook, { type: 'array' });

    expect(parsed.SheetNames).toContain('Master_Summary');
    expect(parsed.SheetNames).toContain('EAG119_S1P1');
    expect(parsed.SheetNames).toContain('EAG120_S1P1');
    expect(parsed.SheetNames).toContain('Sunburst_Operation');

    const masterRows = stripRowNumbers(
      XLSX.utils.sheet_to_json<Record<string, unknown>>(parsed.Sheets.Master_Summary, { defval: '' })
    );
    expect(masterRows[0]).toMatchObject({ Mode: 'User Mode', Operation: 'Read' });

    const loaded = await readAnalysisWorkbook(new File([workbook], 'T5830_Analysis_Structure.xlsx'));
    expect(loaded).toHaveLength(2);
    expect(loaded.map((row) => row.Product)).toEqual(['EAG119', 'EAG120']);
    expect(loaded[1]).toMatchObject({
      Test_Item_Merged: 'PROGRAM',
      Grand_Total_Time: 2.5,
      Total_Merged_Count: 1
    });
  });

  it('writes reusable sunburst sheets with classified fallback', () => {
    const workbook = writeSunburstWorkbook(rows, mappingRows);
    const parsed = XLSX.read(workbook, { type: 'array' });

    expect(parsed.SheetNames).toEqual(['Sunburst_Operation']);

    const operationRows = stripRowNumbers(
      XLSX.utils.sheet_to_json<Record<string, unknown>>(parsed.Sheets.Sunburst_Operation, { defval: '' })
    );
    expect(operationRows).toEqual([{
      Product: 'EAG119',
      Station: 'S1P1',
      Mode: 'User Mode',
      Operation: 'Read',
      Test_Item_Merged: 'READ_ARRAY',
      Original_Item_Name: 'READ_ARRAY_(M)',
      Station_Time: 1.25,
      Station_Count: 1,
      Ratio: 100
    }]);

    const fallbackWorkbook = writeSunburstWorkbook(multiProductRows, mappingRows);
    const fallbackParsed = XLSX.read(fallbackWorkbook, { type: 'array' });
    const fallbackRows = stripRowNumbers(
      XLSX.utils.sheet_to_json<Record<string, unknown>>(fallbackParsed.Sheets.Sunburst_Operation, { defval: '' })
    );
    expect(fallbackRows[1]).toMatchObject({
      Product: 'EAG120',
      Mode: 'Not Classified',
      Operation: 'Not Classified',
      Ratio: 100
    });
  });

  it('keeps station-level rows traceable within one product', () => {
    const workbook = writeSunburstWorkbook([
      rows[0],
      { ...rows[0], Station: 'S2P1', Station_Time: 0.75, Station_Count: 1 }
    ], mappingRows);
    const parsed = XLSX.read(workbook, { type: 'array' });
    const operationRows = stripRowNumbers(
      XLSX.utils.sheet_to_json<Record<string, unknown>>(parsed.Sheets.Sunburst_Operation, { defval: '' })
    );

    expect(operationRows).toHaveLength(2);
    expect(operationRows.map((row) => row.Station)).toEqual(['S1P1', 'S2P1']);
    expect(operationRows.map((row) => row.Ratio)).toEqual([62.5, 37.5]);
  });

  it('rejects an analysis workbook with missing required columns', async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{
      Product: 'EAG119',
      Test_Item_Merged: 'READ_ARRAY'
    }]), 'Master_Summary');
    const file = new File([XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })], 'invalid.xlsx');

    await expect(readAnalysisWorkbook(file)).rejects.toThrow('分析結構缺少必要欄位');
  });

  it('detects encrypted workbook errors', () => {
    expect(isEncryptedWorkbookError(new Error('ECMA-376 Encrypted file missing /EncryptionInfo'))).toBe(true);
    expect(isEncryptedWorkbookError(new EncryptedWorkbookError())).toBe(true);
    expect(isEncryptedWorkbookError(new Error('unexpected signature'))).toBe(false);
  });
});
