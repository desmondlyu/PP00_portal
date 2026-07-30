import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');

test('prioritizes the latest release and provides an animated wafer hero', () => {
  assert.match(app, /changelog\.map\(\(item, idx\) =>/);
  assert.doesNotMatch(app, /showChangelogHistory|changelog-toggle/);
  assert.match(app, /className="bento-card col-5 hero-card"/);
  assert.match(app, /className="bento-card col-7 changelog-card"/);
  assert.match(app, /className="wafer-visual"/);
  assert.match(app, /aria-hidden="true"/);
  assert.equal((app.match(/<rect className="wafer-defect /g) ?? []).length, 10);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.wafer-visual,\s*\.wafer-defect\s*\{\s*animation: none;/);
  assert.match(css, /\.col-5\s*\{\s*grid-column: span 5;\s*\}/);
  assert.match(css, /\.col-7\s*\{\s*grid-column: span 7;\s*\}/);
  assert.match(css, /\.changelog-list\s*\{[^}]*overflow-y: auto;[^}]*max-height: 140px;/s);
  assert.match(css, /\.hero-title\s*\{[^}]*font-size: 1\.76rem;/s);
});
