import { describe, expect, it } from 'vitest';
import { buildAnalysisReport, fitTimeRegression } from './analysis';
import type { ParsedTestRow } from '../types/analysis';

const row = (
  site: string,
  touchdown: string,
  step: number,
  testItem: string,
  sweepInfo: string,
  timeSeconds: number,
  testNo?: number
): ParsedTestRow => ({ site, touchdown, step, testItem, sweepInfo, timeSeconds, testNo });

describe('buildAnalysisReport', () => {
  it('creates Merge rows sorted by total time', () => {
    const report = buildAnalysisReport([
      row('Site_01', 'TD_1', 1, 'FAST', 'None', 1),
      row('Site_02', 'TD_1', 1, 'SLOW', 'None', 3),
      row('Site_01', 'TD_2', 2, 'SLOW', 'None', 2)
    ]);

    expect(report.merge[0]).toMatchObject({ testItem: 'SLOW', totalTime: 5, mergedCount: 2 });
  });

  it('uses zero instead of Infinity when a report has no total time', () => {
    const report = buildAnalysisReport([row('Site_01', 'TD_1', 1, 'ZERO', 'None', 0)]);

    expect(report.merge[0].totalRatioPercent).toBe(0);
  });

  it('calculates slope and intercept from two byte lengths', () => {
    const regression = fitTimeRegression([
      { bytes: 100, seconds: 0.3 },
      { bytes: 200, seconds: 0.5 }
    ]);

    expect(regression.slope).toBeCloseTo(0.002);
    expect(regression.intercept).toBeCloseTo(0.1);
  });

  it('creates Master Summary rows with the dashboard required fields', () => {
    const report = buildAnalysisReport(
      [row('Site_01', 'TD_1', 1, 'READ_ARRAY', 'None', 1)],
      { product: 'EAG119', process: 'F58', size: '512M', voltage: '1.8' }
    );

    expect(report.masterSummary).toEqual([{
      Product: 'EAG119',
      Process: 'F58',
      Size: '512M',
      Voltage: '1.8',
      Step: 1,
      Test_Item: 'READ_ARRAY',
      Sweep_Info: 'None',
      Original_Item_Name: 'READ_ARRAY_(M)',
      Test_Item_Merged: 'READ_ARRAY_(M)',
      Grand_Total_Time: 1,
      Grand_Total_Ratio: 100,
      Total_Merged_Count: 1,
      Station: 'Unknown',
      Station_Time: 1,
      Station_Count: 1,
      test_item_avg: 1,
      test_item_max: 1,
      test_item_min: 1,
      test_item_range: 0,
      Test_Item_Station_Ratio: 100,
      touchdownTimes: { TD_1: 1 }
    }]);
  });

  it('calculates TD_1 site statistics without mixing TD_2', () => {
    const report = buildAnalysisReport(
      [
        row('Site_01', 'TD_1', 3, 'READ_ARRAY', '1~2', 2),
        row('Site_02', 'TD_1', 3, 'READ_ARRAY', '1~2', 4),
        row('Site_01', 'TD_2', 4, 'READ_ARRAY', 'None', 100)
      ],
      { product: 'EAG119', process: 'F58', size: '512M', voltage: '1.8' },
      'S1P1'
    );

    expect(report.masterSummary[0]).toMatchObject({
      Station: 'S1P1',
      Step: 3,
      Test_Item: 'READ_ARRAY',
      Sweep_Info: '1~2',
      test_item_avg: 3,
      test_item_max: 4,
      test_item_min: 2,
      test_item_range: 2,
      Test_Item_Station_Ratio: 100
    });
  });

  it('keeps a unique Test_No for the matching original test item', () => {
    const report = buildAnalysisReport(
      [row('Site_01', 'TD_1', 1, 'JEDEC_ID', 'None', 1, 227)],
      { product: 'EAG119', process: 'F58', size: '512M', voltage: '1.8' }
    );

    expect(report.masterSummary[0]).toMatchObject({
      Test_No: 227,
      Original_Item_Name: 'JEDEC_ID_(M)'
    });
  });

  it('clears Test_No when one test item has conflicting numbers', () => {
    const report = buildAnalysisReport(
      [
        row('Site_01', 'TD_1', 1, 'JEDEC_ID', 'None', 1, 227),
        row('Site_01', 'TD_2', 2, 'JEDEC_ID', 'None', 1, 228)
      ],
      { product: 'EAG119', process: 'F58', size: '512M', voltage: '1.8' }
    );

    expect(report.masterSummary[0].Test_No).toBeUndefined();
  });
});
