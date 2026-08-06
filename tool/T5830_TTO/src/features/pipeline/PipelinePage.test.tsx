import { act, fireEvent, render, screen } from '@testing-library/react';
import * as XLSX from 'xlsx';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PipelinePage } from './PipelinePage';

function productFile(product: string, name = 'raw.tar') {
  const file = new File(['x'], name);
  Object.defineProperty(file, 'webkitRelativePath', { value: `ROOT/${product}/${name}` });
  return file;
}

function productStationFile(product: string, station: string, suffix = '') {
  const file = new File(['x'], `RW_P_LOT${suffix}_05_${station}_20260101000000.tgz`);
  Object.defineProperty(file, 'webkitRelativePath', { value: `ROOT/${product}/${file.name}` });
  return file;
}

function analysisWorkbookFile(name: string, product: string, station: string) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{
    Product: product,
    Process: 'F58',
    Size: '512M',
    Voltage: '1.8',
    Original_Item_Name: 'READ_ARRAY_(M)',
    Test_Item_Merged: 'READ_ARRAY',
    Grand_Total_Time: 1.25,
    Grand_Total_Ratio: 100,
    Total_Merged_Count: 1,
    Station: station,
    Station_Time: 1.25,
    Station_Count: 1
  }]), 'Master_Summary');
  return new File([XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })], name);
}

async function confirmProducts(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: '確認選擇' }));
}

