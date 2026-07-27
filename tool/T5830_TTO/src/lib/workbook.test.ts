import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import { readMappingWorkbook, readMasterSummaryWorkbook, writeMasterSummaryWorkbook } from './workbook';
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
});
