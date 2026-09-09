import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(
    new URL('../static/js/app.js', import.meta.url),
    'utf8',
);
const cssSource = readFileSync(
    new URL('../static/css/style.css', import.meta.url),
    'utf8',
);
const htmlSource = readFileSync(
    new URL('../index.html', import.meta.url),
    'utf8',
);

assert.match(appSource, /modal-appt-actions/);
assert.match(appSource, /editAppointment\(dateStr, testerName, appt\)/);
assert.match(
    appSource,
    /deleteAppointment\(dateStr, testerName, appt\.start, appt\.computer \|\| ''\)/,
);
assert.match(appSource, /appointment\.computer === computerName/);
assert.match(cssSource, /\.form-group select\s*\{[\s\S]*?color-scheme:\s*dark;/);
assert.match(
    cssSource,
    /\.form-group select option\s*\{[\s\S]*?background-color:/,
);
assert.match(cssSource, /\.modal-appt-actions/);
assert.match(cssSource, /\.modal-appt-action:disabled/);
assert.match(htmlSource, /style\.css\?v=20260909-2225/);
assert.match(htmlSource, /app\.js\?v=20260909-2225/);

console.log('JB Booking appointment modal contract passed.');
