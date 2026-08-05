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

  it('extracts test number from the matching RAWDATA title header', () => {
    const rows = parseTestTimeText(
      'G:----:----,----:001:////////////////////////  227, JEDEC_ID ////////////////////////\n' +
      'G:----:----,----:001:<<< Test Time >>>, 227, JEDEC_ID, 0.023860 ,(S)\n',
      'EAG119_S0001.txt'
    );

    expect(rows[0]).toMatchObject({ testItem: 'JEDEC_ID', testNo: 227 });
  });

  it('does not infer test number without a matching title header', () => {
    const rows = parseTestTimeText(
      'G:----:----,----:001:<<< Test Time >>>, 227, JEDEC_ID, 0.023860 ,(S)\n',
      'EAG119_S0001.txt'
    );

    expect(rows[0]).toMatchObject({ testItem: 'JEDEC_ID' });
    expect(rows[0].testNo).toBeUndefined();
  });

  it('does not apply a title number when its item differs from the timing item', () => {
    const rows = parseTestTimeText(
      'G:----:----,----:001:////////////////////////  227, OTHER_ITEM ////////////////////////\n' +
      'G:----:----,----:001:<<< Test Time >>>, 227, JEDEC_ID, 0.023860 ,(S)\n',
      'EAG119_S0001.txt'
    );

    expect(rows[0]).toMatchObject({ testItem: 'JEDEC_ID' });
    expect(rows[0].testNo).toBeUndefined();
  });
});
