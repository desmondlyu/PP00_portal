import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { SunburstTab } from './SunburstTab';

it('renders per-product sunburst with mode/operation arcs', () => {
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

  // 應顯示產品標題與 SVG 圖
  expect(screen.getByRole('heading', { name: /EAG119 \(1\.0s\)/ })).toBeVisible();
  expect(screen.getByRole('img', { name: /EAG119 旭日圖/ })).toBeVisible();
});
