import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');

test('prioritizes the latest release and provides an animated wafer hero', () => {
  assert.match(app, /const \[showChangelogHistory, setShowChangelogHistory\] = useState\(false\)/);
  assert.match(app, /const \[latestChangelog, \.\.\.changelogHistory\] = changelog/);
  assert.match(app, /className="bento-card col-5 hero-card"/);
  assert.match(app, /className="bento-card col-7 changelog-card"/);
  assert.match(app, /aria-expanded=\{showChangelogHistory\}/);
  assert.match(app, /className="wafer-visual"/);
  assert.match(app, /aria-hidden="true"/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.wafer-visual,\s*\.wafer-defect\s*\{\s*animation: none;/);
  assert.match(css, /\.col-5\s*\{\s*grid-column: span 5;\s*\}/);
  assert.match(css, /\.col-7\s*\{\s*grid-column: span 7;\s*\}/);
});
