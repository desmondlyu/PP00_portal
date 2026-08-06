const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('renders the operation guide directly in the page', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.match(html, /id="guide-content"[\s\S]*Rawdata 分析工具（使用者說明）/);
  assert.doesNotMatch(html, /載入操作說明中/);
});
