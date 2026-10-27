const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('taiex.json has valid structure and real market data', () => {
  const jsonPath = path.join(__dirname, '../static/data/taiex.json');
  assert.ok(fs.existsSync(jsonPath), 'taiex.json exists');

  const content = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  assert.equal(content.hasData, true);
  assert.equal(content.name, '發行量加權股價指數');
  assert.ok(Number.isFinite(content.value), 'value is a valid finite number');
  assert.ok(Number.isFinite(content.change), 'change is a valid finite number');
  assert.ok(Number.isFinite(content.percent), 'percent is a valid finite number');
  assert.ok([-1, 0, 1].includes(content.sign), 'sign must be -1, 0, or 1');
  assert.match(content.date, /^\d{4}\/\d{2}\/\d{2}$/, 'date format matches YYYY/MM/DD');
  assert.ok(content.source.includes('TWSE'), 'source mentions TWSE');
});

test('TAIEX MIS data calculation logic holds', () => {
  const sampleMisItem = {
    c: 't00',
    d: '20261027',
    t: '13:33:00',
    y: '46041.43',
    z: '46096.23',
    o: '46211.20',
    h: '46585.45',
    l: '45676.67',
  };

  const val = Number(sampleMisItem.z);
  const yClose = Number(sampleMisItem.y);
  const chg = Number((val - yClose).toFixed(2));
  const pct = Number(((chg / yClose) * 100).toFixed(2));

  assert.equal(val, 46096.23);
  assert.equal(yClose, 46041.43);
  assert.equal(chg, 54.80);
  assert.equal(pct, 0.12);
  assert.equal(chg > 0 ? 1 : chg < 0 ? -1 : 0, 1);
});
