import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MasterSummaryRow } from '../../types/analysis';
import { PivotTable, RatioTable } from './PivotTable';

const rows: MasterSummaryRow[] = [
  {
    Product: 'BETA',
    Process: 'F32',
    Size: '256M',
    Voltage: '1.8',
    Test_Item_Merged: 'WRITE',
    Original_Item_Name: 'WRITE_(M)',
    Grand_Total_Time: 30,
    Grand_Total_Ratio: 60,
    Total_Merged_Count: 6,
    Station: 'S1P1',
    Station_Time: 30,
    Station_Count: 6
  },
  {
    Product: 'ALPHA',
    Process: 'F18',
    Size: '128M',
    Voltage: '1.2',
    Test_Item_Merged: 'WRITE',
    Original_Item_Name: 'WRITE_(M)',
    Grand_Total_Time: 10,
    Grand_Total_Ratio: 50,
    Total_Merged_Count: 2,
    Station: 'S1P1',
    Station_Time: 10,
    Station_Count: 2
  },
  {
    Product: 'ALPHA',
    Process: 'F18',
    Size: '128M',
    Voltage: '1.2',
    Test_Item_Merged: 'READ',
    Original_Item_Name: 'READ_(M)',
    Grand_Total_Time: 10,
    Grand_Total_Ratio: 50,
    Total_Merged_Count: 8,
    Station: 'S1P1',
    Station_Time: 10,
    Station_Count: 8
  },
  {
    Product: 'BETA',
    Process: 'F32',
    Size: '256M',
    Voltage: '1.8',
    Test_Item_Merged: 'ERASE',
    Original_Item_Name: 'ERASE_(M)',
    Grand_Total_Time: 20,
    Grand_Total_Ratio: 40,
    Total_Merged_Count: 4,
    Station: 'S1P1',
    Station_Time: 20,
    Station_Count: 4
  }
];

describe('PivotTable', () => {
  it('renders sorted products, metadata rows, and test items sorted by total descending', () => {
    render(<PivotTable rows={rows} valueField="Grand_Total_Time" />);

    expect(screen.getByRole('columnheader', { name: 'ALPHA' })).toBeVisible();
    expect(screen.getByRole('columnheader', { name: 'BETA' })).toBeVisible();
    expect(screen.getByText('📌 [產品總測試時間]')).toBeVisible();
    expect(screen.getByText('🏭 [製程]')).toBeVisible();
    expect(screen.getByText('📦 [容量]')).toBeVisible();
    expect(screen.getByText('⚡ [電壓]')).toBeVisible();
    expect(screen.getAllByText('N/A')).toHaveLength(4);
    expect(screen.getByRole('cell', { name: '1.2V' })).toBeVisible();

    const rowHeaders = screen.getAllByRole('rowheader').map((cell) => cell.textContent);
    expect(rowHeaders.slice(4)).toEqual(['WRITE', 'ERASE', 'READ']);

    const writeRow = screen.getByRole('rowheader', { name: 'WRITE' }).closest('tr');
    expect(writeRow).not.toBeNull();
    expect(within(writeRow as HTMLTableRowElement).getByRole('cell', { name: '40.00' })).toBeVisible();

    const eraseRow = screen.getByRole('rowheader', { name: 'ERASE' }).closest('tr');
    expect(eraseRow).not.toBeNull();
    expect(within(eraseRow as HTMLTableRowElement).getAllByRole('cell', { name: '20.00' })).toHaveLength(2);
  });

  it('exports workbook through the provided callback', () => {
    const onDownload = vi.fn();
    render(<PivotTable rows={rows} valueField="Total_Merged_Count" onDownload={onDownload} />);

    fireEvent.click(screen.getByRole('button', { name: '下載 Excel' }));

    expect(onDownload).toHaveBeenCalledTimes(1);
    expect(onDownload.mock.calls[0][0]).toBeInstanceOf(Blob);
    expect(onDownload.mock.calls[0][1]).toBe('pivot-total-count.xlsx');
  });
});

describe('RatioTable', () => {
  it('renders percentages, metadata dashes, and average column', () => {
    render(<RatioTable rows={rows} />);

    expect(screen.getByRole('columnheader', { name: '🌟 平均佔比 (Avg)' })).toBeVisible();
    expect(screen.getByText('📌 [產品總測試時間]')).toBeVisible();
    expect(screen.getAllByText('-')).toHaveLength(4);

    const writeRow = screen.getByRole('rowheader', { name: 'WRITE' }).closest('tr');
    expect(writeRow).not.toBeNull();
    expect(within(writeRow as HTMLTableRowElement).getByRole('cell', { name: '50.00%' })).toBeVisible();
    expect(within(writeRow as HTMLTableRowElement).getByRole('cell', { name: '60.00%' })).toBeVisible();
    expect(within(writeRow as HTMLTableRowElement).getByRole('cell', { name: '55.00%' })).toBeVisible();
  });
});
