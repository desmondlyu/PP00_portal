import * as THREE from './vendor/three.module.js';

const WORLD_WIDTH = 24;
const WORLD_DEPTH = 18;
const MACHINE_Y = 0.22;
const FRAME_INSET = 0.72;
const ROW_Y_TOLERANCE = 1.25;
const MAX_EQUIPMENT_HEIGHT = 1.62;
const MAX_MACHINE_HEIGHT = 1.58;
const CAMERA_PADDING = 1.1;
const T_MACHINE_COLOR = 0x36b9dd;
const MS_MACHINE_COLOR = 0x387fb3;
const T_BOOKED_COLOR = 0xf09a42;
const MS_BOOKED_COLOR = 0xb52de0;
const MS_TOP_PANEL_COLOR = 0xd4dedd;
const MS_FRONT_PANEL_COLOR = 0x314b68;
const GRID_LEFT = -11.3;
const GRID_RIGHT = 2.8;
const GRID_TOP = -6.65;
const GRID_COLUMN_GAP = 0.16;
const GRID_ROW_GAP = 0.12;
const GRID_ENVIRONMENT_ROW_GAP = 0.75;
const GRID_EQUIPMENT_ROW_DEPTH = 1.42;
const GRID_WALKWAY_DEPTH = 0.62;
const GRID_PC_DEPTH = 0.78;
const GRID_PIPELINE_DEPTH = 0.34;
const FLOOR_LAYER_DEPTH_SCALE = 2;
const GRID_VERTICAL_FILL_SCALE = 1.9;
const TOP_WALKWAY_Z_OFFSET = 1.15;

function percentToWorld(value, total) {
    return (value / 100) * total - total / 2;
}

function percentRangeToWorld(start, size, total) {
    return {
        min: percentToWorld(start, total),
        max: percentToWorld(start + size, total),
    };
}

function getFrameBounds(staticBlocks, inset = FRAME_INSET) {
    const frames = staticBlocks.filter(({ kind }) => kind === 'frame');
    const x = frames.map(({ x, w }) => percentRangeToWorld(x, w, WORLD_WIDTH));
    const z = frames.map(({ y, h }) => percentRangeToWorld(y, h, WORLD_DEPTH));
    return {
        minX: Math.min(...x.map(({ min, max }) => Math.min(min, max))) + inset,
        maxX: Math.max(...x.map(({ min, max }) => Math.max(min, max))) - inset,
        minZ: Math.min(...z.map(({ min, max }) => Math.min(min, max))) + inset,
        maxZ: Math.max(...z.map(({ min, max }) => Math.max(min, max))) - inset,
    };
}

function getPrimaryFloorFrameBounds(staticBlocks, inset = FRAME_INSET) {
    const primaryFrame = staticBlocks
        .filter(({ kind }) => kind === 'frame')
        .sort((a, b) => (b.w * b.h) - (a.w * a.h))[0];
    const x = percentRangeToWorld(
        primaryFrame.x,
        primaryFrame.w,
        WORLD_WIDTH,
    );
    const z = percentRangeToWorld(
        primaryFrame.y,
        primaryFrame.h,
        WORLD_DEPTH,
    );
    return {
        minX: Math.min(x.min, x.max) + inset,
        maxX: Math.max(x.min, x.max) - inset,
        minZ: Math.min(z.min, z.max) + inset,
        maxZ: Math.max(z.min, z.max) - inset,
    };
}

function groupMachineRows(machines) {
    return machines
        .slice()
        .sort((a, b) => a.y - b.y)
        .reduce((rows, machine) => {
            const row = rows.find(
                ({ y }) => Math.abs(y - machine.y) <= ROW_Y_TOLERANCE,
            );
            if (row) {
                row.machines.push(machine);
            } else {
                rows.push({ y: machine.y, machines: [machine] });
            }
            return rows;
        }, []);
}

function createLayoutMetrics(staticBlocks, machines) {
    const frameBounds = getFrameBounds(staticBlocks);
    const rows = groupMachineRows(machines);
    const machinePlacements = new Map();

    rows.forEach((row) => {
        const rowBottomPercent = Math.max(
            ...row.machines.map(({ y, height }) => y + height),
        );
        const rowBaseline = percentToWorld(rowBottomPercent, WORLD_DEPTH);
        row.machines.forEach((machine) => {
            machinePlacements.set(machine.tester, {
                x: percentToWorld(machine.x + machine.width / 2, WORLD_WIDTH),
                rowBaseline,
                rowKey: row.y,
            });
        });
    });

    return { frameBounds, rows, machinePlacements };
}

function createMaterial(color, options = {}) {
    return new THREE.MeshStandardMaterial({
        color,
        roughness: options.roughness ?? 0.62,
        metalness: options.metalness ?? 0.22,
        emissive: options.emissive ?? 0x000000,
        emissiveIntensity: options.emissiveIntensity ?? 0,
        transparent: options.transparent ?? false,
        opacity: options.opacity ?? 1,
    });
}

function getGridRowDepth(type) {
    if (type === 'walkway') {
        return GRID_WALKWAY_DEPTH;
    }
    if (type === 'pc-equipment') {
        return GRID_PC_DEPTH;
    }
    if (type === 'pipeline') {
        return GRID_PIPELINE_DEPTH;
    }
    return GRID_EQUIPMENT_ROW_DEPTH;
}

