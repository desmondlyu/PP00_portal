import { describe, expect, it } from 'vitest';
import type { MasterSummaryRow } from '../../types/analysis';
import { tdAnalysisGroups, topTdItems } from './dashboardSelectors';

function row(overrides: Partial<MasterSummaryRow> = {}): MasterSummaryRow {
  return {
    Product: 'EAG119',
    Process: 'F58',
    Size: '512M',
    Voltage: '1.8',
    Test_Item: 'READ',
    Test_Item_Merged: 'READ',
    Original_Item_Name: 'READ_(M)',
    Mode: 'Read',
    Operation: 'Read',
    Grand_Total_Time: 1,
    Grand_Total_Ratio: 100,
    Total_Merged_Count: 1,
    Station: 'S1P1',
    Station_Time: 1,
    Station_Count: 1,
    touchdownStats: {
      TD_1: { avg: 2, max: 2, min: 2, range: 0, ratio: 50 },
      TD_2: { avg: 3, max: 3, min: 3, range: 0, ratio: 50 }
    },
    ...overrides
  };
}

const noDimensionFilters = {
  Mode: '',
  Operation: '',
  Test_Item_Merged: '',
  Original_Item_Name: '',
  Test_Item: ''
};

describe('TD analysis selectors', () => {
  it('aggregates each touchdown by product and all mapping dimensions', () => {
    const groups = tdAnalysisGroups([
      row({
        Station: 'S1P1',
        touchdownStats: {
          TD_1: { avg: 2, max: 2, min: 2, range: 0, ratio: 50 },
          TD_2: { avg: 3, max: 3, min: 3, range: 0, ratio: 50 }
        }
      }),
      row({
        Station: 'S2P1',
        touchdownStats: {
          TD_1: { avg: 4, max: 4, min: 4, range: 0, ratio: 50 },
          TD_2: { avg: 6, max: 6, min: 6, range: 0, ratio: 50 }
        }
      }),
      row({ Product: 'FAG103', Test_Item: 'PROGRAM', Test_Item_Merged: 'PROGRAM', Original_Item_Name: 'PROGRAM_(M)' })
    ], noDimensionFilters);

    expect(groups.map((group) => group.product)).toEqual(['FAG103', 'EAG119']);
    expect(groups[1].items[0].stats.TD_1).toEqual({ avg: 3, max: 4, min: 2, range: 2 });
    expect(groups[1].items[0].stats.TD_2).toEqual({ avg: 4.5, max: 6, min: 3, range: 3 });
  });

  it('keeps mapping categories separate and filters by all five dimensions', () => {
    const groups = tdAnalysisGroups([
      row(),
      row({ Mode: 'Program', Operation: 'Program', Test_Item_Merged: 'PROGRAM', Original_Item_Name: 'PROGRAM_(M)', Test_Item: 'READ' })
    ], { ...noDimensionFilters, Mode: 'Read' });

    expect(groups[0].items).toHaveLength(1);
    expect(groups[0].items[0].testItem).toBe('READ');
  });

  it('ranks each metric independently by the largest selected TD value and limits to 20', () => {
    const rows = Array.from({ length: 21 }, (_, index) => row({
      Test_Item: `ITEM_${index + 1}`,
      Test_Item_Merged: `ITEM_${index + 1}`,
      Original_Item_Name: `ITEM_${index + 1}_(M)`,
      touchdownStats: {
        TD_1: { avg: index + 1, max: index + 1, min: index + 1, range: 0, ratio: 100 }
      }
    }));
    const groups = tdAnalysisGroups(rows, noDimensionFilters);
    const ranked = topTdItems(groups[0].items, 'max');

    expect(ranked).toHaveLength(20);
    expect(ranked[0].testItem).toBe('ITEM_21');
    expect(ranked[ranked.length - 1]?.testItem).toBe('ITEM_2');
  });

  it('uses the largest value from any selected touchdown for ranking', () => {
    const groups = tdAnalysisGroups([
      row({
        Test_Item: 'TD_1_ONLY',
        Test_Item_Merged: 'TD_1_ONLY',
        Original_Item_Name: 'TD_1_ONLY_(M)',
        touchdownStats: {
          TD_1: { avg: 1, max: 10, min: 1, range: 9, ratio: 100 }
        }
      }),
      row({
        Test_Item: 'TD_2_WORST',
        Test_Item_Merged: 'TD_2_WORST',
        Original_Item_Name: 'TD_2_WORST_(M)',
        touchdownStats: {
          TD_1: { avg: 1, max: 5, min: 1, range: 4, ratio: 50 },
          TD_2: { avg: 1, max: 11, min: 1, range: 10, ratio: 50 }
        }
      })
    ], noDimensionFilters);

    expect(topTdItems(groups[0].items, 'max')[0].testItem).toBe('TD_2_WORST');
  });
});
