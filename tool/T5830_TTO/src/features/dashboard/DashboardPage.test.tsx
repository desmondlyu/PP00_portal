import * as XLSX from 'xlsx';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DashboardPage } from './DashboardPage';
import type { MasterSummaryRow } from '../../types/analysis';

const summaries: MasterSummaryRow[] = [
  {
    Product: 'EAG119',
    Process: 'F58',
    Size: '512M',
    Voltage: '1.8',
    Original_Item_Name: 'READ_ARRAY_(M)',
    Test_Item_Merged: 'READ_ARRAY',
    Grand_Total_Time: 1.25,
    Grand_Total_Ratio: 62.5,
    Total_Merged_Count: 4,
    Station: 'S1P1',
    Station_Time: 1.25,
    Station_Count: 4
  },
  {
    Product: 'FAG103',
    Process: 'F45',
    Size: '256M',
    Voltage: '1.8',
    Original_Item_Name: 'PROGRAM_(M)',
    Test_Item_Merged: 'PROGRAM',
    Grand_Total_Time: 0.75,
    Grand_Total_Ratio: 37.5,
    Total_Merged_Count: 2,
    Station: 'S1P1',
    Station_Time: 0.75,
    Station_Count: 2
  }
];

describe('DashboardPage', () => {
  it('renders all six accessible tabs from supplied summaries', () => {
    render(<DashboardPage summaries={summaries} />);

    for (const name of ['核心戰情總覽', '視覺化對比', '跨產品明細 (時間)', '跨產品明細 (次數)', '多維度旭日圖', 'TTR 對比']) {
      expect(screen.getByRole('tab', { name })).toBeVisible();
    }
    expect(screen.getByRole('tablist')).toBeVisible();
  });

  it('shows complete analysis export on its own row', () => {
    render(<DashboardPage summaries={summaries} />);

    expect(screen.getByRole('region', { name: 'Master Summary 下載' })).toBeVisible();
    expect(screen.getByRole('region', { name: '完整分析結構匯出' })).toBeVisible();
    expect(screen.getByRole('button', { name: '📦 匯出所有分析結構' })).toBeVisible();
  });

  it('filters the real summary rows by Process', async () => {
    const user = userEvent.setup();
    render(<DashboardPage summaries={summaries} />);

    // 找到「製程」下拉的「全部」按鈕（getAllByRole 取第一個，即製程）
    const allButtons = screen.getAllByRole('button', { name: /全部/ });
    const processBtn = allButtons[0]; // 第一個下拉是製程
    await user.click(processBtn);
    await user.click(screen.getByRole('option', { name: 'F58' }));

    // EAG119 (F58) should still be rendered
    expect(screen.getAllByText(/EAG119/).length).toBeGreaterThan(0);
  });

  it('explains when no summary data is available', () => {
    render(<DashboardPage summaries={[]} />);

    expect(screen.getByText(/尚無 Master Summary 資料/i)).toBeVisible();
  });

  it('keeps Mapping input restricted to xlsx and explains the required columns', () => {
    render(<DashboardPage summaries={summaries} />);

    expect(screen.getByLabelText('Management Mapping 檔案')).toHaveAttribute('accept', '.xlsx');
    expect(screen.getByText(/Original_Item_Name.*Mode.*Operation/i)).toBeVisible();
  });

  it('shows Management Mapping template download link', () => {
    render(<DashboardPage summaries={summaries} />);

    const link = screen.getByRole('link', { name: '📥 下載 Management Mapping 範本' });
    expect(link).toHaveAttribute('href', './Management_Mapping.xlsx');
    expect(link).toHaveAttribute('download');
  });

  it('loads a valid Mapping workbook for dashboard classification', async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{
      Original_Item_Name: 'READ_ARRAY_(M)',
      Mode: 'User Mode',
      Operation: 'Read'
    }]), 'Mapping_Table');
    const file = new File([XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })], 'Management_Mapping.xlsx');

    render(<DashboardPage summaries={summaries} />);
    fireEvent.change(screen.getByLabelText('Management Mapping 檔案'), { target: { files: [file] } });

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('已套用 Mapping：1/2'));
    expect(screen.getByRole('tab', { name: '多維度旭日圖' })).toHaveAttribute('aria-selected', 'true');
  });
});