function createVisualGridMetrics(visualGrid, primaryFrameBounds) {
    if (visualGrid?.columns !== 7 || !Array.isArray(visualGrid.rows)) {
        throw new Error('Floor Plan visual grid must contain seven columns.');
    }
    const gridWidth = GRID_RIGHT - GRID_LEFT;
    const columnWidth = (
        gridWidth - GRID_COLUMN_GAP * (visualGrid.columns - 1)
    ) / visualGrid.columns;
    const columnCenters = Array.from(
        { length: visualGrid.columns },
        (_, index) =>
            GRID_LEFT + columnWidth / 2 +
            index * (columnWidth + GRID_COLUMN_GAP),
    );
    let cursor = GRID_TOP;
    const rawRows = visualGrid.rows.map((row, index) => {
        const depth = getGridRowDepth(row.type);
        const metric = {
            ...row,
            index,
            depth,
            centerZ: cursor + depth / 2,
        };
        cursor += depth + (
            row.type === 'equipment-row'
                ? GRID_ROW_GAP
                : GRID_ENVIRONMENT_ROW_GAP
        );
        return metric;
    });
    const rawGridMinZ = rawRows[0].centerZ - rawRows[0].depth / 2;
    const lastRow = rawRows.at(-1);
    const rawGridMaxZ = lastRow.centerZ + lastRow.depth / 2;
    const rawGridCenterZ = (rawGridMinZ + rawGridMaxZ) / 2;
    const frameCenterZ = (
        primaryFrameBounds.minZ + primaryFrameBounds.maxZ
    ) / 2;
    const rows = rawRows.map((row) => {
        const rawCenterZ = row.centerZ;
        const rowOffset = row.index === 0 ? TOP_WALKWAY_Z_OFFSET : 0;
        return {
            ...row,
            centerZ: frameCenterZ + (
                rawCenterZ - rawGridCenterZ
            ) * GRID_VERTICAL_FILL_SCALE + rowOffset,
        };
    });
    return { columnWidth, columnCenters, rows, width: gridWidth };
}

// Text is painted onto the floor, so it follows the camera and cannot intercept
// booking clicks. Local canvas textures avoid remote fonts or image assets.
function addFloorText(group, text, x, z, width, depth, color = '#476267', opacity = 0.28) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 192;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = '600 112px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = color;
    context.fillText(text, 512, 96, 980);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth),
        new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity, depthWrite: false }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.045, z);
    mesh.userData.floorText = text;
    group.add(mesh);
    return mesh;
}

function createFloorLayerMesh(rowMetric, gridMetrics) {
    const colors = { walkway: 0xbacdc8, 'pc-equipment': 0xa9b8bf, pipeline: 0x83979f };
    const visualDepth = rowMetric.depth * FLOOR_LAYER_DEPTH_SCALE;
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(gridMetrics.width, 0.035, visualDepth),
        createMaterial(colors[rowMetric.type], { roughness: 0.94, metalness: 0.02 }),
    );
    mesh.position.set((GRID_LEFT + GRID_RIGHT) / 2, 0.008, rowMetric.centerZ);
    mesh.receiveShadow = true;
    mesh.userData.gridRow = rowMetric.index;
    mesh.userData.gridColumn = null;
    mesh.userData.projectionKey = `layer-${rowMetric.index}`;
    mesh.userData.blockLabel = rowMetric.label;
    mesh.userData.kind = rowMetric.type;
    // Painted aisle margins, recessed service strips and solid work surfaces.
    for (const side of [-1, 1]) {
        addBox(mesh, [gridMetrics.width, 0.008, 0.035],
            [0, 0.023, side * (visualDepth / 2 - 0.06)],
            rowMetric.type === 'pipeline' ? 0x5a717e : 0xe7eeea);
    }
    if (rowMetric.type === 'pc-equipment') {
        for (let i = 0; i < 7; i++) {
            const x = gridMetrics.columnCenters[i] - mesh.position.x;
            addBox(mesh, [1.60, 0.09, 0.64], [x, 0.39, -0.28], 0xe1e5df);
            for (const side of [-1, 1]) addBox(mesh, [0.07, 0.35, 0.52], [x + side * 0.64, 0.19, -0.28], 0x74858a);
            if (i < 4) {
                addMonitor(mesh, x, 0.66, -0.39, 0.47);
                addBox(mesh, [0.40, 0.022, 0.14], [x, 0.455, -0.08], 0x495b63);
            } else {
                addBox(mesh, [0.68, 0.49, 0.53], [x, 0.69, -0.28], 0xcbd4d5);
                addBox(mesh, [0.49, 0.32, 0.02], [x - 0.04, 0.69, 0], 0x344a55);
                addBox(mesh, [0.035, 0.21, 0.035], [x + 0.13, 0.68, 0.025], 0xdfe6e7);
                addBox(mesh, [0.09, 0.045, 0.025], [x + 0.27, 0.82, 0.02], 0xd4a95c);
            }
        }
    }
    addFloorText(mesh, rowMetric.label, rowMetric.type === 'walkway' ? -gridMetrics.width / 2 + 1.05 : 0,
        rowMetric.type === 'pc-equipment' ? 0.50 : 0,
        rowMetric.type === 'pc-equipment' ? 3.4 : 1.45, 0.31, '#314c55', 0.78);
    return mesh;
}

