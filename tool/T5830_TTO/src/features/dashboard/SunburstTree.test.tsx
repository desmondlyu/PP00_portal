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

it('starts collapsed and expands to Test_Item with the station TD_1 ratio', async () => {
  const user = userEvent.setup();
  const testRows = [{
    ...rows[0],
    Test_Item: 'PROGRAM',
    Test_Item_Station_Ratio: 42.5,
    touchdownStats: {
      TD_1: { avg: 1, max: 1, min: 1, range: 0, ratio: 42.5 },
      TD_2: { avg: 1, max: 1, min: 1, range: 0, ratio: 65 }
    }
  }];
  render(
    <SunburstTree
      title="EAG119"
      rows={testRows}
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

  await user.click(screen.getByRole('button', { name: /PROGRAM_\(M\).*Original_Item_Name/ }));
  expect(screen.getByRole('button', { name: /PROGRAM.*TD_2.*65\.00%/ })).toBeVisible();
});
