import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { MasterSummaryRow } from '../../types/analysis';
import { TdAnalysisTab } from './TdAnalysisTab';

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
      TD_1: { avg: 1, max: 2, min: 0.5, range: 1.5, ratio: 50 },
      TD_2: { avg: 2, max: 3, min: 1, range: 2, ratio: 50 }
    },
    ...overrides
  };
}

describe('TdAnalysisTab', () => {
  it('renders a 2 by 2 TD statistic chart row for every product', () => {
    render(<TdAnalysisTab rows={[
      row(),
      row({ Product: 'FAG103', Test_Item: 'PROGRAM', Test_Item_Merged: 'PROGRAM', Original_Item_Name: 'PROGRAM_(M)' })
    ]} />);

    expect(screen.getByRole('heading', { name: 'TD 分析' })).toBeVisible();
    expect(screen.getByText(/每張圖各自顯示前 20 名/)).toBeVisible();
    expect(screen.getByRole('heading', { name: 'EAG119' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'FAG103' })).toBeVisible();
    for (const metric of ['AVG', 'MAX', 'MIN', 'RANGE']) {
      expect(screen.getAllByRole('img', { name: new RegExp(`${metric} Top 20`) })).toHaveLength(2);
    }
  });

  it('explains how to recover TD statistics when they are unavailable', () => {
    render(<TdAnalysisTab rows={[row({ touchdownStats: undefined })]} />);

    expect(screen.getByText(/沒有可用的 TD 統計資料/)).toBeVisible();
    expect(screen.getByText(/分析所有TD/)).toBeVisible();
  });

  it('filters charts using the hierarchy selectors', () => {
    render(<TdAnalysisTab rows={[
      row(),
      row({ Test_Item: 'PROGRAM', Test_Item_Merged: 'PROGRAM', Original_Item_Name: 'PROGRAM_(M)', Mode: 'Program', Operation: 'Program' })
    ]} />);

    fireEvent.change(screen.getByLabelText('Operation'), { target: { value: 'Program' } });

    expect(screen.getAllByText('PROGRAM', { selector: 'svg text' })).toHaveLength(4);
    expect(screen.queryByText('READ', { selector: 'svg text' })).not.toBeInTheDocument();
  });
});
