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
const MS_MACHINE_COLOR = 0xd13bff;
const T_BOOKED_COLOR = 0xf09a42;
const MS_BOOKED_COLOR = 0xb52de0;
const MS_TOP_PANEL_COLOR = 0xf2b3ff;
const MS_FRONT_PANEL_COLOR = 0x6d1b98;
const LOWER_ZONE_START_Y = 71.5;
const LOWER_ZONE_OFFSET_PERCENT = 6;

function getLowerZoneOffsetPercent(y) {
    return y >= LOWER_ZONE_START_Y ? LOWER_ZONE_OFFSET_PERCENT : 0;
}

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
        const rowBaseline = percentToWorld(
            rowBottomPercent + getLowerZoneOffsetPercent(row.y),
            WORLD_DEPTH,
        );
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

function fitCameraToFloor(camera, host, staticBlocks) {
    const floorBounds = getFrameBounds(staticBlocks, 0);
    const minY = -0.2;
    const maxY = MAX_EQUIPMENT_HEIGHT + MACHINE_Y;
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
    camera.left = -requiredWidth / 2;
    camera.right = requiredWidth / 2;
    camera.top = requiredHeight / 2;
    camera.bottom = -requiredHeight / 2;
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
    const visualOffset = getLowerZoneOffsetPercent(blockDef.y);
    const blockBottomZ = percentToWorld(
        blockDef.y + blockDef.h + visualOffset,
        WORLD_DEPTH,
    );
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

function createUf3000Mesh(blockDef, metrics) {
    const width = Math.max(0.72, (blockDef.w / 100) * WORLD_WIDTH * 0.72);
    const depth = Math.max(0.62, (blockDef.h / 100) * WORLD_DEPTH * 0.62);
    const bodyHeight = Math.min(1.18, MAX_EQUIPMENT_HEIGHT - 0.25);
    const group = new THREE.Group();

    const body = new THREE.Mesh(
        new THREE.BoxGeometry(width, bodyHeight, depth),
        createEquipmentMaterial(0x1b6f8d, { emissive: 0x062d3b }),
    );
    body.position.y = bodyHeight / 2 + MACHINE_Y;

    const topPanel = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.66, 0.10, depth * 0.70),
        createEquipmentMaterial(0x8cecf4, {
            metalness: 0.55,
            emissive: 0x0b5a6d,
        }),
    );
    topPanel.position.set(0, bodyHeight + MACHINE_Y + 0.05, 0);

    const frontDoor = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.52, bodyHeight * 0.48, 0.045),
        createEquipmentMaterial(0x0d4056, { metalness: 0.48 }),
    );
    frontDoor.position.set(
        0,
        bodyHeight * 0.45 + MACHINE_Y,
        depth / 2 + 0.025,
    );

    const controlPanel = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.18, 0.16, 0.05),
        createEquipmentMaterial(0xf1b65d, { emissive: 0x4a2107 }),
    );
    controlPanel.position.set(
        width * 0.28,
        bodyHeight * 0.78 + MACHINE_Y,
        depth / 2 + 0.05,
    );

    group.add(body, topPanel, frontDoor, controlPanel);
    group.userData.equipment = 'UF3000';
    group.userData.blockLabel = blockDef.label;
    group.userData.frameBounds = metrics.frameBounds;
    return group;
}