// The old percentage frames describe room adjacency. Their vertical display
// extent follows the existing expanded equipment grid; no machine moves.
function createLabEnvironment(staticBlocks, gridMetrics) {
    const group = new THREE.Group();
    group.name = 'lab-environment';
    const frames = staticBlocks.filter(block => block.kind === 'frame');
    const primary = frames.slice().sort((a, b) => b.w * b.h - a.w * a.h)[0];
    const first = gridMetrics.rows[0];
    const last = gridMetrics.rows.at(-1);
    const minZ = first.centerZ - first.depth * FLOOR_LAYER_DEPTH_SCALE / 2 - 0.32;
    const maxZ = last.centerZ + last.depth / 2 + 0.50;
    const displayZ = percent => minZ + (percent - primary.y) / primary.h * (maxZ - minZ);
    const minX = percentToWorld(Math.min(...frames.map(f => f.x)), WORLD_WIDTH);
    const maxX = percentToWorld(Math.max(...frames.map(f => f.x + f.w)), WORLD_WIDTH);
    const backZ = displayZ(Math.min(...frames.map(f => f.y)));
    const frontZ = displayZ(Math.max(...frames.map(f => f.y + f.h)));
    const centerX = (minX + maxX) / 2;
    const centerZ = (backZ + frontZ) / 2;
    addBox(group, [maxX - minX, 0.22, frontZ - backZ], [centerX, -0.15, centerZ], 0x71838c, { roughness: 0.95, metalness: 0.02 });
    const roomColors = [0xd2d4c9, 0xc4d5ce, 0xc9d5d8, 0xd0d4e0, 0xd9d0be, 0xd0d4e0];
    frames.forEach((frame, index) => {
        const x1 = percentToWorld(frame.x, WORLD_WIDTH);
        const x2 = percentToWorld(frame.x + frame.w, WORLD_WIDTH);
        const z1 = displayZ(frame.y);
        const z2 = displayZ(frame.y + frame.h);
        addBox(group, [x2 - x1 - 0.035, 0.028, z2 - z1 - 0.035],
            [(x1 + x2) / 2, -0.02, (z1 + z2) / 2], roomColors[index],
            { roughness: 0.95, metalness: 0.02 });
        // Subtle expansion joints in solid flooring, not an outline-only grid.
        for (let z = z1 + 1.8; z < z2 - 0.2; z += 1.8) {
            addBox(group, [x2 - x1 - 0.08, 0.003, 0.012], [(x1 + x2) / 2, -0.003, z], 0xb6c3c6);
        }
        if (index >= 2) {
            const label = index === 2 ? 'PP00' : index === 4 ? 'FAE' : 'PQ00';
            const watermark = addFloorText(group, label, (x1 + x2) / 2,
                index === 2 ? gridMetrics.rows.findLast(row => row.type === 'walkway').centerZ : z1 + (z2 - z1) * 0.30,
                Math.min(x2 - x1 - 0.4, 5.0), 1.0);
            watermark.userData.department = label;
        }
    });
    // Low perimeter walls preserve visibility. The original top exit is open.
    const exit = staticBlocks.find(block => block.label === '4F出口');
    const exitX = percentToWorld(exit.x + exit.w / 2, WORLD_WIDTH);
    const opening = 2.1;
    for (const [left, right] of [[minX, exitX - opening / 2], [exitX + opening / 2, maxX]]) {
        addBox(group, [right - left, 0.34, 0.12], [(left + right) / 2, 0.14, backZ], 0xe5e9e6);
    }
    for (const x of [minX, maxX]) addBox(group, [0.12, 0.34, frontZ - backZ], [x, 0.14, centerZ], 0xe5e9e6);
    addBox(group, [maxX - minX, 0.12, 0.12], [centerX, 0.02, frontZ], 0xe5e9e6);
    // Department boundaries remain in their original left/right arrangement.
    const rightX = percentToWorld(frames[3].x, WORLD_WIDTH);
    const faeX = percentToWorld(frames[4].x, WORLD_WIDTH);
    const splitZ = displayZ(frames[5].y);
    addBox(group, [0.10, 0.16, frontZ - backZ], [rightX, 0.055, centerZ], 0xeff0eb);
    addBox(group, [0.10, 0.16, splitZ - backZ], [faeX, 0.055, (splitZ + backZ) / 2], 0xeff0eb);
    addBox(group, [maxX - rightX, 0.16, 0.10], [(maxX + rightX) / 2, 0.055, splitZ], 0xeff0eb);
    // Illustrative shelving inside the original top-left storage bay.
    const shelfFrame = frames[0];
    const shelfX1 = percentToWorld(shelfFrame.x, WORLD_WIDTH);
    const shelfX2 = percentToWorld(shelfFrame.x + shelfFrame.w, WORLD_WIDTH);
    const shelfZ = (displayZ(shelfFrame.y) + displayZ(shelfFrame.y + shelfFrame.h)) / 2;
    for (let i = 0; i < 4; i++) {
        const x = shelfX1 + 1.0 + i * (shelfX2 - shelfX1 - 2.0) / 3;
        for (const side of [-1, 1]) addBox(group, [0.06, 0.74, 0.64], [x + side * 0.69, 0.35, shelfZ], 0x546c79);
        for (const y of [0.12, 0.43, 0.74]) addBox(group, [1.42, 0.035, 0.65], [x, y, shelfZ], 0x97a9aa);
        addBox(group, [0.47, 0.23, 0.43], [x - 0.3, 0.56, shelfZ], 0xb7a987);
        addBox(group, [0.43, 0.20, 0.43], [x + 0.28, 0.545, shelfZ], 0x819fa8);
    }
    addFloorText(group, '貨架', (shelfX1 + shelfX2) / 2, shelfZ + 0.70, 1.4, 0.35, '#415c64', 0.85);
    addBox(group, [opening, 0.026, 1.0], [exitX, 0.005, backZ + 0.56], 0x527f73);
    addFloorText(group, '4F出口 ↑', exitX, backZ + 0.56, 1.9, 0.48, '#ffffff', 1);
    group.userData.floorBounds = { minX, maxX, minZ: backZ, maxZ: frontZ };
    return group;
}

