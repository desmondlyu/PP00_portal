import { describe, expect, it } from 'vitest';
import { parseTestTimeText } from './testTimeParser';

describe('parseTestTimeText', () => {
  it('extracts site, touchdown, step, test item, sweep information and seconds', () => {
    const rows = parseTestTimeText(
      'X1 = 0x0000; X2 = 0x0001\n:001: <<< Test Time >>>, phase, READ_ARRAY, 0.1234\n',
      'EAG119_S0001.txt'
    );

    expect(rows).toEqual([{
      site: 'Site_01',
      touchdown: 'TD_1',
      step: 1,
      testItem: 'READ_ARRAY',
      sweepInfo: '0x0000~0x0001',
      timeSeconds: 0.1234
    }]);
  });

  it('hides sweep information for configured excluded test names', () => {
    const rows = parseTestTimeText(
      'X = 0x0000~0x0001\n:002: <<< Test Time >>>, phase, CAM_CHECK, 0.100\n',
      'EAG119_S0002.txt'
    );

    expect(rows[0]).toMatchObject({ site: 'Site_02', touchdown: 'TD_2', sweepInfo: 'None' });
  });
});
