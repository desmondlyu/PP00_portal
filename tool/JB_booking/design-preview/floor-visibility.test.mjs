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
    ';({createLayoutMetrics, getPrimaryFloorFrameBounds, createVisualGridMetrics, createStaticBlock, createFloorLayerMesh, createMachineMesh, applyVisualGrid, fitCameraToFloor})', { THREE });
const machines = slots.map(slot => ({ ...slot, width: size.w, height: size.h, model: slot.tester.startsWith('Ms') ? 'ms' : 't' }));
const scene = new THREE.Scene();
const metrics = api.createLayoutMetrics(blocks, machines);
const gridMetrics = api.createVisualGridMetrics(grid, api.getPrimaryFloorFrameBounds(blocks));
const staticGroups = blocks.map(block => api.createStaticBlock(scene, block, metrics));
for (const row of gridMetrics.rows.filter(row => row.type !== 'equipment-row')) scene.add(api.createFloorLayerMesh(row, gridMetrics));
const groups = machines.map(machine => api.createMachineMesh(machine, metrics));
scene.add(...groups);
api.applyVisualGrid(grid, gridMetrics, groups, staticGroups);

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
