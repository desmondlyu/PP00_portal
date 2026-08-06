import { standardizeTestItem } from './standardizeTestItem';
import { getProductMeta } from './productMetadata';
import type { MasterSummaryRow, ParsedTestRow, TouchdownSiteTimes, TouchdownStats } from '../types/analysis';

export type MergeRow = {
  testItem: string;
  touchdownTimes: Record<string, number>;
  mergedCount: number;
  totalTime: number;
  totalRatioPercent: number;
};

export type AnalysisReport = {
  detail: ParsedTestRow[];
  merge: MergeRow[];
  masterSummary: MasterSummaryRow[];
};

export type ProductMetadata = {
  product: string;
  process: string;
  size: string;
  voltage: string;
};

export function fitTimeRegression(points: Array<{ bytes: number; seconds: number }>) {
  if (points.length === 0) return { slope: 0, intercept: 0 };

  const count = points.length;
  const sumX = points.reduce((sum, point) => sum + point.bytes, 0);
  const sumY = points.reduce((sum, point) => sum + point.seconds, 0);
  const sumXY = points.reduce((sum, point) => sum + point.bytes * point.seconds, 0);
  const sumXX = points.reduce((sum, point) => sum + point.bytes * point.bytes, 0);
  const denominator = count * sumXX - sumX * sumX;

  if (denominator === 0) return { slope: 0, intercept: sumY / count };

  const slope = (count * sumXY - sumX * sumY) / denominator;
  return {
    slope: Math.max(0, slope),
    intercept: Math.max(0, (sumY - slope * sumX) / count)
  };
}