function createProbeSeatMesh(blockDef, metrics) {
    const width = Math.max(0.68, (blockDef.w / 100) * WORLD_WIDTH * 0.70);
    const depth = Math.max(0.58, (blockDef.h / 100) * WORLD_DEPTH * 0.58);
    const baseHeight = 0.30;
    const columnHeight = 0.72;
    const group = new THREE.Group();

    const base = new THREE.Mesh(
        new THREE.BoxGeometry(width, baseHeight, depth),
        createEquipmentMaterial(0x55469c, { emissive: 0x171037 }),
    );
    base.position.y = baseHeight / 2 + MACHINE_Y;

    const column = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.13, columnHeight, depth * 0.16),
        createEquipmentMaterial(0x9a86e8, { metalness: 0.50 }),
    );
    column.position.set(
        0,
        baseHeight + columnHeight / 2 + MACHINE_Y,
        0,
    );

    const probeHead = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.48, 0.16, depth * 0.38),
        createEquipmentMaterial(0xd7ccff, {
            metalness: 0.58,
            emissive: 0x281e5a,
        }),
    );
    probeHead.position.set(
        0,
        baseHeight + columnHeight + 0.08 + MACHINE_Y,
        0,
    );

    const needle = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.035, 0.30, depth * 0.035),
        createEquipmentMaterial(0xf6de9b, { metalness: 0.68 }),
    );
    needle.position.set(
        0,
        baseHeight + columnHeight - 0.08 + MACHINE_Y,
        0,
    );

    group.add(base, column, probeHead, needle);
    group.userData.equipment = blockDef.label;
    group.userData.blockLabel = blockDef.label;
    group.userData.frameBounds = metrics.frameBounds;
    return group;
}

function createAutoHandlerMesh(blockDef, metrics) {
    const width = Math.max(0.76, (blockDef.w / 100) * WORLD_WIDTH * 0.72);
    const depth = Math.max(0.62, (blockDef.h / 100) * WORLD_DEPTH * 0.62);
    const baseHeight = 0.26;
    const columnHeight = 0.72;
    const group = new THREE.Group();

    const base = new THREE.Mesh(
        new THREE.BoxGeometry(width, baseHeight, depth),
        createEquipmentMaterial(0x4b6575, { emissive: 0x10242e }),
    );
    base.position.y = baseHeight / 2 + MACHINE_Y;

    const deck = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.78, 0.10, depth * 0.72),
        createEquipmentMaterial(0x8bd7dc, {
            metalness: 0.52,
            emissive: 0x0a3f49,
        }),
    );
    deck.position.set(0, baseHeight + MACHINE_Y + 0.05, 0);

    const column = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.14, columnHeight, depth * 0.16),
        createEquipmentMaterial(0x6d8795, { metalness: 0.46 }),
    );
    column.position.set(
        -width * 0.22,
        baseHeight + columnHeight / 2 + MACHINE_Y,
        0,
    );

    const arm = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.56, 0.10, depth * 0.12),
        createEquipmentMaterial(0xe0b45e, {
            metalness: 0.58,
            emissive: 0x4b2607,
        }),
    );
    arm.position.set(
        width * 0.08,
        baseHeight + columnHeight - 0.04 + MACHINE_Y,
        0,
    );

    const gripper = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.12, 0.18, depth * 0.18),
        createEquipmentMaterial(0xd7e6ea, { metalness: 0.64 }),
    );
    gripper.position.set(
        width * 0.34,
        baseHeight + columnHeight - 0.14 + MACHINE_Y,
        0,
    );

    group.add(base, deck, column, arm, gripper);
    group.userData.equipment = 'Auto Hander';
    group.userData.blockLabel = blockDef.label;
    group.userData.frameBounds = metrics.frameBounds;
    return group;
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
    const width = isMs ? 1.45 : 1.05;
    const depth = isMs ? 0.9 : 0.78;
    const height = Math.min(isMs ? 1.1 : 1.55, MAX_MACHINE_HEIGHT);
    const color = machine.booked
        ? (isMs ? MS_BOOKED_COLOR : T_BOOKED_COLOR)
        : (isMs ? MS_MACHINE_COLOR : T_MACHINE_COLOR);
    const material = createMaterial(color, {
        roughness: 0.48,
        metalness: 0.42,
        emissive: machine.booked ? 0x301406 : 0x06202a,
        emissiveIntensity: 0.28,
    });

    const group = new THREE.Group();
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, depth),
        material,
    );
    body.position.y = height / 2 + MACHINE_Y;
    body.castShadow = true;
    body.receiveShadow = true;

    const topPanel = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.78, 0.08, depth * 0.72),
        createMaterial(
            machine.booked
                ? (isMs ? MS_TOP_PANEL_COLOR : 0xffc16f)
                : (isMs ? MS_TOP_PANEL_COLOR : 0x8be7f7),
            {
            roughness: 0.32,
            metalness: 0.56,
            emissive: machine.booked
                ? (isMs ? 0x5b0b72 : 0x6e2d08)
                : (isMs ? 0x7c168f : 0x0a4e63),
            emissiveIntensity: 0.4,
            },
        ),
    );
    topPanel.position.set(0, height + MACHINE_Y + 0.04, 0);
    topPanel.castShadow = true;

    const frontPanel = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.62, height * 0.26, 0.035),
        createMaterial(machine.booked
            ? (isMs ? MS_FRONT_PANEL_COLOR : 0x8a4e21)
            : (isMs ? MS_FRONT_PANEL_COLOR : 0x17657d), {
            roughness: 0.38,
            metalness: 0.5,
            emissive: machine.booked
                ? (isMs ? 0x2d0638 : 0x2b1004)
                : (isMs ? 0x2d0638 : 0x03242d),
            emissiveIntensity: 0.38,
        }),
    );
    frontPanel.position.set(0, height * 0.62 + MACHINE_Y, depth / 2 + 0.02);

    group.add(body, topPanel, frontPanel);
    const placement = metrics.machinePlacements.get(machine.tester);
    group.position.set(
        placement.x,
        0,
        placement.rowBaseline - depth / 2,
    );
    group.userData.tester = machine.tester;
    group.userData.booked = machine.booked;
    group.userData.model = machine.model;
    group.userData.rowBaseline = placement.rowBaseline;
    group.userData.rowKey = placement.rowKey;
    group.userData.baseY = group.position.y;
    group.userData.baseScale = new THREE.Vector3(1, 1, 1);
    group.userData.body = body;
    clampGroupToBounds(group, metrics.frameBounds);
    return group;
}