describe('PipelinePage', () => {
  it('rejects folders without tar files', async () => {
    render(<PipelinePage />);

    fireEvent.change(screen.getByLabelText('選擇產品資料夾（自動偵測產品名稱）'), {
      target: { files: [new File(['x'], 'raw.zip')] }
    });

    expect(screen.getByRole('alert')).toBeVisible();
  });

  it('shows cancelled after the active job is cancelled', async () => {
    const user = userEvent.setup();
    const worker = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    } as unknown as Worker;

    render(<PipelinePage workerFactory={() => worker} />);
    await user.upload(screen.getByLabelText('選擇產品資料夾（自動偵測產品名稱）'), productFile('EAG119'));
    await confirmProducts(user);
    await user.click(screen.getByRole('button', { name: '開始分析' }));
    await user.click(screen.getByRole('button', { name: '取消分析' }));

    expect(screen.getByText('已取消')).toBeVisible();
  });

  it('extracts any station label before the filename timestamp', async () => {
    const user = userEvent.setup();
    const worker = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    } as unknown as Worker;

    render(<PipelinePage workerFactory={() => worker} />);
    await user.upload(
      screen.getByLabelText('選擇產品資料夾（自動偵測產品名稱）'),
      productStationFile('EAG119', 'DS00')
    );
    await confirmProducts(user);
    await user.click(screen.getByRole('button', { name: '開始分析' }));

    expect(worker.postMessage).toHaveBeenCalledWith(expect.objectContaining({ stations: ['DS00'] }));
  });

  it('uses TD_1 only by default and explains the all-TD timeout risk', async () => {
    const user = userEvent.setup();
    const worker = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    } as unknown as Worker;

    render(<PipelinePage workerFactory={() => worker} />);
    await user.upload(screen.getByLabelText('選擇產品資料夾（自動偵測產品名稱）'), productFile('EAG119'));
    expect(screen.getByLabelText('分析所有TD')).not.toBeChecked();
    expect(screen.getByText('分析所有TD可能造成分析時間過長造成Timeout問題，預設只分析TD1')).toBeVisible();

    await confirmProducts(user);
    await user.click(screen.getByRole('button', { name: '開始分析' }));

    expect(worker.postMessage).toHaveBeenCalledWith(expect.objectContaining({ analyzeAllTouchdowns: false }));
  });

  it('sends the all-TD option when selected', async () => {
    const user = userEvent.setup();
    const worker = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    } as unknown as Worker;

    render(<PipelinePage workerFactory={() => worker} />);
    await user.upload(screen.getByLabelText('選擇產品資料夾（自動偵測產品名稱）'), productFile('EAG119'));
    await confirmProducts(user);
    await user.click(screen.getByLabelText('分析所有TD'));
    await user.click(screen.getByRole('button', { name: '開始分析' }));

    expect(worker.postMessage).toHaveBeenCalledWith(expect.objectContaining({ analyzeAllTouchdowns: true }));
  });

  it('returns the completed report to its parent', async () => {
    const user = userEvent.setup();
    const listeners: Record<string, (event: Event) => void> = {};
    const onComplete = vi.fn();
    const worker = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      addEventListener: vi.fn((type, listener) => { listeners[type] = listener; }),
      removeEventListener: vi.fn()
    } as unknown as Worker;

    render(<PipelinePage workerFactory={() => worker} onComplete={onComplete} />);
    await user.upload(screen.getByLabelText('選擇產品資料夾（自動偵測產品名稱）'), productFile('EAG119'));
    await confirmProducts(user);
    await user.click(screen.getByRole('button', { name: '開始分析' }));
    act(() => {
      listeners.message?.({
        data: {
          type: 'completed',
          jobId: 'job-1',
          report: { detail: [], merge: [], masterSummary: [] }
        }
      } as MessageEvent);
    });

    expect(onComplete).toHaveBeenCalledWith({ detail: [], merge: [], masterSummary: [] });
  });

  it('shows an error when the worker cannot be loaded', async () => {
    const user = userEvent.setup();
    const listeners: Record<string, (event: Event) => void> = {};
    const worker = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      addEventListener: vi.fn((type, listener) => { listeners[type] = listener; }),
      removeEventListener: vi.fn()
    } as unknown as Worker;

    render(<PipelinePage workerFactory={() => worker} />);
    await user.upload(screen.getByLabelText('選擇產品資料夾（自動偵測產品名稱）'), productFile('EAG119'));
    await confirmProducts(user);
    await user.click(screen.getByRole('button', { name: '開始分析' }));
    act(() => listeners.error?.(new ErrorEvent('error', { message: 'Failed to fetch' })));

    expect(screen.getByRole('alert')).toHaveTextContent('Failed to fetch');
    expect(screen.getByRole('button', { name: '開始分析' })).toBeEnabled();
  });

  it('loads an analyzed workbook and returns summaries', async () => {
    const onAnalysisLoaded = vi.fn();
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{
      Product: 'EAG119',
      Process: 'F58',
      Size: '512M',
      Voltage: '1.8',
      Original_Item_Name: 'READ_ARRAY_(M)',
      Test_Item_Merged: 'READ_ARRAY',
      Grand_Total_Time: 1.25,
      Grand_Total_Ratio: 100,
      Total_Merged_Count: 1,
      Station: 'S1P1',
      Station_Time: 1.25,
      Station_Count: 1
    }]), 'Master_Summary');
    const file = new File([
      XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
    ], 'T5830_Analysis_Structure.xlsx');

    render(<PipelinePage onAnalysisLoaded={onAnalysisLoaded} />);
    fireEvent.change(screen.getByLabelText('上傳已分析的資料'), { target: { files: [file] } });

    await vi.waitFor(() => expect(onAnalysisLoaded).toHaveBeenCalledTimes(1));
    expect(onAnalysisLoaded.mock.calls[0][0][0]).toMatchObject({
      Product: 'EAG119',
      Test_Item_Merged: 'READ_ARRAY'
    });
  });

  it('merges disjoint analyzed workbooks before loading the dashboard', async () => {
    const onAnalysisLoaded = vi.fn();
    render(<PipelinePage onAnalysisLoaded={onAnalysisLoaded} />);

    fireEvent.change(screen.getByLabelText('上傳已分析的資料'), {
      target: {
        files: [
          analysisWorkbookFile('EAG119_S1P1.xlsx', 'EAG119', 'S1P1'),
          analysisWorkbookFile('FAG103_S2P1.xlsx', 'FAG103', 'S2P1')
        ]
      }
    });

    await vi.waitFor(() => expect(onAnalysisLoaded).toHaveBeenCalledTimes(1));
    expect(onAnalysisLoaded.mock.calls[0][0]).toEqual(expect.arrayContaining([
      expect.objectContaining({ Product: 'EAG119', Station: 'S1P1' }),
      expect.objectContaining({ Product: 'FAG103', Station: 'S2P1' })
    ]));
  });

  it('blocks analyzed workbooks that share a product and station', async () => {
    const onAnalysisLoaded = vi.fn();
    render(<PipelinePage onAnalysisLoaded={onAnalysisLoaded} />);

    fireEvent.change(screen.getByLabelText('上傳已分析的資料'), {
      target: {
        files: [
          analysisWorkbookFile('first.xlsx', 'EAG119', 'S1P1'),
          analysisWorkbookFile('second.xlsx', 'EAG119', 'S1P1')
        ]
      }
    });

    const dialog = await screen.findByRole('dialog', { name: '分析結構重複' });
    expect(dialog).toHaveTextContent('EAG119');
    expect(dialog).toHaveTextContent('S1P1');
    expect(dialog).toHaveTextContent('first.xlsx');
    expect(dialog).toHaveTextContent('second.xlsx');
    expect(onAnalysisLoaded).not.toHaveBeenCalled();
  });

  it('blocks duplicate product and station when filenames match', async () => {
    const onAnalysisLoaded = vi.fn();
    render(<PipelinePage onAnalysisLoaded={onAnalysisLoaded} />);

    fireEvent.change(screen.getByLabelText('上傳已分析的資料'), {
      target: {
        files: [
          analysisWorkbookFile('analysis.xlsx', 'EAG119', 'S1P1'),
          analysisWorkbookFile('analysis.xlsx', 'EAG119', 'S1P1')
        ]
      }
    });

    await screen.findByRole('dialog', { name: '分析結構重複' });
    expect(onAnalysisLoaded).not.toHaveBeenCalled();
  });

  it('shows the active analysis step', async () => {
    const user = userEvent.setup();
    const listeners: Record<string, (event: Event) => void> = {};
    const worker = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      addEventListener: vi.fn((type, listener) => { listeners[type] = listener; }),
      removeEventListener: vi.fn()
    } as unknown as Worker;

    render(<PipelinePage workerFactory={() => worker} />);
    await user.upload(screen.getByLabelText('選擇產品資料夾（自動偵測產品名稱）'), productFile('EAG119'));
    await confirmProducts(user);
    await user.click(screen.getByRole('button', { name: '開始分析' }));
    act(() => listeners.message?.({
      data: { type: 'progress', jobId: 'job-1', phase: 'parsing', completed: 0, total: 1, fileName: 'raw.tar' }
    } as MessageEvent));

    expect(screen.getByText('.tgz 解壓成功')).toBeVisible();
    expect(screen.getByText('.tar 內容解析中')).toBeVisible();
    expect(screen.getByText('開始分析')).toBeVisible();
  });

  it('opens an all-selected product dialog and analyzes only confirmed products', async () => {
    const user = userEvent.setup();
    const worker = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    } as unknown as Worker;
    render(<PipelinePage workerFactory={() => worker} />);

    fireEvent.change(screen.getByLabelText('選擇產品資料夾（自動偵測產品名稱）'), {
      target: { files: [productFile('EAG119'), productFile('FAG103')] }
    });

    expect(screen.getByRole('dialog', { name: '選擇要分析的產品、站點' })).toBeVisible();
    expect(screen.getByLabelText('EAG119 · Unknown')).toBeChecked();
    expect(screen.getByLabelText('FAG103 · Unknown')).toBeChecked();

    await user.click(screen.getByLabelText('FAG103 · Unknown'));
    await user.click(screen.getByRole('button', { name: '確認選擇' }));
    await user.click(screen.getByRole('button', { name: '開始分析' }));

    expect(worker.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      products: ['EAG119']
    }));
  });

  it('parses product and station labels before opening the selection dialog', async () => {
    const user = userEvent.setup();
    render(<PipelinePage />);

    await user.upload(
      screen.getByLabelText('選擇產品資料夾（自動偵測產品名稱）'),
      productStationFile('FAG112', 'DS00')
    );

    const dialog = await screen.findByRole('dialog', { name: '選擇要分析的產品、站點' });
    expect(dialog).toBeVisible();
    expect(screen.getByLabelText('FAG112 · DS00')).toBeChecked();
    expect(screen.getByRole('button', { name: '確認選擇' })).toBeEnabled();
  });

  it('does not allow confirming an empty product selection', async () => {
    const user = userEvent.setup();
    render(<PipelinePage />);

    fireEvent.change(screen.getByLabelText('選擇產品資料夾（自動偵測產品名稱）'), {
      target: { files: [productFile('EAG119')] }
    });
    await user.click(screen.getByRole('button', { name: '全不選' }));

    expect(screen.getByRole('button', { name: '確認選擇' })).toBeDisabled();
  });

  it('resets the confirmed selection when a new folder is selected', async () => {
    const user = userEvent.setup();
    render(<PipelinePage />);
    const input = screen.getByLabelText('選擇產品資料夾（自動偵測產品名稱）');

    fireEvent.change(input, { target: { files: [productFile('EAG119')] } });
    await user.click(screen.getByRole('button', { name: '確認選擇' }));
    fireEvent.change(input, { target: { files: [productFile('FAG103')] } });

    expect(screen.getByRole('dialog', { name: '選擇要分析的產品、站點' })).toBeVisible();
    expect(screen.getByLabelText('FAG103 · Unknown')).toBeChecked();
    expect(screen.queryByLabelText('EAG119 · Unknown')).not.toBeInTheDocument();
  });

  it('reuses entered metadata for every station of an unknown product', async () => {
    const user = userEvent.setup();
    const worker = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    } as unknown as Worker;
    render(<PipelinePage workerFactory={() => worker} />);

    fireEvent.change(screen.getByLabelText('選擇產品資料夾（自動偵測產品名稱）'), {
      target: { files: [productStationFile('NEW123', 'S1P1'), productStationFile('NEW123', 'S2P1')] }
    });

    expect(screen.getByRole('button', { name: '確認選擇' })).toBeDisabled();
    await user.type(screen.getByLabelText('NEW123 · S1P1 Process'), 'F99');
    await user.type(screen.getByLabelText('NEW123 · S1P1 Size'), '1G');
    await user.type(screen.getByLabelText('NEW123 · S1P1 Voltage'), '1.8');

    expect(screen.getByLabelText('NEW123 · S2P1 Process')).toHaveValue('F99');
    expect(screen.getByLabelText('NEW123 · S2P1 Size')).toHaveValue('1G');
    expect(screen.getByLabelText('NEW123 · S2P1 Voltage')).toHaveValue('1.8');

    await confirmProducts(user);
    await user.click(screen.getByRole('button', { name: '開始分析' }));

    expect(worker.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      metadata: [
        { product: 'NEW123', process: 'F99', size: '1G', voltage: '1.8' },
        { product: 'NEW123', process: 'F99', size: '1G', voltage: '1.8' }
      ]
    }));
  });

  it('removes Product Database download and upload controls', () => {
    render(<PipelinePage />);

    expect(screen.queryByText('PRODUCT DATABASE')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /產品清單/ })).not.toBeInTheDocument();
  });

  it('contains product metadata columns in an opaque scrollable selection dialog', () => {
    render(<PipelinePage />);

    fireEvent.change(screen.getByLabelText('選擇產品資料夾（自動偵測產品名稱）'), {
      target: { files: [productStationFile('EAG119', 'S1P1')] }
    });

    const dialog = screen.getByRole('dialog', { name: '選擇要分析的產品、站點' });
    expect(dialog).toHaveClass('product-selection-dialog');
    expect(dialog.querySelector('table')?.parentElement).toHaveClass('product-selection-table-scroll');
  });

  it('selects complete Product and Station groups from a table', async () => {
    const user = userEvent.setup();
    const worker = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    } as unknown as Worker;
    render(<PipelinePage workerFactory={() => worker} />);

    fireEvent.change(screen.getByLabelText('選擇產品資料夾（自動偵測產品名稱）'), {
      target: { files: [
        productStationFile('FAG112', 'DS00'),
        productStationFile('FAG112', 'DS03', '1'),
        productStationFile('FAG112', 'DS03', '2')
      ] }
    });

    expect(screen.getByRole('dialog', { name: '選擇要分析的產品、站點' })).toBeVisible();
    expect(screen.getByRole('heading', { name: '請選擇要分析的產品、站點' })).toBeVisible();
    expect(screen.getAllByRole('columnheader')).toHaveLength(6);
    expect(screen.getByLabelText('FAG112 · DS00')).toBeChecked();
    expect(screen.getByLabelText('FAG112 · DS03')).toBeChecked();

    await user.click(screen.getByLabelText('FAG112 · DS03'));
    await confirmProducts(user);
    await user.click(screen.getByRole('button', { name: '開始分析' }));

    expect(worker.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      products: ['FAG112'],
      stations: ['DS00']
    }));
  });

  it('submits every archive from a selected Product and Station group', async () => {
    const user = userEvent.setup();
    const worker = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    } as unknown as Worker;
    render(<PipelinePage workerFactory={() => worker} />);

    fireEvent.change(screen.getByLabelText('選擇產品資料夾（自動偵測產品名稱）'), {
      target: { files: [
        productStationFile('FAG112', 'DS03', '1'),
        productStationFile('FAG112', 'DS03', '2')
      ] }
    });
    await confirmProducts(user);
    await user.click(screen.getByRole('button', { name: '開始分析' }));

    expect(worker.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      stations: ['DS03', 'DS03']
    }));
  });
});
