import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PipelinePage } from './PipelinePage';

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
    await user.upload(screen.getByLabelText('選擇產品資料夾（自動偵測產品名稱）'), new File(['x'], 'raw.tar'));
    await user.click(screen.getByRole('button', { name: '開始分析' }));
    await user.click(screen.getByRole('button', { name: '取消分析' }));

    expect(screen.getByText('已取消')).toBeVisible();
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
    await user.upload(screen.getByLabelText('選擇產品資料夾（自動偵測產品名稱）'), new File(['x'], 'raw.tar'));
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
    await user.upload(screen.getByLabelText('選擇產品資料夾（自動偵測產品名稱）'), new File(['x'], 'raw.tar'));
    await user.click(screen.getByRole('button', { name: '開始分析' }));
    act(() => listeners.error?.(new ErrorEvent('error', { message: 'Failed to fetch' })));

    expect(screen.getByRole('alert')).toHaveTextContent('Failed to fetch');
    expect(screen.getByRole('button', { name: '開始分析' })).toBeEnabled();
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
    await user.upload(screen.getByLabelText('選擇產品資料夾（自動偵測產品名稱）'), new File(['x'], 'raw.tar'));
    await user.click(screen.getByRole('button', { name: '開始分析' }));
    act(() => listeners.message?.({
      data: { type: 'progress', jobId: 'job-1', phase: 'parsing', completed: 0, total: 1, fileName: 'raw.tar' }
    } as MessageEvent));

    expect(screen.getByText('.tgz 解壓成功')).toBeVisible();
    expect(screen.getByText('.tar 內容解析中')).toBeVisible();
    expect(screen.getByText('開始分析')).toBeVisible();
  });
});
