import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { SunburstTree } from './SunburstTree';

const row = {
  Product: 'EAG119',
  Process: 'F58',
  Size: '512M',
  Voltage: '1.8',
  Test_Item_Merged: 'PROGRAM',
  Grand_Total_Time: 10,
  Grand_Total_Ratio: 100,
  Total_Merged_Count: 1,
  Station_Time: 10,
  Station_Count: 1
};

it('calculates Test_Item TD ratios from all product Site details', async () => {
  const user = userEvent.setup();
  render(
    <SunburstTree
      title="EAG119"
      rows={[
        {
          ...row,
          Station: 'S1P1',
          Test_Item: 'ITEM_A',
          Original_Item_Name: 'ITEM_A_(M)',
          touchdownStats: { TD_1: { avg: 9, max: 9, min: 9, range: 0, ratio: 90 } },
          touchdownSiteTimes: { TD_1: { Site_01: 9 } }
        },
        {
          ...row,
          Station: 'S1P1',
          Test_Item: 'ITEM_B',
          Original_Item_Name: 'ITEM_B_(M)',
          touchdownSiteTimes: { TD_1: { Site_01: 1 } }
        },
        {
          ...row,
          Station: 'S2P1',
          Test_Item: 'ITEM_A',
          Original_Item_Name: 'ITEM_A_(M)',
          touchdownSiteTimes: { TD_1: { Site_01: 1 } }
        },
        {
          ...row,
          Station: 'S2P1',
          Test_Item: 'ITEM_B',
          Original_Item_Name: 'ITEM_B_(M)',
          touchdownSiteTimes: { TD_1: { Site_01: 19 } }
        }
      ]}
      mapping={[
        { Original_Item_Name: 'ITEM_A_(M)', Mode: 'UM PGM', Operation: 'PGM' },
        { Original_Item_Name: 'ITEM_B_(M)', Mode: 'UM PGM', Operation: 'PGM' }
      ]}
    />
  );

  await user.click(screen.getByRole('button', { name: /UM PGM/ }));
  await user.click(screen.getByRole('button', { name: /PGM.*Operation/ }));
  await user.click(screen.getByRole('button', { name: /PROGRAM.*Test_Item_Merged/ }));
  await user.click(screen.getByRole('button', { name: /ITEM_A_\(M\).*Original_Item_Name/ }));

  expect(screen.getByRole('button', { name: /ITEM_A.*TD_1.*33\.33%/ })).toBeVisible();
});

it('does not show a product TD ratio when legacy Site detail is absent', async () => {
  const user = userEvent.setup();
  render(
    <SunburstTree
      title="EAG119"
      rows={[{
        ...row,
        Station: 'S1P1',
        Test_Item: 'LEGACY',
        Original_Item_Name: 'LEGACY_(M)',
        touchdownStats: { TD_1: { avg: 1, max: 1, min: 1, range: 0, ratio: 100 } }
      }]}
      mapping={[{ Original_Item_Name: 'LEGACY_(M)', Mode: 'UM PGM', Operation: 'PGM' }]}
    />
  );

  await user.click(screen.getByRole('button', { name: /UM PGM/ }));
  await user.click(screen.getByRole('button', { name: /PGM.*Operation/ }));
  await user.click(screen.getByRole('button', { name: /PROGRAM.*Test_Item_Merged/ }));
  await user.click(screen.getByRole('button', { name: /LEGACY_\(M\).*Original_Item_Name/ }));

  expect(screen.queryByRole('button', { name: /LEGACY.*TD_/ })).not.toBeInTheDocument();
});