function mapEquipmentGroups(staticBlockGroups) {
    const equipmentGroups = staticBlockGroups.filter(Boolean);
    const uf3000 = equipmentGroups.filter(
        (group) => group.userData.blockLabel === 'UF3000',
    );
    return new Map([
        ['UF3000@row1', uf3000[0]],
        ['UF3000@row2', uf3000[1]],
        ['UF3000@row3', uf3000[2]],
        ['UF3000@row4-left', uf3000[3]],
        ['UF3000@row4-right', uf3000[4]],
        [
            '點針座1',
            equipmentGroups.find(
                (group) => group.userData.blockLabel === '點針座1',
            ),
        ],
        [
            '點針座2',
            equipmentGroups.find(
                (group) => group.userData.blockLabel === '點針座2',
            ),
        ],
        [
            'Auto Hander',
            equipmentGroups.find(
                (group) => group.userData.blockLabel === 'Auto Hander',
            ),
        ],
    ]);
}

function applyVisualGrid(
    visualGrid,
    gridMetrics,
    machineGroups,
    staticBlockGroups,
) {
    const machineByTester = new Map(
        machineGroups.map((group) => [group.userData.tester, group]),
    );
    const equipmentByKey = mapEquipmentGroups(staticBlockGroups);

    visualGrid.rows.forEach((row, rowIndex) => {
        if (row.type !== 'equipment-row') {
            return;
        }
        row.cells.forEach((cell, columnIndex) => {
            if (!cell) {
                return;
            }
            const group = machineByTester.get(cell) || equipmentByKey.get(cell);
            if (!group) {
                throw new Error(`Missing Floor Plan visual object: ${cell}`);
            }
            group.position.x = gridMetrics.columnCenters[columnIndex];
            group.position.z = gridMetrics.rows[rowIndex].centerZ;
            group.userData.gridRow = rowIndex;
            group.userData.gridColumn = columnIndex;
            group.userData.projectionKey = cell;
        });
    });
}

function fitCameraToFloor(camera, host, staticBlocks, scene) {
    const floorBounds = getFrameBounds(staticBlocks, 0);
    // Include the final visual-grid positions, which can extend beyond the frame.
    const sceneBounds = new THREE.Box3().setFromObject(scene);
    floorBounds.minX = Math.min(floorBounds.minX, sceneBounds.min.x);
    floorBounds.maxX = Math.max(floorBounds.maxX, sceneBounds.max.x);
    floorBounds.minZ = Math.min(floorBounds.minZ, sceneBounds.min.z);
    floorBounds.maxZ = Math.max(floorBounds.maxZ, sceneBounds.max.z);
    const minY = Math.min(-0.2, sceneBounds.min.y);
    const maxY = Math.max(MAX_EQUIPMENT_HEIGHT + MACHINE_Y, sceneBounds.max.y);
    camera.updateMatrixWorld(true);

    const points = [
        [floorBounds.minX, minY, floorBounds.minZ],
        [floorBounds.minX, minY, floorBounds.maxZ],
        [floorBounds.maxX, minY, floorBounds.minZ],
        [floorBounds.maxX, minY, floorBounds.maxZ],
        [floorBounds.minX, maxY, floorBounds.minZ],
        [floorBounds.minX, maxY, floorBounds.maxZ],
        [floorBounds.maxX, maxY, floorBounds.minZ],
        [floorBounds.maxX, maxY, floorBounds.maxZ],
    ].map(([x, y, z]) =>
        new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse),
    );
    const minX = Math.min(...points.map(({ x }) => x));
    const maxX = Math.max(...points.map(({ x }) => x));
    const minScreenY = Math.min(...points.map(({ y }) => y));
    const maxScreenY = Math.max(...points.map(({ y }) => y));
    const aspect = Math.max(0.1, host.clientWidth / host.clientHeight);
    const requiredHeight = Math.max(
        (maxScreenY - minScreenY) * CAMERA_PADDING,
        ((maxX - minX) * CAMERA_PADDING) / aspect,
    );
    const requiredWidth = requiredHeight * aspect;
    const centerX = (minX + maxX) / 2;
    const centerY = (minScreenY + maxScreenY) / 2;
    camera.left = centerX - requiredWidth / 2;
    camera.right = centerX + requiredWidth / 2;
    camera.top = centerY + requiredHeight / 2;
    camera.bottom = centerY - requiredHeight / 2;
    camera.updateProjectionMatrix();
}

function getGroupDepth(group) {
    group.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(group);
    return bounds.max.z - bounds.min.z;
}

function clampGroupToBounds(group, frameBounds) {
    group.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(group);
    const width = bounds.max.x - bounds.min.x;
    const depth = bounds.max.z - bounds.min.z;
    const availableWidth = frameBounds.maxX - frameBounds.minX;
    const availableDepth = frameBounds.maxZ - frameBounds.minZ;
    const footprintScale = Math.min(
        1,
        availableWidth / Math.max(width, 0.001),
        availableDepth / Math.max(depth, 0.001),
    );

    if (footprintScale < 1) {
        group.scale.multiplyScalar(footprintScale);
        group.updateMatrixWorld(true);
    }

    const finalBounds = new THREE.Box3().setFromObject(group);
    group.position.x += Math.max(
        frameBounds.minX - finalBounds.min.x,
        Math.min(0, frameBounds.maxX - finalBounds.max.x),
    );
    group.position.z += Math.max(
        frameBounds.minZ - finalBounds.min.z,
        Math.min(0, frameBounds.maxZ - finalBounds.max.z),
    );
    group.userData.frameBounds = frameBounds;
}

