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
const cssSource = readFileSync(
    new URL('../static/css/style.css', import.meta.url),
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
    'createLayoutMetrics',
    'fitCameraToFloor',
    'CAMERA_PADDING',
    'projectSceneLayout',
    'createEquipmentMesh',
    'createUf3000Mesh',
    'createProbeSeatMesh',
    'createAutoHandlerMesh',
    'FRAME_INSET',
    'rowBaseline',
    'frameBounds',
    'Box3',
    'MeshStandardMaterial',
    'group.userData.tester',
    'group.userData.booked',
    'group.userData.model',
]) {
    assert.match(floorPlan3dSource, new RegExp(required.replace('.', '\\.')));
}
for (const required of [
    'UF3000',
    '點針座1',
    '點針座2',
    'setFromObject',
    'clamp',
]) {
    assert.match(floorPlan3dSource, new RegExp(required));
}
assert.doesNotMatch(floorPlan3dSource, /appointments|openAppointmentModal|supabase/i);
assert.doesNotMatch(floorPlan3dSource, /createUnifiedFrame|railMaterial|frameMaterial/);
assert.doesNotMatch(floorPlan3dSource, /createGround\(scene\);|new THREE\.GridHelper/);
assert.match(floorPlan3dSource, /createWalkwayAnchor/);
assert.match(floorPlan3dSource, /blockDef\.label === 'PC\/設備\/烤箱'[\s\S]{0,120}return null/);
assert.match(floorPlan3dSource, /blockDef\.label === 'Auto Hander'[\s\S]{0,120}createAutoHandlerMesh/);

assert.match(appSource, /appointments\[dateStr\]/);
assert.match(appSource, /dateAppointments\[slot\.tester\]/);
assert.match(appSource, /machineAppointments\.length > 0/);
assert.match(appSource, /openAppointmentModal\(slot\.tester, dateStr\)/);
assert.match(appSource, /FLOOR_PLAN_BLOCK_SIZE\.w/);
assert.match(appSource, /FLOOR_PLAN_BLOCK_SIZE\.h/);
assert.match(appSource, /onLayout/);
assert.doesNotMatch(
    appSource,
    /blockDef\.kind\s*===\s*['"]frame['"][\s\S]{0,120}visibility\s*=\s*['"]hidden['"]/,
);
assert.match(appSource, /blockDef\.label\s*!==\s*['"]PC\/設備\/烤箱['"]/);
assert.doesNotMatch(appSource, /staticBlockElements\.push\(null\)/);
assert.doesNotMatch(appSource, /animateFloorEngineer|engineer-running|tester-machine-reference/);
assert.match(cssSource, /\.floor-plan-3d-host/);
assert.match(cssSource, /\.floor-plan-3d-canvas/);
assert.match(cssSource, /\.floor-plan-label-layer/);
assert.match(
    cssSource,
    /\.floor-plan-stage[\s\S]{0,220}transform:\s*translateY\(8%\)\s*scaleY\(0\.98\)/,
);
assert.match(cssSource, /\.floor-plan-stage[\s\S]{0,260}transform-origin:\s*center top/);
assert.match(cssSource, /@media \(max-width: 768px\)/);
assert.match(floorPlan3dSource, /MS_MACHINE_COLOR/);
assert.match(floorPlan3dSource, /T_MACHINE_COLOR/);
assert.match(floorPlan3dSource, /LOWER_ZONE_START_Y/);
assert.match(floorPlan3dSource, /LOWER_ZONE_OFFSET_PERCENT/);
assert.match(floorPlan3dSource, /LOWER_ZONE_EXTRA_OFFSET_PERCENT/);
assert.match(floorPlan3dSource, /applyLowerZoneVisualOffset/);
assert.match(floorPlan3dSource, /MIDDLE_ZONE_START_Y/);
assert.match(floorPlan3dSource, /MIDDLE_ZONE_OFFSET_PERCENT/);
assert.match(floorPlan3dSource, /MS_TOP_PANEL_COLOR/);
assert.match(floorPlan3dSource, /MS_FRONT_PANEL_COLOR/);
assert.match(appSource, /LOWER_ZONE_OFFSET_PERCENT/);
assert.match(appSource, /MIDDLE_ZONE_OFFSET_PERCENT/);
assert.match(appSource, /LOWER_WALKWAY_OFFSET_PERCENT/);
assert.match(appSource, /isLowerFloorStaticBlock/);
assert.match(appSource, /pc-equipment-layer/);
assert.match(cssSource, /\.floor-static-block\.device\.pc-equipment-layer/);
assert.match(
    cssSource,
    /background:\s*repeating-linear-gradient\(\s*90deg,\s*rgba\(139,\s*198,\s*190,\s*0\.035\)\s*0\s*24px,\s*rgba\(173,\s*231,\s*219,\s*0\.065\)\s*24px\s*25px\)/,
);
assert.match(
    cssSource,
    /\.floor-static-block\.device\.pc-equipment-layer[\s\S]{0,300}border:\s*none[\s\S]{0,300}box-shadow:\s*none/,
);
assert.doesNotMatch(cssSource, /engineer-running|tester-machine-reference|floor-equipment-reference/);

console.log('Three.js presentation contract and 21-machine layout passed.');
