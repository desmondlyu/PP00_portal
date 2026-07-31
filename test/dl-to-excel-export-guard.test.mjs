import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../tool/DL_to_Excel/index.html', import.meta.url), 'utf8');

test('supports selected-file export and split streaming for large files', () => {
  assert.match(html, /let selectedFileNames = new Set\(\)/);
  assert.match(html, /function getSelectedFiles\(\)/);
  assert.match(html, /function selectAllFiles\(select\)/);
  assert.match(html, /const selectedFiles = getSelectedFiles\(\);/);
  assert.match(html, /if \(selectedFiles\.length === 0\)/);
  assert.match(html, /async function exportSplitAsIndividualFiles\(selectedFiles, dataHeaders\)/);
  assert.match(html, /totalRows = await exportSplitAsIndividualFiles\(selectedFiles, dataHeaders\);/);
  assert.doesNotMatch(html, /new JSZip\(\)/);
  assert.doesNotMatch(html, /zip\.generateAsync/);
  assert.match(html, /function deriveSafeMergeFilename\(\)/);
  assert.match(html, /outputName = deriveSafeMergeFilename\(\);/);
  assert.match(html, /\.replace\(\/\[<>:"\/\\\\\|\?\*\\x00-\\x1F\]\/g, '_'\)/);
  assert.match(html, /Invalid array length/);
  assert.match(html, /分開儲存打包 \(Split\)/);
});
