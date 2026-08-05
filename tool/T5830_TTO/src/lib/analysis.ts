import { standardizeTestItem } from './standardizeTestItem';
import { getProductMeta } from './productMetadata';
import type { MasterSummaryRow, ParsedTestRow } from '../types/analysis';

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
  }

  const perItem = new Map<string, Map<string, number[]>>();
  for (const [key, timeSeconds] of perSite) {
    const [, testItem, touchdown] = key.split('\u0000');
    const touchdowns = perItem.get(testItem) ?? new Map<string, number[]>();
    const values = touchdowns.get(touchdown) ?? [];
    values.push(timeSeconds);
    touchdowns.set(touchdown, values);
    perItem.set(testItem, touchdowns);
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
    return {
      Product: resolvedMeta.product,
      Process: resolvedMeta.process,
      Size: resolvedMeta.size,
      Voltage: resolvedMeta.voltage,
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
