import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const appSource = readFileSync(
    new URL('../static/js/app.js', import.meta.url),
    'utf8',
);
const layout = vm.runInNewContext(
    appSource.slice(0, appSource.indexOf('const LOCAL_CLIENT_ID_KEY')) +
    ';({ slots: FLOOR_PLAN_TESTER_SLOTS, size: FLOOR_PLAN_BLOCK_SIZE })',
    { window: {} },
);

assert.equal(layout.slots.length, 21);
assert.equal(new Set(layout.slots.map(({ tester }) => tester)).size, 21);
assert.equal(layout.size.w, 7.8);
assert.equal(layout.size.h, 7.2);

const floorPlan3dSource = readFileSync(
    new URL('../static/js/floor-plan-3d.js', import.meta.url),
    'utf8',
);
for (const required of [
    'OrthographicCamera',
    'WebGLRenderer',
    'BoxGeometry',
    'Raycaster',
    'destroy',
    'setHovered',
]) {
    assert.match(floorPlan3dSource, new RegExp(required));
}
for (const required of [
    'createMachineMesh',
    'createGround',
    'MeshStandardMaterial',
    'group.userData.tester',
    'group.userData.booked',
    'group.userData.model',
]) {
    assert.match(floorPlan3dSource, new RegExp(required.replace('.', '\\.')));
}
assert.doesNotMatch(floorPlan3dSource, /appointments|openAppointmentModal|supabase/i);

console.log('Three.js presentation contract and 21-machine layout passed.');
