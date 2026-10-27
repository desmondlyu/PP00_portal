const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('Bird Commander and Avatars do not spin when knocked down (combatDown: true)', () => {
  const root = path.join(__dirname, '../static/js');
  const context = {
    console,
    Date,
    Math,
    window: {
      getAvatarAppearance: (id, outfit) => ({ renderId: id, outfitId: outfit }),
      WORLD_MAP: { toiletStalls: [] },
      OfficeCombat: { reactionPose: () => ({ x: 0, y: 0, jump: 0, active: false }) },
      fillRoundRect: () => {},
      strokeRoundRect: () => {},
    },
  };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'config.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'avatars.js'), 'utf8'), context);

  const rotations = [];
  const fakeCtx = {
    save: () => {},
    restore: () => {},
    translate: () => {},
    scale: () => {},
    rotate: (angle) => { rotations.push(angle); },
    beginPath: () => {},
    closePath: () => {},
    arc: () => {},
    ellipse: () => {},
    moveTo: () => {},
    lineTo: () => {},
    quadraticCurveTo: () => {},
    stroke: () => {},
    fill: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    roundRect: () => {},
    fillText: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
  };

  // Render Bird Commander with combatDown: true and tick = 100
  rotations.length = 0;
  context.window.drawWackyAvatar(fakeCtx, {
    avatarId: 'npc_flamingo_cmd',
    combatDown: true,
    isKnockedBack: true, // Even if isKnockedBack flag was left true, it MUST NOT spin
    tick: 100,
    x: 500,
    y: 500,
  });

  // Base rotation for sleep_bed / combatDown is ~ -Math.PI / 2 (-1.57)
  const bodyRotation = rotations[0];
  assert.ok(typeof bodyRotation === 'number', 'Body rotation must be recorded');
  assert.ok(
    bodyRotation < -1.4 && bodyRotation > -1.7,
    `Rotation should be lying flat (~ -1.57 rad), but got ${bodyRotation}`
  );
  // It must NOT be spinning at tick * 0.48 = 48 rad
  assert.ok(Math.abs(bodyRotation) < 3.0, `Rotation must not spin continuously (${bodyRotation})`);

  // Test at tick = 250
  rotations.length = 0;
  context.window.drawWackyAvatar(fakeCtx, {
    avatarId: 'npc_flamingo_cmd',
    combatDown: true,
    isKnockedBack: true,
    tick: 250,
    x: 500,
    y: 500,
  });
  const bodyRotation2 = rotations[0];
  assert.ok(
    bodyRotation2 < -1.4 && bodyRotation2 > -1.7,
    `Rotation at tick 250 should still be lying flat (~ -1.57 rad), but got ${bodyRotation2}`
  );
});

test('NPC static shock disgust counter-attack performs actual attack with damage and knockback', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '../static/js/app.js'), 'utf8');

  // Verify static shock disgust counter-attack handles all weapons
  assert.ok(appJs.includes("if (npc.id === 'npc_vp_boss' || npc.avatarId === 'npc_vp_uncle') weaponEmoji = '🏌️‍♂️';"), 'VP Boss uses golf club');
  assert.ok(appJs.includes("else if (npc.id === 'npc_dir_pp00' || npc.avatarId === 'npc_dir_pp00_slim') weaponEmoji = '🔧';"), 'Director PP00 uses wrench');
  assert.ok(appJs.includes("else if (npc.id === 'npc_security_guard' || npc.avatarId === 'npc_security_guard' || npc.isSecurityGuard || npc.name?.includes('警衛')) weaponEmoji = '🏏';"), 'Security Guard uses baton');
  assert.ok(appJs.includes("else if (npc.isSweeper || npc.id.includes('auntie') || npc.name?.includes('阿姨')) weaponEmoji = '🧹';"), 'Auntie uses broom');
  assert.ok(appJs.includes("else if (npc.isBirdCommander || npc.id === 'npc_bird_commander' || npc.avatarId === 'npc_flamingo_cmd') weaponEmoji = '🪶';"), 'Bird Commander uses feathers/beak');

  // Verify actual damage is sent to combat system
  assert.ok(appJs.includes("window.OfficeCombat?.send(network, 'combat_hurt', { targetId: network.clientId, npc: true });"), 'Actual combat_hurt packet must be sent');

  // Verify knockback uses correct ticksLeft property
  assert.ok(appJs.includes('ticksLeft: 22') && appJs.includes('totalTicks: 22'), 'Knockback must use ticksLeft: 22 and totalTicks: 22');

  // Verify security guard is included in disgustQuotes
  assert.ok(appJs.includes("npc_security_guard: '好噁心！竟敢襲警動手動腳，吃我一棒！⚡'"), 'disgustQuotes must include npc_security_guard');
});

test('Network simulation accurately tracks dynamic target and executes attack on arrival', () => {
  const root = path.join(__dirname, '../static/js');
  const context = {
    console,
    Date,
    Math,
    setTimeout: (fn) => setTimeout(fn, 0),
    clearTimeout: () => {},
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    window: {
      addEventListener: () => {},
      isPositionBlocked: () => false,
      WORLD_MAP: { toiletStalls: [] },
    },
  };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'config.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'network.js'), 'utf8'), context);

  const net = new context.window.EphemeralOfficeNetwork();
  net.connect({ name: 'Host', unit: 'PP10', x: 200, y: 200 });

  const bird = net.npcPlayers.get('npc_bird_commander');
  assert.ok(bird, 'Bird Commander NPC must exist');

  bird.x = 200;
  bird.y = 200;
  let dynamicTargetX = 280;
  let attackExecuted = false;

  // Test dynamic getX() getter tracking
  bird.chaseTarget = {
    x: 0,
    y: 200,
    getX: () => dynamicTargetX,
    getY: () => 200,
  };
  bird.chaseUntil = Date.now() + 5000;
  bird.onChaseArrival = (npc) => {
    attackExecuted = true;
  };

  // Step 1: Bird moves toward dynamic target
  net.update(1);
  assert.equal(bird.isMoving, true, 'Bird must be sprinting toward dynamic target');
  assert.ok(bird.x > 200, 'Bird x position must move forward');

  // Step 2: Target is within 60px arrival threshold
  bird.x = 240;
  dynamicTargetX = 280; // distance = 40 <= 60
  net.update(2);

  assert.equal(attackExecuted, true, 'Attack callback must be executed on arrival within 60px');
  assert.equal(bird.chaseTarget, null, 'chaseTarget must be cleared after attack');
  assert.equal(bird.isMoving, false, 'Bird must halt after attack');
});
