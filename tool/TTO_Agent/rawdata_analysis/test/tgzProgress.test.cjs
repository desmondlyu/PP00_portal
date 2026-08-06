const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('shows T5830-style TGZ extraction phases', () => {
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');

  assert.match(html, /data-progress-phase="extracting"/);
  assert.match(html, /data-progress-phase="parsing"/);
  assert.match(html, /data-progress-phase="analyzing"/);
  assert.match(html, /id="progress-label"/);
  assert.match(app, /setTgzProgress\("extracting"/);
  assert.match(app, /setTgzProgress\("parsing"/);
  assert.match(app, /setTgzProgress\("completed"/);
});
