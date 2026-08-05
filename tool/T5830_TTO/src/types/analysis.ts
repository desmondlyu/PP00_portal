export type ParsedTestRow = {
  site: string;
  touchdown: string;
  step: number;
  testItem: string;
  testNo?: number;
  sweepInfo: string;
  timeSeconds: number;
};

export type TouchdownStats = {
  avg: number;
  max: number;
  min: number;
  range: number;
  ratio: number;
};

export type MasterSummaryRow = {
  Product: string;
  Process: string;
  Size: string;
  Voltage: string;
  Step?: number;
  Test_Item?: string;
  Sweep_Info?: string;
  Test_No?: number;
  Test_Item_Merged: string;
  Original_Item_Name: string;
  Mode?: string;
  Operation?: string;
  Grand_Total_Time: number;
  Grand_Total_Ratio: number;
  Total_Merged_Count: number;
  /** 測試站點，從 TAR 檔名解析（如 S1P1） */
  Station: string;
  /** 該站點的時間 */
  Station_Time: number;
  /** 該站點的 count */
  Station_Count: number;
  /** TD_1 的跨 Site 統計 */
  test_item_avg?: number;
  test_item_max?: number;
  test_item_min?: number;
  test_item_range?: number;
  /** 該 Test_Item 的 TD_1 時間占所在 Station 全部 TD_1 時間比例 */
  Test_Item_Station_Ratio?: number;
  /** 各 touchdown 的跨 Site 統計與所在 Station 時間比例 */
  touchdownStats?: Record<string, TouchdownStats>;
  /** 各觸針(touchdown)時間明細，key 為 TD_1, TD_2... */
  touchdownTimes?: Record<string, number>;
};
