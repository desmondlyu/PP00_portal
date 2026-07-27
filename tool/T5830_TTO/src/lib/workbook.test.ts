import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import {
  readAnalysisWorkbook,
  readMappingWorkbook,
  readMasterSummaryWorkbook,
  writeAnalysisWorkbook,
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

describe('Master Summary workbook', () => {
  it('writes and reads the dashboard required fields', async () => {
    const workbook = writeMasterSummaryWorkbook(rows);
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
    const workbook = writeAnalysisWorkbook(multiProductRows);
    const parsed = XLSX.read(workbook, { type: 'array' });

    expect(parsed.SheetNames).toContain('Master_Summary');
    expect(parsed.SheetNames).toContain('EAG119_S1P1');
    expect(parsed.SheetNames).toContain('EAG120_S1P1');

    const loaded = await readAnalysisWorkbook(new File([workbook], 'T5830_Analysis_Structure.xlsx'));
    expect(loaded).toHaveLength(2);
    expect(loaded.map((row) => row.Product)).toEqual(['EAG119', 'EAG120']);
    expect(loaded[1]).toMatchObject({
      Test_Item_Merged: 'PROGRAM',
      Grand_Total_Time: 2.5,
      Total_Merged_Count: 1
    });
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
});