function positionEquipmentOnBlock(group, blockDef) {
    const depth = getGroupDepth(group);
    const blockBottomZ = percentToWorld(blockDef.y + blockDef.h, WORLD_DEPTH);
    group.position.set(
        percentToWorld(blockDef.x + blockDef.w / 2, WORLD_WIDTH),
        0,
        blockBottomZ - depth / 2,
    );
}

function createEquipmentMaterial(color, options = {}) {
    return createMaterial(color, {
        roughness: options.roughness ?? 0.52,
        metalness: options.metalness ?? 0.36,
        emissive: options.emissive ?? 0x000000,
        emissiveIntensity: options.emissiveIntensity ?? 0.12,
    });
}

// Lightweight, locally built silhouettes informed by the references in
// design-preview/EQUIPMENT_VISUAL_REFERENCES.md. No remote model/texture loads.
function addBox(group, size, position, color, options = {}) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), createEquipmentMaterial(color, options));
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
}

function addCylinder(group, radius, height, position, color, options = {}) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 24), createEquipmentMaterial(color, options));
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
}

function addMonitor(group, x, y, z, width = 0.36) {
    addBox(group, [0.045, 0.24, 0.045], [x, y - 0.16, z], 0x657887);
    addBox(group, [width, width * 0.66, 0.055], [x, y, z], 0x192c3a);
    addBox(group, [width * 0.83, width * 0.48, 0.01], [x, y, z + 0.034], 0x67c7db,
        { emissive: 0x2485a0, emissiveIntensity: 0.32 });
    addBox(group, [width * 0.64, 0.015, 0.014], [x, y - 0.03, z + 0.042], 0xc3eff4);
}

function addWafer(group, x, y, z, radius) {
    addCylinder(group, radius + 0.04, 0.065, [x, y, z], 0x879bad, { metalness: 0.7 });
    addCylinder(group, radius, 0.012, [x, y + 0.04, z], 0x576b99, { metalness: 0.5, roughness: 0.26 });
    for (let i = -2; i <= 2; i++) {
        const offset = i * radius / 3;
        const length = 2 * Math.sqrt(radius * radius - offset * offset) * 0.93;
        addBox(group, [length, 0.006, 0.008], [x, y + 0.05, z + offset], 0x9cb8d9);
        addBox(group, [0.008, 0.006, length], [x + offset, y + 0.05, z], 0x9cb8d9);
    }
}

function addVent(group, x, y, z, width, height) {
    addBox(group, [width, height, 0.016], [x, y, z], 0x293744);
    for (let i = 0; i < 6; i++) {
        addBox(group, [width * 0.94, 0.015, 0.024], [x, y - height / 2 + (i + 0.5) * height / 6, z + 0.015], 0x92a3af);
    }
}

function finishEquipment(group, blockDef, metrics) {
    group.rotation.y = -0.22;
    group.userData.equipment = blockDef.label;
    group.userData.blockLabel = blockDef.label;
    group.userData.frameBounds = metrics.frameBounds;
    return group;
}

function createUf3000Mesh(blockDef, metrics) {
    const group = new THREE.Group();
    addBox(group, [1.38, 0.12, 0.92], [0, 0.18, 0], 0x273b52);
    addBox(group, [1.34, 0.63, 0.88], [0, 0.55, 0], 0xd9e3e9);
    addBox(group, [1.35, 0.09, 0.89], [0, 0.37, 0], 0x2379b7);
    addBox(group, [0.81, 0.20, 0.82], [-0.25, 0.96, 0], 0xeef1ef);
    addWafer(group, -0.25, 1.08, -0.03, 0.25);
    // Raised cassette / loading bay, with a dark opening and visible shelves.
    addBox(group, [0.43, 0.62, 0.80], [0.44, 1.0, 0], 0xe6edee);
    addBox(group, [0.31, 0.38, 0.025], [0.44, 1.03, 0.408], 0x203446);
    for (let i = 0; i < 4; i++) addBox(group, [0.26, 0.02, 0.045], [0.44, 0.89 + i * 0.08, 0.43], 0x9cb2c0);
    addMonitor(group, -0.52, 1.31, 0.12, 0.30);
    addBox(group, [0.065, 0.065, 0.028], [0.15, 0.95, 0.43], 0xda614c);
    addBox(group, [0.04, 0.13, 0.04], [0.55, 1.37, -0.28], 0x55c69c);
    return finishEquipment(group, blockDef, metrics);
}

function createProbeSeatMesh(blockDef, metrics) {
    const group = new THREE.Group();
    addBox(group, [1.25, 0.18, 0.94], [0, 0.24, 0], 0x384752);
    addBox(group, [1.15, 0.12, 0.85], [0, 0.39, 0], 0xbbc9d2);
    addWafer(group, 0, 0.50, 0.12, 0.28);
    for (const side of [-1, 1]) {
        addBox(group, [0.24, 0.17, 0.26], [side * 0.42, 0.54, 0.13], 0x626e85);
        addBox(group, [0.27, 0.025, 0.028], [side * 0.26, 0.64, 0.1], 0xe0bd70);
        const knob = addCylinder(group, 0.07, 0.08, [side * 0.56, 0.54, 0.15], 0x293745);
        knob.rotation.z = Math.PI / 2;
        addBox(group, [0.07, 0.69, 0.07], [side * 0.40, 0.85, -0.31], 0x7d93a3);
    }
    addBox(group, [0.91, 0.10, 0.12], [0, 1.21, -0.31], 0xd8e0e3);
    addBox(group, [0.20, 0.14, 0.45], [0, 1.23, -0.12], 0xe9edeb);
    addCylinder(group, 0.105, 0.26, [0, 1.08, 0.08], 0xc8d4da);
    addCylinder(group, 0.065, 0.12, [0, 0.91, 0.08], 0x293d50);
    for (const x of [-0.07, 0.07]) {
        const eyepiece = addCylinder(group, 0.047, 0.19, [x, 1.36, 0.05], 0x263949);
        eyepiece.rotation.x = Math.PI / 4;
    }
    return finishEquipment(group, blockDef, metrics);
}

