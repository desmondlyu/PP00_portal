import { compareProducts } from '../../lib/productMetadata';
import type { MasterSummaryRow, TouchdownStats } from '../../types/analysis';

export type DashboardFilters = {
  process: string[];
  size: string[];
  voltage: string[];
  product: string[];
  station: string[];
  touchdown: string[];
};

export const allFilters: DashboardFilters = {
  process: [],
  size: [],
  voltage: [],
  product: [],
  station: [],
  touchdown: []
};

export const tdMetrics = ['avg', 'max', 'min', 'range'] as const;
export type TdMetric = (typeof tdMetrics)[number];
export const tdDimensions = ['Mode', 'Operation', 'Test_Item_Merged', 'Original_Item_Name', 'Test_Item'] as const;
export type TdDimension = (typeof tdDimensions)[number];
export type TdDimensionFilters = Record<TdDimension, string>;

export type TdAnalysisItem = {
  testItem: string;
  stats: Record<string, Pick<TouchdownStats, TdMetric>>;
};

export type TdAnalysisGroup = {
  product: string;
  items: TdAnalysisItem[];
};

export function tdDimensionValue(row: MasterSummaryRow, dimension: TdDimension) {
  return dimension === 'Test_Item'
    ? row.Test_Item ?? row.Test_Item_Merged
    : row[dimension] ?? '';
}

/**
 * ponytail: Python dashboard does groupby(['Process','Size','Product','Voltage','Test_Item_Merged']).agg(sum)
 * after standardization. We replicate that here.
 */
export function aggregateByStandardizedItem(rows: MasterSummaryRow[]): MasterSummaryRow[] {
  const groups = new Map<string, MasterSummaryRow>();
  for (const row of rows) {
    const key = `${row.Product}\x00${row.Test_Item_Merged}`;
    const existing = groups.get(key);
    if (existing) {
      existing.Grand_Total_Time += row.Grand_Total_Time;
      existing.Total_Merged_Count += row.Total_Merged_Count;
    } else {
      groups.set(key, { ...row });
    }
  }
  // Recalculate ratio per product
  const productTotals = new Map<string, number>();
  for (const row of groups.values()) {
    productTotals.set(row.Product, (productTotals.get(row.Product) ?? 0) + row.Grand_Total_Time);
  }
  for (const row of groups.values()) {
    const total = productTotals.get(row.Product) ?? 1;
    row.Grand_Total_Ratio = total > 0 ? (row.Grand_Total_Time / total) * 100 : 0;
  }
  return [...groups.values()];
}

function matchesFilters(row: MasterSummaryRow, filters: DashboardFilters) {
  return (
    (filters.process.length === 0 || filters.process.includes(row.Process)) &&
    (filters.size.length === 0 || filters.size.includes(row.Size)) &&
    (filters.voltage.length === 0 || filters.voltage.includes(row.Voltage)) &&
    (filters.product.length === 0 || filters.product.includes(row.Product)) &&
    (filters.station.length === 0 || filters.station.includes(row.Station))
  );
}

function selectTouchdowns(row: MasterSummaryRow, touchdowns: string[]) {
  if (touchdowns.length === 0) return row;
  const touchdownTimes = Object.fromEntries(
    touchdowns
      .filter((touchdown) => row.touchdownTimes?.[touchdown] !== undefined)
      .map((touchdown) => [touchdown, row.touchdownTimes![touchdown]])
  );
  const touchdownStats = row.touchdownStats
    ? Object.fromEntries(
        touchdowns
          .filter((touchdown) => row.touchdownStats?.[touchdown] !== undefined)
          .map((touchdown) => [touchdown, row.touchdownStats![touchdown]])
      )
    : undefined;
  const selectedTime = Object.values(touchdownTimes).reduce((sum, time) => sum + time, 0);
  const maxRatio = touchdownStats
    ? Math.max(0, ...Object.values(touchdownStats).map((stats) => stats.ratio))
    : row.Test_Item_Station_Ratio;

  return {
    ...row,
    Grand_Total_Time: selectedTime,
    Station_Time: selectedTime,
    Test_Item_Station_Ratio: maxRatio,
    touchdownTimes,
    touchdownStats
  };
}

export function filterRawSummary(rows: MasterSummaryRow[], filters: DashboardFilters) {
  return rows
    .filter((row) => matchesFilters(row, filters))
    .map((row) => selectTouchdowns(row, filters.touchdown));
}

export function filterSummary(rows: MasterSummaryRow[], filters: DashboardFilters) {
  return aggregateByStandardizedItem(filterRawSummary(rows, filters));
}

