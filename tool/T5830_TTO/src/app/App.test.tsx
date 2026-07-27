import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

it('shows the local-only pipeline entry point', () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: /測試程式優化/i })).toBeVisible();
  expect(screen.getByText(/資料不會上傳/i)).toBeVisible();
});

it('opens the dashboard workspace', async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole('button', { name: 'Dashboard' }));

  expect(screen.getByRole('heading', { name: '全產品線測試時間戰情室' })).toBeVisible();
});