function createAutoHandlerMesh(blockDef, metrics) {
    const group = new THREE.Group();
    addBox(group, [1.10, 0.16, 0.87], [0, 0.21, 0], 0x304352);
    addCylinder(group, 0.23, 0.26, [-0.25, 0.42, 0], 0xc5d2d8);
    const joints = [[-0.25, 0.60, 0], [-0.38, 1.15, 0], [0.25, 1.25, 0.06]];
    for (let i = 0; i < 2; i++) {
        const start = new THREE.Vector3(...joints[i]);
        const end = new THREE.Vector3(...joints[i + 1]);
        const arm = addBox(group, [0.17, start.distanceTo(end), 0.18], start.clone().add(end).multiplyScalar(0.5).toArray(), 0xe3e9e6);
        arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
    }
    for (const point of joints) {
        const joint = addCylinder(group, 0.12, 0.22, point, 0xe3a349);
        joint.rotation.x = Math.PI / 2;
    }
    addCylinder(group, 0.075, 0.18, [0.27, 1.09, 0.06], 0x8094a4);
    addBox(group, [0.23, 0.055, 0.12], [0.30, 0.98, 0.07], 0xb9cbd5);
    for (const x of [0.23, 0.38]) addBox(group, [0.04, 0.12, 0.055], [x, 0.91, 0.07], 0x283d4e);
    return finishEquipment(group, blockDef, metrics);
}

function createGenericEquipmentMesh(blockDef, metrics) {
    const width = Math.max(0.72, (blockDef.w / 100) * WORLD_WIDTH * 0.68);
    const depth = Math.max(0.58, (blockDef.h / 100) * WORLD_DEPTH * 0.58);
    const height = Math.min(0.55, MAX_EQUIPMENT_HEIGHT);
    const group = new THREE.Group();
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, depth),
        createEquipmentMaterial(0x35546b),
    );
    body.position.y = height / 2 + MACHINE_Y;
    group.add(body);
    group.userData.equipment = 'generic';
    group.userData.blockLabel = blockDef.label;
    group.userData.frameBounds = metrics.frameBounds;
    return group;
}

function createEquipmentMesh(blockDef, metrics) {
    const group = blockDef.label === 'UF3000'
        ? createUf3000Mesh(blockDef, metrics)
        : blockDef.label === '點針座1' || blockDef.label === '點針座2'
            ? createProbeSeatMesh(blockDef, metrics)
            : blockDef.label === 'Auto Hander'
                ? createAutoHandlerMesh(blockDef, metrics)
            : createGenericEquipmentMesh(blockDef, metrics);
    positionEquipmentOnBlock(group, blockDef);
    clampGroupToBounds(group, metrics.frameBounds);
    group.traverse((child) => {
        child.castShadow = true;
        child.receiveShadow = true;
    });
    return group;
}

function createStaticBlock(scene, blockDef, metrics) {
    const kind = blockDef.kind || 'machine';
    if (!['frame', 'walkway', 'device'].includes(kind)) {
        return;
    }
    if (
        kind === 'frame' ||
        kind === 'walkway' ||
        blockDef.label === 'PC/設備/烤箱'
    ) {
        return null;
    }
    if (kind === 'device') {
        const equipment = createEquipmentMesh(blockDef, metrics);
        scene.add(equipment);
        return equipment;
    }

    const width = Math.max(0.4, (blockDef.w / 100) * WORLD_WIDTH);
    const depth = Math.max(0.4, (blockDef.h / 100) * WORLD_DEPTH);
    const height = kind === 'walkway' ? 0.04 : kind === 'frame' ? 0.08 : 0.24;
    const color = kind === 'walkway' ? 0x244552 : kind === 'frame' ? 0x183047 : 0x35546b;
    const material = createMaterial(color, {
        roughness: 0.84,
        metalness: 0.12,
        transparent: true,
        opacity: kind === 'frame' ? 0.46 : 0.7,
    });
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, depth),
        material,
    );
    mesh.position.set(
        percentToWorld(blockDef.x + blockDef.w / 2, WORLD_WIDTH),
        height / 2 - 0.06,
        percentToWorld(blockDef.y + blockDef.h / 2, WORLD_DEPTH),
    );
    mesh.receiveShadow = true;
    scene.add(mesh);
}

