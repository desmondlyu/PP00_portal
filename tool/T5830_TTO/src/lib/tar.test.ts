import { describe, expect, it } from 'vitest';
import { readRawdataTextMembers } from './tar';
import { makeTar } from '../test/makeTar';

describe('readRawdataTextMembers', () => {
  it('returns only rawdata text members and ignores traversal paths', async () => {
    const archive = makeTar([
      ['home/winbond/rawdata/log_S0001.txt', 'line 1'],
      ['home/winbond/rawdata/../../outside.txt', 'blocked'],
      ['home/winbond/rawdata/readme.csv', 'ignored']
    ]);

    await expect(readRawdataTextMembers(archive)).resolves.toEqual([
      { name: 'home/winbond/rawdata/log_S0001.txt', text: 'line 1' }
    ]);
  });

  it('rejects a truncated TAR member payload', async () => {
    const header = new Uint8Array(512);
    header.set(new TextEncoder().encode('home/winbond/rawdata/log.txt'));
    header.set(new TextEncoder().encode('1000\0'), 124);

    await expect(readRawdataTextMembers(new File([header], 'bad.tar')))
      .rejects.toThrow('TAR member payload exceeds archive boundary');
  });
});
