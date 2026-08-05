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
  it('renders a MAX Heatmap for every product', () => {
    render(<TdAnalysisTab rows={[
      row(),
      row({ Product: 'FAG103', Test_Item: 'PROGRAM', Test_Item_Merged: 'PROGRAM', Original_Item_Name: 'PROGRAM_(M)' })
    ]} />);

    expect(screen.getByRole('heading', { name: 'TD 分析' })).toBeVisible();
    expect(screen.getByText(/每個產品各自顯示前 20 名/)).toBeVisible();
    expect(screen.getByRole('heading', { name: 'EAG119' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'FAG103' })).toBeVisible();
    expect(screen.getAllByRole('button', { name: 'MAX' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'MAX' }).every((button) => button.getAttribute('aria-pressed') === 'true')).toBe(true);
    expect(screen.getAllByRole('table', { name: /TD Heatmap/ })).toHaveLength(2);
    expect(screen.getAllByRole('columnheader', { name: 'Item' })).toHaveLength(2);
    expect(screen.queryByRole('columnheader', { name: 'Hierarchy' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Test_Item' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('columnheader', { name: 'TD_1' })).toHaveLength(2);
    expect(screen.getAllByRole('cell', { name: 'Item: READ > READ_(M) > READ' })).toHaveLength(1);
    expect(screen.getByRole('button', { name: /EAG119.*READ.*TD_2.*MAX.*3\.00 秒/ })).toBeVisible();
  });

  it('explains how to recover TD statistics when they are unavailable', () => {
    render(<TdAnalysisTab rows={[row({ touchdownStats: undefined })]} />);

    expect(screen.getByText(/沒有可用的 TD 統計資料/)).toBeVisible();
    expect(screen.getByText(/分析所有TD/)).toBeVisible();
  });

  it('switches statistics and opens a closable TD detail dialog', () => {
    render(<TdAnalysisTab rows={[row()]} />);

    fireEvent.click(screen.getByRole('button', { name: 'RANGE' }));

    expect(screen.getByRole('button', { name: 'RANGE' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'MAX' })).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(screen.getByRole('button', { name: /EAG119.*READ.*TD_2.*RANGE.*2\.00 秒/ }));

    const detail = screen.getByRole('dialog', { name: 'TD 明細' });
    expect(detail).toHaveTextContent('TD_2');
    expect(detail).toHaveTextContent('2.00 秒');
    expect(detail).toHaveTextContent('READ_(M)');

    fireEvent.click(screen.getByRole('button', { name: '關閉' }));

    expect(screen.queryByRole('dialog', { name: 'TD 明細' })).not.toBeInTheDocument();
  });

  it('removes hierarchy filters from the Heatmap tab', () => {
    render(<TdAnalysisTab rows={[row()]} />);

    expect(screen.queryByLabelText('Mode')).not.toBeInTheDocument();
    expect(screen.queryByText('TD 分析階層篩選')).not.toBeInTheDocument();
  });
});
