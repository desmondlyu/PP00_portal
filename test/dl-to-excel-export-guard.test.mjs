import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../tool/DL_to_Excel/index.html', import.meta.url), 'utf8');

test('guards merged export filename and surfaces invalid string length hint', () => {
  assert.match(html, /function deriveSafeMergeFilename\(\)/);
  assert.match(html, /async function fallbackSplitExportAsFiles\(dataHeaders\)/);
  assert.match(html, /outputName = deriveSafeMergeFilename\(\);/);
  assert.match(html, /\.replace\(\/\[<>:"\/\\\\\|\?\*\\x00-\\x1F\]\/g, '_'\)/);
  assert.match(html, /if \(message\.includes\('Invalid string length'\) \|\| message\.includes\('Invalid array length'\)\)/);
  assert.match(html, /await fallbackSplitExportAsFiles\(dataHeaders\)/);
  assert.match(html, /Invalid string length/);
  assert.match(html, /Invalid array length/);
  assert.match(html, /分開儲存打包 \(Split\)/);
});
