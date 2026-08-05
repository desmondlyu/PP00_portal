import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { SunburstTree } from './SunburstTree';

const rows = [{
  Product: 'EAG119',
  Process: 'F58',
  Size: '512M',
  Voltage: '1.8',
  Original_Item_Name: 'PROGRAM_(M)',
  Test_Item_Merged: 'PROGRAM',
  Grand_Total_Time: 10,
  Grand_Total_Ratio: 100,
  Total_Merged_Count: 2,
  Station: 'S1P1',
  Station_Time: 10,
  Station_Count: 2
}];

it('starts collapsed and expands the four relationship levels', async () => {
  const user = userEvent.setup();
  render(
    <SunburstTree
      title="EAG119"
      rows={rows}
      mapping={[{ Original_Item_Name: 'PROGRAM_(M)', Mode: 'UM PGM', Operation: 'PGM' }]}
    />
  );

  expect(screen.getByRole('button', { name: /UM PGM/ })).toBeVisible();
  expect(screen.queryByRole('button', { name: /PGM.*Operation/ })).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /UM PGM/ }));
  expect(screen.getByRole('button', { name: /PGM.*Operation/ })).toBeVisible();

  await user.click(screen.getByRole('button', { name: /PGM.*Operation/ }));
  expect(screen.getByRole('button', { name: /PROGRAM.*Test_Item_Merged/ })).toBeVisible();

  await user.click(screen.getByRole('button', { name: /PROGRAM.*Test_Item_Merged/ }));
  expect(screen.getByRole('button', { name: /PROGRAM_\(M\).*Original_Item_Name/ })).toBeVisible();
  expect(screen.getAllByText(/100\.00%/).length).toBeGreaterThan(0);
});
