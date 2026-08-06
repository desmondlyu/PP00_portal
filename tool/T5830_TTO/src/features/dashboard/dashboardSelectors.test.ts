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
      TD_1: { avg: 2, max: 2, min: 2, range: 0, ratio: 100 }
    },
    touchdownSiteTimes: {
      TD_1: { Site_01: 1, Site_02: 3 }
    },
    ...overrides
  };
}

describe('TD analysis selectors', () => {
  it('sums each category Site time before calculating TD statistics', () => {
    const groups = tdAnalysisGroups([
      row(),
      row({
        Test_Item: 'WRITE',
        Test_Item_Merged: 'WRITE',
        Original_Item_Name: 'WRITE_(M)',
        touchdownSiteTimes: { TD_1: { Site_01: 2, Site_02: 4 } }
      })
    ], 'Mode');

    expect(groups).toMatchObject([{
      product: 'EAG119',
      items: [{
        category: 'Read',
        stats: {
          TD_1: { avg: 5, max: 7, min: 3, range: 4 }
        },
        sources: [{
          Mode: 'Read',
          Operation: 'Read',
          Original_Item_Name: 'READ_(M)',
          Test_Item_Merged: 'READ',
          Test_Item: 'READ',
          touchdownTimes: { TD_1: 4 }
        }, {
          Mode: 'Read',
          Operation: 'Read',
          Original_Item_Name: 'WRITE_(M)',
          Test_Item_Merged: 'WRITE',
          Test_Item: 'WRITE',
          touchdownTimes: { TD_1: 6 }
        }]
      }]
    }]);
  });

  it('keeps selected categories separate and uses 未分類 for missing Mapping labels', () => {
    const groups = tdAnalysisGroups([
      row({ Operation: 'Read' }),
      row({
        Test_Item: 'WRITE',
        Test_Item_Merged: 'WRITE',
        Original_Item_Name: 'WRITE_(M)',
        Operation: 'Program'
      }),
      row({
        Test_Item: 'UNKNOWN',
        Test_Item_Merged: 'UNKNOWN',
        Original_Item_Name: 'UNKNOWN_(M)',
        Mode: undefined
      })
    ], 'Operation');
    const modeGroups = tdAnalysisGroups([row({ Mode: undefined })], 'Mode');

    expect(groups[0].items.map((item) => item.category)).toEqual(['Program', 'Read']);
    expect(modeGroups[0].items[0].category).toBe('未分類');
  });

  it('excludes legacy summary rows without Site × TD detail', () => {
    expect(tdAnalysisGroups([
      row({ touchdownSiteTimes: undefined })
    ], 'Test_Item')).toEqual([]);
  });

  it('combines matching source Items across stations in the dialog detail', () => {
    const groups = tdAnalysisGroups([
      row({ Station: 'S1P1', touchdownSiteTimes: { TD_1: { Site_01: 2 } } }),
      row({ Station: 'S2P1', touchdownSiteTimes: { TD_1: { Site_01: 5 } } })
    ], 'Mode');

    expect(groups[0].items[0].sources).toMatchObject([{
      Original_Item_Name: 'READ_(M)',
      touchdownTimes: { TD_1: 7 }
    }]);
  });

  it('ranks categories by their largest TD value and limits to 20', () => {
    const groups = tdAnalysisGroups(
      Array.from({ length: 21 }, (_, index) => row({
        Test_Item: `ITEM_${index + 1}`,
        Test_Item_Merged: `ITEM_${index + 1}`,
        Original_Item_Name: `ITEM_${index + 1}_(M)`,
        touchdownSiteTimes: { TD_1: { Site_01: index + 1 } }
      })),
      'Test_Item'
    );
    const ranked = topTdItems(groups[0].items, 'max');

    expect(ranked).toHaveLength(20);
    expect(ranked[0].category).toBe('ITEM_21');
    expect(ranked[ranked.length - 1]?.category).toBe('ITEM_2');
  });
});
