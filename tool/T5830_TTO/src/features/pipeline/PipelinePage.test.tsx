import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PipelinePage } from './PipelinePage';

describe('PipelinePage', () => {
  it('rejects folders without tar files', async () => {
    render(<PipelinePage />);

    fireEvent.change(screen.getByLabelText('選擇產品資料夾（自動偵測產品名稱）'), {
      target: { files: [new File(['x'], 'raw.tar.gz')] }
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
    let receiveMessage: ((event: MessageEvent) => void) | undefined;
    const onComplete = vi.fn();
    const worker = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      addEventListener: vi.fn((_type, listener) => { receiveMessage = listener; }),
      removeEventListener: vi.fn()
    } as unknown as Worker;

    render(<PipelinePage workerFactory={() => worker} onComplete={onComplete} />);
    await user.upload(screen.getByLabelText('選擇產品資料夾（自動偵測產品名稱）'), new File(['x'], 'raw.tar'));
    await user.click(screen.getByRole('button', { name: '開始分析' }));
    act(() => {
      receiveMessage?.({
        data: {
          type: 'completed',
          jobId: 'job-1',
          report: { detail: [], merge: [], masterSummary: [] }
        }
      } as MessageEvent);
    });

    expect(onComplete).toHaveBeenCalledWith({ detail: [], merge: [], masterSummary: [] });
  });
});