function setMeshHovered(group, hovered) {
    if (!group) {
        return;
    }
    group.position.y = group.userData.baseY + (hovered ? 0.16 : 0);
    group.scale.copy(group.userData.baseScale).multiplyScalar(hovered ? 1.035 : 1);
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
            materials.forEach((material) => material.dispose());
        }
    });
}

function projectSceneLayout(camera, host, machineGroups, staticBlockGroups) {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);

    function projectGroup(group) {
        if (!group) {
            return null;
        }
        const worldPosition = group.getWorldPosition(new THREE.Vector3());
        const projected = worldPosition.project(camera);
        return {
            x: ((projected.x + 1) / 2) * width,
            y: ((1 - projected.y) / 2) * height,
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
    };
}

export function createFloorPlan3D({
    host,
    machines,
    staticBlocks,
    onHover = () => {},
    onLayout = () => {},
}) {
    if (!host) {
        throw new Error('Three.js Floor Plan host is required.');
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07111c);

    const camera = new THREE.OrthographicCamera(-12, 12, 10, -10, 0.1, 100);
    camera.position.set(0, 18, 18);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.className = 'floor-plan-3d-canvas';
    host.appendChild(renderer.domElement);

    const ambientLight = new THREE.HemisphereLight(0xb9e9ff, 0x07111c, 1.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.3);
    keyLight.position.set(-6, 14, 10);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);

    const layoutMetrics = createLayoutMetrics(staticBlocks, machines);
    const staticBlockGroups = staticBlocks.map((blockDef) =>
        createStaticBlock(scene, blockDef, layoutMetrics),
    );

    const machineGroups = machines.map((machine) => {
        const group = createMachineMesh(machine, layoutMetrics);
        group.traverse((child) => {
            configureMaterialState(child.material);
        });
        scene.add(group);
        return group;
    });
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
        fitCameraToFloor(camera, host, staticBlocks);
        camera.updateMatrixWorld();
        renderer.setSize(width, height, false);
        onLayout(projectSceneLayout(
            camera,
            host,
            machineGroups,
            staticBlockGroups,
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