function createMachineMesh(machine, metrics) {
    const isMs = machine.model === 'ms';
    const width = isMs ? 1.32 : 1.18;
    const depth = isMs ? 0.86 : 1.02;
    const color = machine.booked
        ? (isMs ? MS_BOOKED_COLOR : T_BOOKED_COLOR)
        : (isMs ? MS_MACHINE_COLOR : T_MACHINE_COLOR);
    const group = new THREE.Group();
    addBox(group, [width, 0.12, depth], [0, 0.18, 0], 0x233749);
    const body = addBox(group, [width * 0.94, isMs ? 1.00 : 0.70, depth * 0.91],
        [0, isMs ? 0.74 : 0.59, 0], isMs ? 0xd4dfde : 0xb7c4cd,
        { roughness: 0.52, metalness: 0.22 });
    const accent = addBox(group, [width * 0.96, 0.10, depth * 0.94],
        [0, isMs ? 1.12 : 0.88, 0], color, { emissive: color, emissiveIntensity: 0.08 });
    if (isMs) {
        // MOSAID MS34xx: off-white cabinet, blue fascia, twin ventilation banks.
        addVent(group, 0, 0.53, depth * 0.46, width * 0.76, 0.27);
        addVent(group, 0, 0.88, depth * 0.46, width * 0.76, 0.24);
        addBox(group, [0.85, 0.05, 0.62], [0, 1.265, 0], MS_TOP_PANEL_COLOR);
        addBox(group, [0.46, 0.03, 0.30], [0, 1.31, 0.06], MS_FRONT_PANEL_COLOR);
        for (const x of [-0.13, 0.13]) for (const z of [-0.025, 0.145]) {
            addBox(group, [0.17, 0.025, 0.11], [x, 1.335, z], 0x39465d);
        }
        addBox(group, [0.28, 0.13, 0.025], [-0.31, 1.14, depth * 0.49], 0x193955);
        for (let i = 0; i < 3; i++) addBox(group, [0.04, 0.04, 0.025], [0.17 + i * 0.09, 1.14, depth * 0.49], i === 2 ? 0xd66351 : 0x68b8aa);
    } else {
        // Advantest engineering-station silhouette: low test head + rear cabinet.
        addBox(group, [0.43, 1.27, 0.32], [0.30, 0.93, -0.30], 0xe0e6e8);
        addBox(group, [0.33, 1.12, 0.012], [0.30, 0.94, -0.13], 0xc5d1d7);
        addBox(group, [0.80, 0.16, 0.67], [-0.15, 1.02, 0.12], 0xdce5e7);
        addCylinder(group, 0.24, 0.08, [-0.15, 1.15, 0.12], 0x7e97a8);
        addCylinder(group, 0.17, 0.015, [-0.15, 1.20, 0.12], 0x21364a);
        addVent(group, -0.10, 0.52, depth * 0.46, 0.71, 0.24);
        addMonitor(group, -0.42, 1.43, -0.20, 0.30);
        addBox(group, [0.045, 0.17, 0.025], [0.43, 1.30, -0.12], 0xe4bd65);
        addBox(group, [0.06, 0.06, 0.025], [0.43, 1.37, -0.10], 0xc45248);
    }
    // Feet and a restrained state stripe retain the existing booked distinction.
    for (const x of [-width * 0.36, width * 0.36]) {
        addBox(group, [0.13, 0.12, 0.14], [x, 0.10, depth * 0.32], 0x172a38);
    }
    group.rotation.y = -0.22;
    const placement = metrics.machinePlacements.get(machine.tester);
    group.position.set(placement.x, 0, placement.rowBaseline - (isMs ? 0.9 : 0.78) / 2);
    group.userData.tester = machine.tester;
    group.userData.booked = machine.booked;
    group.userData.model = machine.model;
    group.userData.rowBaseline = placement.rowBaseline;
    group.userData.rowKey = placement.rowKey;
    group.userData.baseY = group.position.y;
    group.userData.baseScale = new THREE.Vector3(1, 1, 1);
    group.userData.body = body;
    group.userData.accent = accent;
    clampGroupToBounds(group, metrics.frameBounds);
    return group;
}

function setMeshHovered(group, hovered) {
    if (!group) {
        return;
    }
    group.position.y = group.userData.baseY + (hovered ? 0.06 : 0);
    group.scale.copy(group.userData.baseScale).multiplyScalar(hovered ? 1.015 : 1);
    const bodyMaterial = group.userData.body?.material;
    if (bodyMaterial) {
        bodyMaterial.emissiveIntensity = hovered
            ? bodyMaterial.userData?.baseEmissiveIntensity + 0.14
            : bodyMaterial.userData?.baseEmissiveIntensity;
    }
}

function configureMaterialState(material) {
    if (!material?.isMaterial) {
        return;
    }
    material.userData = {
        ...material.userData,
        baseEmissiveIntensity: material.emissiveIntensity,
    };
}

function disposeObject(object) {
    object.traverse((child) => {
        if (child.geometry) {
            child.geometry.dispose();
        }
        if (child.material) {
            const materials = Array.isArray(child.material)
                ? child.material
                : [child.material];
            materials.forEach((material) => {
                material.map?.dispose();
                material.dispose();
            });
        }
    });
}

