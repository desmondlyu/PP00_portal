const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

vm.runInThisContext(fs.readFileSync(require.resolve('../js/tgzReader'), 'utf8'));
const { forEachTgzRawdataTextMember } = globalThis;

function makeTar(entries) {
  const encoder = new TextEncoder();
  const blocks = [];
  for (const [name, text] of entries) {
    const body = encoder.encode(text);
    const header = new Uint8Array(512);
    header.set(encoder.encode(name));
    header.set(encoder.encode(body.length.toString(8).padStart(11, '0') + '\0'), 124);
    blocks.push(header, body, new Uint8Array((512 - body.length % 512) % 512));
  }
  return new Blob([...blocks, new Uint8Array(1024)]);
}

async function gzip(blob) {
  return new Blob([await new Response(blob.stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer()]);
}

test('streams only rawdata TXT members from a TGZ archive', async () => {
  const archive = await gzip(makeTar([
    ['home/winbond/rawdata/site_S0001.txt', 'first'],
    ['home/winbond/rawdata/readme.csv', 'ignored'],
    ['home/winbond/rawdata/../../outside.txt', 'blocked']
  ]));
  const file = { name: 'RW_EAG119_LOT_01_S1_20260806130000.tgz', stream: () => archive.stream() };
  const members = [];

  await forEachTgzRawdataTextMember(file, (member) => members.push(member));

  assert.deepEqual(members, [{ name: 'site_S0001.txt', text: 'first' }]);
});
