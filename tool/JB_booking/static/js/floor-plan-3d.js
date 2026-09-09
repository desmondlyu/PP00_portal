import * as THREE from './vendor/three.module.js';

const WORLD_WIDTH = 24;
const WORLD_DEPTH = 18;
const VIEW_HEIGHT = 20;
const MACHINE_Y = 0.22;

function percentToWorld(value, total) {
    return (value / 100) * total - total / 2;
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

function createGround(scene) {
    const geometry = new THREE.PlaneGeometry(WORLD_WIDTH, WORLD_DEPTH);
    const material = createMaterial(0x102131, {
        roughness: 0.92,
        metalness: 0.08,
    });
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.12;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(WORLD_WIDTH, 24, 0x31566d, 0x1b3445);
    grid.scale.z = WORLD_DEPTH / WORLD_WIDTH;
    grid.position.y = -0.1;
    grid.material.transparent = true;
    grid.material.opacity = 0.42;
    scene.add(grid);
}

function createStaticBlock(scene, blockDef) {
    const kind = blockDef.kind || 'machine';
    if (!['frame', 'walkway', 'device'].includes(kind)) {
        return;
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

function createMachineMesh(machine) {
    const isMs = machine.model === 'ms';
    const width = isMs ? 1.45 : 1.05;
    const depth = isMs ? 0.9 : 0.78;
    const height = isMs ? 1.1 : 1.55;
    const color = machine.booked ? 0xf09a42 : 0x36b9dd;
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
        createMaterial(machine.booked ? 0xffc16f : 0x8be7f7, {
            roughness: 0.32,
            metalness: 0.56,
            emissive: machine.booked ? 0x6e2d08 : 0x0a4e63,
            emissiveIntensity: 0.4,
        }),
    );
    topPanel.position.set(0, height + MACHINE_Y + 0.04, 0);
    topPanel.castShadow = true;

    const frontPanel = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.62, height * 0.26, 0.035),
        createMaterial(machine.booked ? 0x8a4e21 : 0x17657d, {
            roughness: 0.38,
            metalness: 0.5,
            emissive: machine.booked ? 0x2b1004 : 0x03242d,
            emissiveIntensity: 0.38,
        }),
    );
    frontPanel.position.set(0, height * 0.62 + MACHINE_Y, depth / 2 + 0.02);

    group.add(body, topPanel, frontPanel);
    group.position.set(
        percentToWorld(machine.x + machine.width / 2, WORLD_WIDTH),
        0,
        percentToWorld(machine.y + machine.height / 2, WORLD_DEPTH),
    );
    group.userData.tester = machine.tester;
    group.userData.booked = machine.booked;
    group.userData.model = machine.model;
    group.userData.baseY = group.position.y;
    group.userData.baseScale = new THREE.Vector3(1, 1, 1);
    group.userData.body = body;
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

export function createFloorPlan3D({
    host,
    machines,
    staticBlocks,
    onHover = () => {},
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

    createGround(scene);
    staticBlocks.forEach((blockDef) => createStaticBlock(scene, blockDef));

    const machineGroups = machines.map((machine) => {
        const group = createMachineMesh(machine);
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
        const aspect = width / height;
        const viewWidth = VIEW_HEIGHT * aspect;
        camera.left = -viewWidth / 2;
        camera.right = viewWidth / 2;
        camera.top = VIEW_HEIGHT / 2;
        camera.bottom = -VIEW_HEIGHT / 2;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
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
