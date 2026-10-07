import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../static/js/vendor/three.module.js';

const app = readFileSync(new URL('../static/js/app.js', import.meta.url), 'utf8');
const { slots, blocks, size, grid } = vm.runInNewContext(
    app.slice(0, app.indexOf('const LOCAL_CLIENT_ID_KEY')) +
    ';({ slots: FLOOR_PLAN_TESTER_SLOTS, blocks: FLOOR_PLAN_STATIC_BLOCKS, size: FLOOR_PLAN_BLOCK_SIZE, grid: FLOOR_PLAN_VISUAL_GRID })',
    { window: {} },
);
const source = readFileSync(new URL('../static/js/floor-plan-3d.js', import.meta.url), 'utf8');
const api = vm.runInNewContext(source.replace(/^import .*;\n/, '').replace('export function', 'function') +
    ';({createLabEnvironment, createLayoutMetrics, getPrimaryFloorFrameBounds, createVisualGridMetrics, createStaticBlock, createFloorLayerMesh, createMachineMesh, applyVisualGrid, fitCameraToFloor, projectSceneLayout})', { THREE, document: { createElement: () => ({ getContext: () => ({ clearRect() {}, fillText() {} }) }) } });
const machines = slots.map(slot => ({ ...slot, width: size.w, height: size.h, model: slot.tester.startsWith('Ms') ? 'ms' : 't' }));
const scene = new THREE.Scene();
const metrics = api.createLayoutMetrics(blocks, machines);
const gridMetrics = api.createVisualGridMetrics(grid, api.getPrimaryFloorFrameBounds(blocks));
const staticGroups = blocks.map(block => api.createStaticBlock(scene, block, metrics));
for (const row of gridMetrics.rows.filter(row => row.type !== 'equipment-row')) scene.add(api.createFloorLayerMesh(row, gridMetrics));
const groups = machines.map(machine => api.createMachineMesh(machine, metrics));
scene.add(...groups);
api.applyVisualGrid(grid, gridMetrics, groups, staticGroups);

const positionsBefore = [...groups, ...staticGroups.filter(Boolean)].map(g => g.position.toArray());
const environment = api.createLabEnvironment(blocks, gridMetrics);
scene.add(environment);
assert.deepEqual([...groups, ...staticGroups.filter(Boolean)].map(g => g.position.toArray()), positionsBefore);
const departments = [];
const markings = [];
environment.traverse(object => {
    if (object.userData.department) departments.push(object.userData.department);
    if (object.userData.floorText) markings.push(object.userData.floorText);
});
assert.deepEqual(departments.sort(), ['FAE', 'PP00', 'PQ00', 'PQ00']);
assert.ok(markings.includes('貨架') && markings.includes('4F出口 ↑'));
const floor = environment.userData.floorBounds;
for (const object of [...groups, ...staticGroups.filter(Boolean)]) {
    const b = new THREE.Box3().setFromObject(object);
    assert.ok(b.min.x >= floor.minX && b.max.x <= floor.maxX && b.min.z >= floor.minZ && b.max.z <= floor.maxZ,
        'every equipment footprint must be supported by the floor slab');
}

// Frame-only camera fitting used to clip the expanded bottom equipment row.
for (const [width, height] of [[1520, 760], [1000, 620], [900, 560], [760, 760]]) {
    const camera = new THREE.OrthographicCamera(-12, 12, 10, -10, 0.1, 100);
    camera.position.set(0, 18, 18);
    camera.lookAt(0, 0, 0);
    api.fitCameraToFloor(camera, { clientWidth: width, clientHeight: height }, blocks, scene);
    camera.updateMatrixWorld(true);
    for (const group of groups) {
        const bounds = new THREE.Box3().setFromObject(group);
        for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
            const p = new THREE.Vector3(x, y, z).project(camera);
            assert.ok(Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1 && Math.abs(p.z) <= 1,
                `${group.userData.tester} clipped at ${width}x${height}: ${p.toArray()}`);
        }
        const anchor = group.getWorldPosition(new THREE.Vector3()).project(camera);
        assert.ok(Math.abs(anchor.x) + size.w / 100 <= 1 && Math.abs(anchor.y) + size.h / 100 <= 1,
            `${group.userData.tester} label clipped at ${width}x${height}`);
    }
}
console.log('All 21 machines and label footprints fit at four viewport ratios.');

// Nameplates must sit above the model, inside the stage and away from every
// other equipment label. This catches fixed-percent labels and narrow layouts.
for (const width of [1280, 1470, 1920, 2560]) {
    const camera = new THREE.OrthographicCamera(-12, 12, 10, -10, 0.1, 100);
    camera.position.set(0, 18, 18);
    camera.lookAt(0, 0, 0);
    const canvas = { style: { aspectRatio: '1' } };
    const host = {
        clientWidth: width,
        get clientHeight() { return Math.round(width / Number(canvas.style.aspectRatio)); },
        parentElement: { parentElement: canvas },
    };
    api.fitCameraToFloor(camera, host, blocks, scene);
    camera.updateMatrixWorld(true);
    const height = host.clientHeight;
    const left = new THREE.Vector3(floor.minX, 0, 0).project(camera);
    const right = new THREE.Vector3(floor.maxX, 0, 0).project(camera);
    assert.ok((right.x - left.x) / 2 >= 0.97, 'floor should fill at least 97% of card width');
    const projected = api.projectSceneLayout(camera, host, groups, staticGroups, []);
    const objects = [...Object.values(projected.machines), ...projected.staticBlocks.filter(Boolean)];
    assert.equal(objects.length, 29);
    const cards = objects.map(p => {
        assert.ok(p.label, 'each model needs its own projected nameplate');
        const r = p.label;
        assert.ok(r.width >= 80 && r.height >= 60, 'readable complete labels');
        assert.ok(r.y >= 0 && r.x >= 0 && r.x + r.width <= width && r.y + r.height <= height, 'nameplate inside stage');
        assert.ok(r.y + r.height <= p.top - 8, 'nameplate above model with hover clearance');
        return r;
    });
    cards.forEach((a, i) => cards.slice(i + 1).forEach(b => {
        assert.ok(a.x + a.width + 8 <= b.x || b.x + b.width + 8 <= a.x ||
            a.y + a.height + 8 <= b.y || b.y + b.height + 8 <= a.y,
            `nameplates overlap at ${width}x${height}`);
    }));
}
console.log('All 29 nameplates are above models, separated and inside the stage.');
