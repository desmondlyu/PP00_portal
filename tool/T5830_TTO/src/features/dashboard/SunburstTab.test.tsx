import { render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { SunburstTab } from './SunburstTab';

it('renders separate sunburst cards for each product and station', () => {
  render(
    <SunburstTab
      rows={[{
        Product: 'EAG119',
        Process: 'F58',
        Size: '512M',
        Voltage: '1.8',
        Original_Item_Name: 'READ_ARRAY_(M)',
        Test_Item_Merged: 'READ_ARRAY',
        Grand_Total_Time: 1,
        Grand_Total_Ratio: 100,
        Total_Merged_Count: 1,
        Station: 'S1P1',
        Station_Time: 1,
        Station_Count: 1
      }]}
      mapping={[{ Original_Item_Name: 'READ_ARRAY_(M)', Mode: 'User Mode', Operation: 'Read' }]}
    />
  );

  expect(screen.getByRole('heading', { name: /EAG119 · S1P1 \(1\.0s\)/ })).toBeVisible();
  expect(screen.getByRole('img', { name: /EAG119 · S1P1 旭日圖/ })).toBeVisible();
  const productCard = screen.getByRole('article', { name: 'EAG119 · S1P1 旭日圖與關聯樹' });
  expect(within(productCard).getByRole('img', { name: /EAG119 · S1P1 旭日圖/ })).toBeVisible();
  expect(within(productCard).getByRole('region', { name: 'EAG119 · S1P1 關聯樹' })).toBeVisible();
});
