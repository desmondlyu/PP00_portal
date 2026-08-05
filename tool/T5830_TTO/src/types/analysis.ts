export type ParsedTestRow = {
  site: string;
  touchdown: string;
  step: number;
  testItem: string;
  testNo?: number;
  sweepInfo: string;
  timeSeconds: number;
};

export type MasterSummaryRow = {
  Product: string;
  Process: string;
  Size: string;
  Voltage: string;
  Test_No?: number;
  Test_Item_Merged: string;
  Original_Item_Name: string;
  Grand_Total_Time: number;
  Grand_Total_Ratio: number;
  Total_Merged_Count: number;
  /** 測試站點，從 TAR 檔名解析（如 S1P1） */
  Station: string;
  /** 該站點的時間 */
  Station_Time: number;
  /** 該站點的 count */
  Station_Count: number;
  /** 各觸針(touchdown)時間明細，key 為 TD_1, TD_2... */
  touchdownTimes?: Record<string, number>;
};