export function buildAnalysisReport(
  rows: ParsedTestRow[],
  metadata: ProductMetadata = { product: 'N/A', process: 'N/A', size: 'N/A', voltage: 'N/A' },
  station: string = 'Unknown'
): AnalysisReport {
  // ponytail: 用 PRODUCT_METADATA 自動填 process/size/voltage（如果呼叫者沒給）
  const resolvedMeta = { ...metadata };
  if (resolvedMeta.product !== 'N/A' && resolvedMeta.process === 'N/A') {
    const lookup = getProductMeta(resolvedMeta.product);
    resolvedMeta.process = lookup.Process;
    resolvedMeta.size = lookup.Size;
    resolvedMeta.voltage = lookup.Voltage;
  }

  const perSite = new Map<string, number>();
  const stepsByItem = new Map<string, Set<number>>();
  const testNumbersByItem = new Map<string, Set<number>>();
  const td1MetadataByItem = new Map<string, { step: number; sweepInfos: Set<string> }>();

  for (const row of rows) {
    const key = `${row.site}\u0000${row.testItem}\u0000${row.touchdown}`;
    perSite.set(key, (perSite.get(key) ?? 0) + row.timeSeconds);

    const steps = stepsByItem.get(row.testItem) ?? new Set<number>();
    steps.add(row.step);
    stepsByItem.set(row.testItem, steps);
    if (row.testNo !== undefined) {
      const numbers = testNumbersByItem.get(row.testItem) ?? new Set<number>();
      numbers.add(row.testNo);
      testNumbersByItem.set(row.testItem, numbers);
    }
    if (row.touchdown === 'TD_1') {
      const current = td1MetadataByItem.get(row.testItem);
      if (current) {
        current.step = Math.min(current.step, row.step);
        current.sweepInfos.add(row.sweepInfo);
      } else {
        td1MetadataByItem.set(row.testItem, { step: row.step, sweepInfos: new Set([row.sweepInfo]) });
      }
    }
  }

  const perItem = new Map<string, Map<string, number[]>>();
  const touchdownValuesByItem = new Map<string, Map<string, number[]>>();
  const touchdownSiteTimesByItem = new Map<string, TouchdownSiteTimes>();
  for (const [key, timeSeconds] of perSite) {
    const [site, testItem, touchdown] = key.split('\u0000');
    const touchdowns = perItem.get(testItem) ?? new Map<string, number[]>();
    const values = touchdowns.get(touchdown) ?? [];
    values.push(timeSeconds);
    touchdowns.set(touchdown, values);
    perItem.set(testItem, touchdowns);
    const touchdownValues = touchdownValuesByItem.get(testItem) ?? new Map<string, number[]>();
    const valuesByTouchdown = touchdownValues.get(touchdown) ?? [];
    valuesByTouchdown.push(timeSeconds);
    touchdownValues.set(touchdown, valuesByTouchdown);
    touchdownValuesByItem.set(testItem, touchdownValues);

    const touchdownSiteTimes = touchdownSiteTimesByItem.get(testItem) ?? {};
    const siteTimes = touchdownSiteTimes[touchdown] ?? {};
    siteTimes[site] = timeSeconds;
    touchdownSiteTimes[touchdown] = siteTimes;
    touchdownSiteTimesByItem.set(testItem, touchdownSiteTimes);
  }

  const merge = [...perItem].map(([testItem, touchdowns]) => {
    const touchdownTimes = Object.fromEntries(
      [...touchdowns].map(([touchdown, values]) => [
        touchdown,
        values.reduce((sum, value) => sum + value, 0) / values.length
      ])
    );
    const totalTime = Object.values(touchdownTimes).reduce((sum, value) => sum + value, 0);

    return {
      testItem,
      touchdownTimes,
      mergedCount: stepsByItem.get(testItem)?.size ?? 0,
      totalTime,
      totalRatioPercent: 0
    };
  }).sort((left, right) => right.totalTime - left.totalTime);

  const grandTotal = merge.reduce((sum, item) => sum + item.totalTime, 0);
  const stationTouchdownTotals = new Map<string, number>();
  for (const touchdownValues of touchdownValuesByItem.values()) {
    for (const [touchdown, values] of touchdownValues) {
      stationTouchdownTotals.set(
        touchdown,
        (stationTouchdownTotals.get(touchdown) ?? 0) + values.reduce((sum, value) => sum + value, 0)
      );
    }
  }
  for (const item of merge) {
    item.totalRatioPercent = grandTotal > 0 ? item.totalTime / grandTotal * 100 : 0;
  }

  const masterSummary = merge.map((item) => {
    // ponytail: Python appends _(M) to Test_Item in Merge sheet, Mapping uses that form
    const originalName = `${item.testItem}_(M)`;
    // 保留各觸針 (touchdown) 時間明細，供 Excel 匯出用
    const tdTimes: Record<string, number> = {};
    for (const [td, time] of Object.entries(item.touchdownTimes)) {
      tdTimes[td] = Math.round(time * 100) / 100;
    }
    const touchdownValues = touchdownValuesByItem.get(item.testItem) ?? new Map<string, number[]>();
    const touchdownStats: Record<string, TouchdownStats> = {};
    for (const [touchdown, values] of touchdownValues) {
      const total = values.reduce((sum, value) => sum + value, 0);
      touchdownStats[touchdown] = {
        avg: total / values.length,
        max: Math.max(...values),
        min: Math.min(...values),
        range: Math.max(...values) - Math.min(...values),
        ratio: stationTouchdownTotals.get(touchdown)
          ? total / stationTouchdownTotals.get(touchdown)! * 100
          : 0
      };
    }
    const td1Stats = touchdownStats.TD_1;
    const td1Metadata = td1MetadataByItem.get(item.testItem);
    return {
      Product: resolvedMeta.product,
      Process: resolvedMeta.process,
      Size: resolvedMeta.size,
      Voltage: resolvedMeta.voltage,
      ...(td1Metadata
        ? {
            Step: td1Metadata.step,
            Test_Item: item.testItem,
            Sweep_Info: [...td1Metadata.sweepInfos].sort().join(' / ')
          }
        : {}),
      ...(testNumbersByItem.get(item.testItem)?.size === 1
        ? { Test_No: [...testNumbersByItem.get(item.testItem)!][0] }
        : {}),
      Original_Item_Name: originalName,
      Test_Item_Merged: standardizeTestItem(originalName),
      Grand_Total_Time: item.totalTime,
      Grand_Total_Ratio: item.totalRatioPercent,
      Total_Merged_Count: item.mergedCount,
      Station: station,
      Station_Time: item.totalTime,
      Station_Count: item.mergedCount,
      ...(td1Stats
        ? {
            test_item_avg: td1Stats.avg,
            test_item_max: td1Stats.max,
            test_item_min: td1Stats.min,
            test_item_range: td1Stats.range,
            Test_Item_Station_Ratio: td1Stats.ratio
          }
        : {}),
      touchdownStats: Object.keys(touchdownStats).length > 0 ? touchdownStats : undefined,
      touchdownSiteTimes: touchdownSiteTimesByItem.get(item.testItem),
      touchdownTimes: tdTimes
    };
  });

  return { detail: rows, merge, masterSummary };
}

/** 合併多個產品的報告（多產品匯入時使用） */
export function mergeAnalysisReports(reports: AnalysisReport[]): AnalysisReport {
  return {
    detail: reports.flatMap((r) => r.detail),
    merge: reports.flatMap((r) => r.merge),
    masterSummary: reports.flatMap((r) => r.masterSummary)
  };
}