function projectSceneLayout(
    camera,
    host,
    machineGroups,
    staticBlockGroups,
    visualLayerGroups,
) {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);

    function projectGroup(group) {
        if (!group) {
            return null;
        }
        const worldPosition = group.getWorldPosition(new THREE.Vector3());
        const projected = worldPosition.project(camera);
        const bounds = new THREE.Box3().setFromObject(group);
        const corners = [];
        for (const x of [bounds.min.x, bounds.max.x]) {
            for (const y of [bounds.min.y, bounds.max.y]) {
                for (const z of [bounds.min.z, bounds.max.z]) {
                    corners.push(new THREE.Vector3(x, y, z).project(camera));
                }
            }
        }
        const left = (Math.min(...corners.map(p => p.x)) + 1) / 2 * width;
        const right = (Math.max(...corners.map(p => p.x)) + 1) / 2 * width;
        const top = (1 - Math.max(...corners.map(p => p.y))) / 2 * height;
        const bottom = (1 - Math.min(...corners.map(p => p.y))) / 2 * height;
        const x = ((projected.x + 1) / 2) * width;
        // One nameplate per existing grid cell, with an 8px+ gap to neighbours.
        const cellWidth = ((GRID_RIGHT - GRID_LEFT + GRID_COLUMN_GAP) / 7) * width / (camera.right - camera.left);
        const labelWidth = Math.min(128, cellWidth - 12);
        return {
            x,
            y: ((1 - projected.y) / 2) * height,
            width: right - left,
            height: bottom - top,
            top,
            label: {
                x: x - labelWidth / 2,
                y: top - 12 - 64,
                width: labelWidth,
                height: 64,
            },
            gridRow: group.userData.gridRow,
            gridColumn: group.userData.gridColumn,
            projectionKey: group.userData.projectionKey,
        };
    }

    return {
        width,
        height,
        machines: machineGroups.reduce((positions, group) => {
            positions[group.userData.tester] = projectGroup(group);
            return positions;
        }, {}),
        staticBlocks: staticBlockGroups.map((group) => projectGroup(group)),
        visualLayers: visualLayerGroups.map((group) => projectGroup(group)),
    };
}

export function createFloorPlan3D({
    host,
    machines,
    staticBlocks,
    visualGrid,
    onHover = () => {},
    onLayout = () => {},
}) {
    if (!host) {
        throw new Error('Three.js Floor Plan host is required.');
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x233641);

    const camera = new THREE.OrthographicCamera(-12, 12, 10, -10, 0.1, 100);
    camera.position.set(0, 18, 18);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.className = 'floor-plan-3d-canvas';
    host.appendChild(renderer.domElement);

    const ambientLight = new THREE.HemisphereLight(0xd8efff, 0x15202b, 1.25);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff1dd, 3.0);
    keyLight.position.set(-8, 16, 9);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.left = -20;
    keyLight.shadow.camera.right = 20;
    keyLight.shadow.camera.top = 20;
    keyLight.shadow.camera.bottom = -20;
    keyLight.shadow.camera.far = 70;
    keyLight.shadow.normalBias = 0.035;
    const fillLight = new THREE.DirectionalLight(0x8bc9ef, 0.85);
    fillLight.position.set(12, 8, -6);
    scene.add(fillLight);
    scene.add(keyLight);

    const layoutMetrics = createLayoutMetrics(staticBlocks, machines);
    const primaryFrameBounds = getPrimaryFloorFrameBounds(staticBlocks);
    const gridMetrics = createVisualGridMetrics(visualGrid, primaryFrameBounds);
    const staticBlockGroups = staticBlocks.map((blockDef) =>
        createStaticBlock(scene, blockDef, layoutMetrics),
    );
    const visualLayerGroups = gridMetrics.rows
        .filter(({ type }) => type !== 'equipment-row')
        .map((rowMetric) => {
            const mesh = createFloorLayerMesh(rowMetric, gridMetrics);
            scene.add(mesh);
            return mesh;
        });

    const machineGroups = machines.map((machine) => {
        const group = createMachineMesh(machine, layoutMetrics);
        group.traverse((child) => {
            configureMaterialState(child.material);
        });
        scene.add(group);
        return group;
    });
    applyVisualGrid(
        visualGrid,
        gridMetrics,
        machineGroups,
        staticBlockGroups,
    );
    const environment = createLabEnvironment(staticBlocks, gridMetrics);
    scene.add(environment);
    const machineByTester = new Map(
        machineGroups.map((group) => [group.userData.tester, group]),
    );
    const pickTargets = machineGroups
        .map((group) => group.userData.body)
        .filter(Boolean);
    const pickTargetToGroup = new Map(
        machineGroups.map((group) => [group.userData.body, group]),
    );
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hoveredTester = null;
    let destroyed = false;

    function render() {
        if (!destroyed) {
            renderer.render(scene, camera);
        }
    }

    function resize() {
        if (destroyed) {
            return;
        }
        const width = Math.max(1, host.clientWidth);
        const height = Math.max(1, host.clientHeight);
        fitCameraToFloor(camera, host, staticBlocks, scene);
        camera.updateMatrixWorld();
        renderer.setSize(width, height, false);
        onLayout(projectSceneLayout(
            camera,
            host,
            machineGroups,
            staticBlockGroups,
            visualLayerGroups,
        ));
        render();
    }

    function setHovered(tester) {
        if (hoveredTester === tester) {
            return;
        }
        if (hoveredTester) {
            setMeshHovered(machineByTester.get(hoveredTester), false);
        }
        hoveredTester = tester;
        if (hoveredTester) {
            setMeshHovered(machineByTester.get(hoveredTester), true);
        }
        onHover(hoveredTester);
        render();
    }

    function handlePointerMove(event) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(pickTargets, false)[0];
        setHovered(hit ? pickTargetToGroup.get(hit.object)?.userData.tester : null);
    }

    function handlePointerLeave() {
        setHovered(null);
    }

    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerleave', handlePointerLeave);
    window.addEventListener('resize', resize);
    resize();

    return {
        destroy() {
            if (destroyed) {
                return;
            }
            destroyed = true;
            renderer.domElement.removeEventListener('pointermove', handlePointerMove);
            renderer.domElement.removeEventListener('pointerleave', handlePointerLeave);
            window.removeEventListener('resize', resize);
            disposeObject(scene);
            renderer.dispose();
            renderer.domElement.remove();
        },
        setHovered,
        resize,
    };
}