export function distinct(rows: MasterSummaryRow[], field: keyof Pick<MasterSummaryRow, 'Process' | 'Size' | 'Voltage' | 'Product' | 'Station'>) {
  const values = [...new Set(rows.map((row) => row[field]).filter(Boolean))];
  return field === 'Product' ? values.sort(compareProducts) : values.sort();
}

export function distinctTouchdowns(rows: MasterSummaryRow[]) {
  return [...new Set(rows.flatMap((row) => [
    ...Object.keys(row.touchdownTimes ?? {}),
    ...Object.keys(row.touchdownStats ?? {})
  ]))].sort((left, right) => Number.parseInt(left.slice(3), 10) - Number.parseInt(right.slice(3), 10));
}

export function tdAnalysisGroups(rows: MasterSummaryRow[], filters: TdDimensionFilters): TdAnalysisGroup[] {
  type Aggregate = {
    product: string;
    testItem: string;
    touchdowns: Map<string, { avgTotal: number; count: number; max: number; min: number }>;
  };
  const groups = new Map<string, Aggregate>();

  for (const row of rows) {
    if (!row.touchdownStats) continue;
    const dimensions = tdDimensions.map((dimension) => tdDimensionValue(row, dimension));
    if (tdDimensions.some((dimension, index) => filters[dimension] && filters[dimension] !== dimensions[index])) continue;

    const key = [row.Product, ...dimensions].join('\x00');
    const aggregate = groups.get(key) ?? {
      product: row.Product,
      testItem: dimensions[tdDimensions.indexOf('Test_Item')],
      touchdowns: new Map()
    };

    for (const [touchdown, stats] of Object.entries(row.touchdownStats)) {
      const values = aggregate.touchdowns.get(touchdown) ?? {
        avgTotal: 0,
        count: 0,
        max: Number.NEGATIVE_INFINITY,
        min: Number.POSITIVE_INFINITY
      };
      values.avgTotal += stats.avg;
      values.count += 1;
      values.max = Math.max(values.max, stats.max);
      values.min = Math.min(values.min, stats.min);
      aggregate.touchdowns.set(touchdown, values);
    }
    groups.set(key, aggregate);
  }

  const byProduct = new Map<string, TdAnalysisItem[]>();
  for (const aggregate of groups.values()) {
    const stats = Object.fromEntries(
      [...aggregate.touchdowns].map(([touchdown, values]) => [touchdown, {
        avg: values.avgTotal / values.count,
        max: values.max,
        min: values.min,
        range: values.max - values.min
      }])
    );
    const items = byProduct.get(aggregate.product) ?? [];
    items.push({ testItem: aggregate.testItem, stats });
    byProduct.set(aggregate.product, items);
  }

  return [...byProduct].map(([product, items]) => ({
    product,
    items: items.sort((left, right) => left.testItem.localeCompare(right.testItem))
  })).sort((left, right) => compareProducts(left.product, right.product));
}

export function topTdItems(items: TdAnalysisItem[], metric: TdMetric, limit = 20) {
  return [...items]
    .sort((left, right) => {
      const leftWorst = Math.max(0, ...Object.values(left.stats).map((stats) => stats[metric]));
      const rightWorst = Math.max(0, ...Object.values(right.stats).map((stats) => stats[metric]));
      return rightWorst - leftWorst || left.testItem.localeCompare(right.testItem);
    })
    .slice(0, limit);
}

export function productItemTimes(rows: MasterSummaryRow[]) {
  const grouped = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const productItems = grouped.get(row.Product) ?? new Map<string, number>();
    productItems.set(row.Test_Item_Merged, (productItems.get(row.Test_Item_Merged) ?? 0) + row.Grand_Total_Time);
    grouped.set(row.Product, productItems);
  }
  return grouped;
}

export function topStackedItems(rows: MasterSummaryRow[], limit = 10) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(row.Test_Item_Merged, (totals.get(row.Test_Item_Merged) ?? 0) + row.Grand_Total_Time);
  }
  const items = [...totals.entries()].sort(([, left], [, right]) => right - left);
  return new Set(items.slice(0, limit).map(([item]) => item));
}

export function pivot(rows: MasterSummaryRow[], value: 'Grand_Total_Time' | 'Total_Merged_Count') {
  const products = distinct(rows, 'Product');
  const items = [...new Set(rows.map((row) => row.Test_Item_Merged))].sort();
  return {
    products,
    items: items.map((item) => ({
      item,
      values: products.map((product) =>
        rows
          .filter((row) => row.Product === product && row.Test_Item_Merged === item)
          .reduce((sum, row) => sum + row[value], 0)
      )
    }))
  };
}
