const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('uses a full-width import settings panel without an example image', () => {
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'css', 'style.css'), 'utf8');

  assert.doesNotMatch(html, /import-hero-right|import-example-image/);
  assert.match(css, /\.import-hero-grid\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});
