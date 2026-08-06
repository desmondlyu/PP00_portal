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
  Test_No: 227,
  Original_Item_Name: 'READ_ARRAY_(M)',
  Test_Item_Merged: 'READ_ARRAY',
  Grand_Total_Time: 1.25,
  Grand_Total_Ratio: 100,
  Total_Merged_Count: 1,
  Station: 'S1P1',
  Station_Time: 1.25,
  Station_Count: 1,
  touchdownSiteTimes: {
    TD_1: { Site_01: 1, Site_02: 3 },
    TD_2: { Site_01: 10, Site_02: 2 }
  }
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
    expect(summaryRows[0]).toMatchObject({ Test_No: 227, Mode: 'User Mode', Operation: 'Read' });
    expect(parsed.SheetNames).toContain('Detail (各Site明細)');
    expect(parsed.SheetNames).toContain('TD_Site_Detail');
    const siteDetail = XLSX.utils.sheet_to_json<Record<string, unknown>>(parsed.Sheets.TD_Site_Detail, { defval: '' });
    expect(siteDetail[0]).toMatchObject({
      Product: 'EAG119',
      Station: 'S1P1',
      Site: 'Site_01',
      TD: 'TD_1',
      Original_Item_Name: 'READ_ARRAY_(M)',
      TD_Site_Time: 1
    });
    const loaded = await readMasterSummaryWorkbook(new File([workbook], 'EAG119_Master_Summary.xlsx'));

    expect(loaded.length).toBe(1);
    expect(loaded[0]).toMatchObject({
      Product: 'EAG119',
      Test_Item_Merged: 'READ_ARRAY',
      Grand_Total_Time: 1.25,
      Total_Merged_Count: 1,
      Grand_Total_Ratio: 100,
      Station: 'S1P1',
      touchdownSiteTimes: rows[0].touchdownSiteTimes
    });
  });

  it('sorts exported analysis rows by product metadata and Step', () => {
    const workbook = writeAnalysisWorkbook([
      { ...rows[0], Step: 2, Original_Item_Name: 'Z_(M)', Test_Item_Merged: 'Z' },
      { ...rows[0], Step: 1, Original_Item_Name: 'A_(M)', Test_Item_Merged: 'A' },
      { ...rows[0], Product: 'FAG103', Process: 'F45', Size: '256M', Step: 1, Original_Item_Name: 'B_(M)', Test_Item_Merged: 'B' }
    ], mappingRows);
    const parsed = XLSX.read(workbook, { type: 'array' });
    const exported = XLSX.utils.sheet_to_json<Record<string, unknown>>(parsed.Sheets.Master_Summary, { defval: '' });

    expect(exported.map((row) => row.Original_Item_Name)).toEqual(['A_(M)', 'Z_(M)', 'B_(M)']);
  });

  it('round-trips touchdown statistics through analysis and Master Summary workbooks', async () => {
    const touchdownStats = {
      TD_1: { avg: 2, max: 3, min: 1, range: 2, ratio: 40 },
      TD_2: { avg: 6, max: 10, min: 2, range: 8, ratio: 75 }
    };
    const analysisWorkbook = writeAnalysisWorkbook([{ ...rows[0], touchdownStats }], mappingRows);
    const analysisSheet = XLSX.read(analysisWorkbook, { type: 'array' }).Sheets.Master_Summary;
    const exported = XLSX.utils.sheet_to_json<Record<string, unknown>>(analysisSheet, { defval: '' })[0];
    expect(exported).toMatchObject({
      TD_2_test_item_avg: 6,
      'TD_2_Test_Item_Station_Ratio(%)': 75
    });
    await expect(readAnalysisWorkbook(new File([analysisWorkbook], 'analysis.xlsx')))
      .resolves.toMatchObject([{ touchdownStats, touchdownSiteTimes: rows[0].touchdownSiteTimes }]);

    const masterWorkbook = writeMasterSummaryWorkbook([{ ...rows[0], touchdownStats }], mappingRows);
    await expect(readMasterSummaryWorkbook(new File([masterWorkbook], 'EAG119_Master_Summary.xlsx')))
      .resolves.toMatchObject([{ touchdownStats, touchdownSiteTimes: rows[0].touchdownSiteTimes }]);
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
    expect(parsed.SheetNames).toContain('Detail (各Site明細)');
    expect(parsed.SheetNames).toContain('EAG119_S1P1');
    expect(parsed.SheetNames).toContain('EAG120_S1P1');
    expect(parsed.SheetNames).toContain('Sunburst_Operation');

    const masterRows = stripRowNumbers(
      XLSX.utils.sheet_to_json<Record<string, unknown>>(parsed.Sheets.Master_Summary, { defval: '' })
    );
    expect(masterRows[0]).toMatchObject({ Mode: 'User Mode', Operation: 'Read' });
    expect(masterRows[0].Test_No).toBe(227);
    expect(masterRows[0]).toHaveProperty('Step');
    expect(masterRows[0]).toHaveProperty('Test_Item_Station_Ratio(%)');

    const loaded = await readAnalysisWorkbook(new File([workbook], 'T5830_Analysis_Structure.xlsx'));
    expect(loaded).toHaveLength(2);
    expect(loaded.map((row) => row.Product)).toEqual(['EAG119', 'EAG120']);
    expect(loaded[1]).toMatchObject({
      Test_Item_Merged: 'PROGRAM',
      Grand_Total_Time: 2.5,
      Total_Merged_Count: 1
    });
    expect(loaded[0]).toMatchObject({ Mode: 'User Mode', Operation: 'Read' });
  });

  it('imports legacy analysis workbooks without Test_No', async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{
      Product: 'EAG119',
      Test_Item_Merged: 'READ_ARRAY',
      Grand_Total_Time: 1.25,
      Total_Merged_Count: 1
    }]), 'Master_Summary');

    const loaded = await readAnalysisWorkbook(new File([
      XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
    ], 'legacy.xlsx'));

    expect(loaded[0].Test_No).toBeUndefined();
    expect(loaded[0].touchdownSiteTimes).toBeUndefined();
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
