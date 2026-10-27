const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function createAvatarEnv() {
  const context = { window: {}, Math, Date };
  vm.createContext(context);
  for (const f of ['config', 'avatars']) {
    const file = path.join(__dirname, '../static/js', f + '.js');
    vm.runInContext(fs.readFileSync(file, 'utf8'), context);
  }
  return context.window;
}

function createMockCtx() {
  const operations = [];
  return {
    operations,
    save() { operations.push({ type: 'save' }); },
    restore() { operations.push({ type: 'restore' }); },
    translate(x, y) { operations.push({ type: 'translate', x, y }); },
    scale(sx, sy) { operations.push({ type: 'scale', sx, sy }); },
    rotate(rad) { operations.push({ type: 'rotate', rad }); },
    beginPath() { operations.push({ type: 'beginPath' }); },
    closePath() { operations.push({ type: 'closePath' }); },
    moveTo(x, y) { operations.push({ type: 'moveTo', x, y }); },
    lineTo(x, y) { operations.push({ type: 'lineTo', x, y }); },
    quadraticCurveTo(cpx, cpy, x, y) { operations.push({ type: 'quadraticCurveTo', cpx, cpy, x, y }); },
    arc(x, y, r, sa, ea) { operations.push({ type: 'arc', x, y, r, sa, ea, fillStyle: this.fillStyle, strokeStyle: this.strokeStyle }); },
    ellipse(x, y, rx, ry, rot, sa, ea) { operations.push({ type: 'ellipse', x, y, rx, ry, rot, sa, ea, fillStyle: this.fillStyle, strokeStyle: this.strokeStyle }); },
    fillRect(x, y, w, h) { operations.push({ type: 'fillRect', x, y, w, h, fillStyle: this.fillStyle }); },
    strokeRect(x, y, w, h) { operations.push({ type: 'strokeRect', x, y, w, h, strokeStyle: this.strokeStyle }); },
    roundRect(x, y, w, h, r) { operations.push({ type: 'roundRect', x, y, w, h, r }); },
    fill() { operations.push({ type: 'fill', fillStyle: this.fillStyle }); },
    stroke() { operations.push({ type: 'stroke', strokeStyle: this.strokeStyle }); },
    fillText(text, x, y) { operations.push({ type: 'fillText', text, x, y }); },
    createLinearGradient() { return { addColorStop() {} }; },
    createRadialGradient() { return { addColorStop() {} }; },
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
  };
}

test('character inside and headpiece change appearance across up, down, left, right', () => {
  const win = createAvatarEnv();
  const headpieces = ['crt_bot', 'minotaur', 'wafer_mecha', 'boba_head', 'code_wizard'];

  for (const costumeId of headpieces) {
    const ctxUp = createMockCtx();
    win.drawWackyAvatar(ctxUp, { avatarId: 'office_1', outfitAvatarId: costumeId, dir: 'up' });

    const ctxDown = createMockCtx();
    win.drawWackyAvatar(ctxDown, { avatarId: 'office_1', outfitAvatarId: costumeId, dir: 'down' });

    const ctxLeft = createMockCtx();
    win.drawWackyAvatar(ctxLeft, { avatarId: 'office_1', outfitAvatarId: costumeId, dir: 'left' });

    const ctxRight = createMockCtx();
    win.drawWackyAvatar(ctxRight, { avatarId: 'office_1', outfitAvatarId: costumeId, dir: 'right' });

    // Up view must NOT draw front face eyes at x=-5 or x=4
    const upFrontEyes = ctxUp.operations.filter(op => op.type === 'fillRect' && (op.x === -5 || op.x === 4) && op.y === -15);
    assert.equal(upFrontEyes.length, 0, `${costumeId} facing UP must not draw front eyes`);

    // Down view MUST draw front face eyes at x=-5 and x=4
    const downFrontEyes = ctxDown.operations.filter(op => op.type === 'fillRect' && (op.x === -5 || op.x === 4) && op.y === -15);
    assert.equal(downFrontEyes.length, 2, `${costumeId} facing DOWN must draw both front eyes`);

    // Left and Right views must draw side profile eye at x=3
    const leftSideEye = ctxLeft.operations.filter(op => op.type === 'fillRect' && op.x === 3 && op.y === -15);
    const rightSideEye = ctxRight.operations.filter(op => op.type === 'fillRect' && op.x === 3 && op.y === -15);
    assert.equal(leftSideEye.length, 1, `${costumeId} facing LEFT must draw side profile eye`);
    assert.equal(rightSideEye.length, 1, `${costumeId} facing RIGHT must draw side profile eye`);

    // Left view scales ctx horizontally by -1, right scales by 1
    const leftFlip = ctxLeft.operations.find(op => op.type === 'scale' && op.sx === -1 && op.sy === 1);
    const rightFlip = ctxRight.operations.find(op => op.type === 'scale' && op.sx === 1 && op.sy === 1);
    assert.ok(leftFlip, `${costumeId} facing LEFT must apply flipX scale(-1, 1)`);
    assert.ok(rightFlip, `${costumeId} facing RIGHT must apply normal scale(1, 1)`);

    // Operation streams must be distinct between up, down, and side directions
    assert.notEqual(ctxUp.operations.length, ctxDown.operations.length, `${costumeId} UP and DOWN operations must differ`);
    assert.notEqual(ctxDown.operations.length, ctxRight.operations.length, `${costumeId} DOWN and RIGHT operations must differ`);
  }
});

test('all full-body suit costumes change appearance across up, down, left, right', () => {
  const win = createAvatarEnv();
  const suits = ['frog_eng', 'trex_intern', 'kuaikuai_god', 'shark_slacker', 'alien_debug'];

  for (const costumeId of suits) {
    const ctxUp = createMockCtx();
    win.drawWackyAvatar(ctxUp, { avatarId: 'office_1', outfitAvatarId: costumeId, dir: 'up' });

    const ctxDown = createMockCtx();
    win.drawWackyAvatar(ctxDown, { avatarId: 'office_1', outfitAvatarId: costumeId, dir: 'down' });

    const ctxLeft = createMockCtx();
    win.drawWackyAvatar(ctxLeft, { avatarId: 'office_1', outfitAvatarId: costumeId, dir: 'left' });

    const ctxRight = createMockCtx();
    win.drawWackyAvatar(ctxRight, { avatarId: 'office_1', outfitAvatarId: costumeId, dir: 'right' });

    // Left view scales ctx horizontally by -1, right scales by 1
    const leftFlip = ctxLeft.operations.find(op => op.type === 'scale' && op.sx === -1 && op.sy === 1);
    const rightFlip = ctxRight.operations.find(op => op.type === 'scale' && op.sx === 1 && op.sy === 1);
    assert.ok(leftFlip, `${costumeId} facing LEFT must apply flipX scale(-1, 1)`);
    assert.ok(rightFlip, `${costumeId} facing RIGHT must apply normal scale(1, 1)`);

    // Operation streams must be distinct between up, down, and side directions
    assert.notEqual(ctxUp.operations.length, ctxDown.operations.length, `${costumeId} UP and DOWN operations must differ`);
    assert.notEqual(ctxDown.operations.length, ctxRight.operations.length, `${costumeId} DOWN and RIGHT operations must differ`);
  }
});

test('minotaur headpiece features distinct front nose ring, side snout profile, and clean back', () => {
  const win = createAvatarEnv();
  const ctxUp = createMockCtx();
  win.drawWackyAvatar(ctxUp, { avatarId: 'office_1', outfitAvatarId: 'minotaur', dir: 'up' });

  const ctxDown = createMockCtx();
  win.drawWackyAvatar(ctxDown, { avatarId: 'office_1', outfitAvatarId: 'minotaur', dir: 'down' });

  const ctxRight = createMockCtx();
  win.drawWackyAvatar(ctxRight, { avatarId: 'office_1', outfitAvatarId: 'minotaur', dir: 'right' });

  // Down view has center nose ring at x=0
  const centerRing = ctxDown.operations.find(op => op.type === 'arc' && op.x === 0 && op.strokeStyle === '#facc15');
  assert.ok(centerRing, 'Minotaur down view must have center nose ring');

  // Side view has forward snout at x=2, w=20 and forward-protruding ring at x=17
  const sideSnout = ctxRight.operations.find(op => op.type === 'fillRect' && op.x === 2 && op.w === 20 && op.fillStyle === '#d6a16c');
  const sideRing = ctxRight.operations.find(op => op.type === 'arc' && op.x === 17 && op.strokeStyle === '#facc15');
  assert.ok(sideSnout, 'Minotaur side view must have forward-protruding snout');
  assert.ok(sideRing, 'Minotaur side view must have protruding nose ring');

  // Up view must NOT have any gold nose ring
  const upRings = ctxUp.operations.filter(op => op.type === 'arc' && op.strokeStyle === '#facc15');
  assert.equal(upRings.length, 0, 'Minotaur up view must NOT have nose ring');
});

test('crt_bot headpiece features green pixel face in front, CRT tube rear in up, and dial in side', () => {
  const win = createAvatarEnv();
  const ctxUp = createMockCtx();
  win.drawWackyAvatar(ctxUp, { avatarId: 'office_1', outfitAvatarId: 'crt_bot', dir: 'up' });

  const ctxDown = createMockCtx();
  win.drawWackyAvatar(ctxDown, { avatarId: 'office_1', outfitAvatarId: 'crt_bot', dir: 'down' });

  const ctxRight = createMockCtx();
  win.drawWackyAvatar(ctxRight, { avatarId: 'office_1', outfitAvatarId: 'crt_bot', dir: 'right' });

  // Down view has green pixel eyes
  const pixelEyes = ctxDown.operations.filter(op => op.type === 'fillRect' && op.fillStyle === '#86efac');
  assert.ok(pixelEyes.length >= 2, 'CRT Bot down view must have pixel eyes');

  // Up view has rear vents and no green pixel face
  const upVents = ctxUp.operations.filter(op => op.type === 'fillRect' && op.fillStyle === '#1e293b' && op.h === 2);
  const upPixelFace = ctxUp.operations.filter(op => op.type === 'fillRect' && op.fillStyle === '#86efac');
  assert.ok(upVents.length >= 4, 'CRT Bot up view must have rear vents');
  assert.equal(upPixelFace.length, 0, 'CRT Bot up view must not have pixel face');

  // Side view has rear CRT tube bulb (x=-24) and side dial
  const sideTube = ctxRight.operations.find(op => op.type === 'fillRect' && op.x === -24 && op.fillStyle === '#334155');
  const sideDial = ctxRight.operations.find(op => op.type === 'fillRect' && op.fillStyle === '#4ade80' && op.w === 4);
  assert.ok(sideTube, 'CRT Bot side view must show rear CRT tube profile');
  assert.ok(sideDial, 'CRT Bot side view must show side tuning dial');
});

test('all 6 NPC avatars render distinct 4-directional views (up, down, left, right)', () => {
  const win = createAvatarEnv();
  const npcs = [
    'npc_vp_uncle',
    'npc_dir_pp00_slim',
    'npc_auntie_meifeng',
    'npc_auntie_shufen',
    'npc_flamingo_cmd',
    'npc_security_guard',
  ];

  for (const npcId of npcs) {
    const ctxUp = createMockCtx();
    win.drawWackyAvatar(ctxUp, { avatarId: npcId, dir: 'up' });

    const ctxDown = createMockCtx();
    win.drawWackyAvatar(ctxDown, { avatarId: npcId, dir: 'down' });

    const ctxLeft = createMockCtx();
    win.drawWackyAvatar(ctxLeft, { avatarId: npcId, dir: 'left' });

    const ctxRight = createMockCtx();
    win.drawWackyAvatar(ctxRight, { avatarId: npcId, dir: 'right' });

    // Left view scales ctx horizontally by -1, right scales by 1
    const leftFlip = ctxLeft.operations.find(op => op.type === 'scale' && op.sx === -1 && op.sy === 1);
    const rightFlip = ctxRight.operations.find(op => op.type === 'scale' && op.sx === 1 && op.sy === 1);
    assert.ok(leftFlip, `${npcId} facing LEFT must apply flipX scale(-1, 1)`);
    assert.ok(rightFlip, `${npcId} facing RIGHT must apply normal scale(1, 1)`);

    // Operation streams must be distinct between up, down, and side directions
    assert.notEqual(ctxUp.operations.length, ctxDown.operations.length, `${npcId} UP and DOWN operations must differ`);
    assert.notEqual(ctxDown.operations.length, ctxRight.operations.length, `${npcId} DOWN and RIGHT operations must differ`);
  }

  // Specific NPC visual feature checks:
  // 1. VP Uncle: Down view has glasses bridge/frames at x=-2; Up view has back seam line and NO front glasses bridge
  const vpUp = createMockCtx();
  win.drawWackyAvatar(vpUp, { avatarId: 'npc_vp_uncle', dir: 'up' });
  const vpDown = createMockCtx();
  win.drawWackyAvatar(vpDown, { avatarId: 'npc_vp_uncle', dir: 'down' });
  const vpRight = createMockCtx();
  win.drawWackyAvatar(vpRight, { avatarId: 'npc_vp_uncle', dir: 'right' });

  assert.ok(vpDown.operations.some(op => op.type === 'moveTo' && op.x === -2 && op.y === -15), 'VP Down must have glasses bridge');
  assert.ok(!vpUp.operations.some(op => op.type === 'moveTo' && op.x === -2 && op.y === -15), 'VP Up must not have glasses bridge');
  assert.ok(vpRight.operations.some(op => op.type === 'arc' && op.x === 6.5), 'VP Right must have single side profile eye');

  // 2. Auntie Meifeng: Down view has front smiling mouth; Up view has back apron ribbon tie
  const mfUp = createMockCtx();
  win.drawWackyAvatar(mfUp, { avatarId: 'npc_auntie_meifeng', dir: 'up' });
  const mfDown = createMockCtx();
  win.drawWackyAvatar(mfDown, { avatarId: 'npc_auntie_meifeng', dir: 'down' });
  assert.ok(mfDown.operations.some(op => op.type === 'arc' && op.x === 0 && Math.abs(op.y - (-11.5)) < 0.1), 'Meifeng Down has front smile');
  assert.ok(!mfUp.operations.some(op => op.type === 'arc' && op.x === 0 && Math.abs(op.y - (-11.5)) < 0.1), 'Meifeng Up has no front smile');

  // 3. Flamingo Commander: Down view has commander sunglasses; Up view has back plumage and NO front sunglasses
  const flamUp = createMockCtx();
  win.drawWackyAvatar(flamUp, { avatarId: 'npc_flamingo_cmd', dir: 'up' });
  const flamDown = createMockCtx();
  win.drawWackyAvatar(flamDown, { avatarId: 'npc_flamingo_cmd', dir: 'down' });
  const flamRight = createMockCtx();
  win.drawWackyAvatar(flamRight, { avatarId: 'npc_flamingo_cmd', dir: 'right' });
  assert.ok(flamDown.operations.some(op => (op.type === 'roundRect' || op.type === 'fillRect') && op.x === -7 && op.y === -16), 'Flamingo Down has front commander sunglasses');
  assert.ok(!flamUp.operations.some(op => (op.type === 'roundRect' || op.type === 'fillRect') && op.x === -7 && op.y === -16), 'Flamingo Up has no front sunglasses');
  assert.ok(flamRight.operations.some(op => op.type === 'arc' && op.x === 11), 'Flamingo Right has forward-curved neck and head at x=11');

  // 4. Security Guard: Down view has gold badge arc at y=-24.5; Up view has tactical vest reflector stripe and no cap badge
  const guardUp = createMockCtx();
  win.drawWackyAvatar(guardUp, { avatarId: 'npc_security_guard', dir: 'up' });
  const guardDown = createMockCtx();
  win.drawWackyAvatar(guardDown, { avatarId: 'npc_security_guard', dir: 'down' });
  const guardRight = createMockCtx();
  win.drawWackyAvatar(guardRight, { avatarId: 'npc_security_guard', dir: 'right' });
  assert.ok(guardDown.operations.some(op => op.type === 'arc' && op.x === 0 && op.y === -24.5), 'Guard Down has front cap badge');
  assert.ok(!guardUp.operations.some(op => op.type === 'arc' && op.x === 0 && op.y === -24.5), 'Guard Up has no front cap badge');
  assert.ok(guardUp.operations.some(op => op.type === 'fillRect' && op.w === 12 && op.h === 2.5), 'Guard Up has back tactical vest reflector');
  assert.ok(guardRight.operations.some(op => (op.type === 'roundRect' || op.type === 'fillRect') && op.w === 18 && op.h === 4), 'Guard Right has forward-protruding cap visor');
});

test('standalone avatar IDs (minotaur, wafer_mecha, boba_head, crt_bot) render 4-directional headwear', () => {
  const win = createAvatarEnv();
  for (const standaloneId of ['minotaur', 'wafer_mecha', 'boba_head', 'crt_bot']) {
    const ctxUp = createMockCtx();
    win.drawWackyAvatar(ctxUp, { avatarId: standaloneId, dir: 'up' });

    const ctxDown = createMockCtx();
    win.drawWackyAvatar(ctxDown, { avatarId: standaloneId, dir: 'down' });

    const ctxRight = createMockCtx();
    win.drawWackyAvatar(ctxRight, { avatarId: standaloneId, dir: 'right' });

    assert.notEqual(ctxUp.operations.length, ctxDown.operations.length, `${standaloneId} standalone up/down must differ`);
    assert.notEqual(ctxDown.operations.length, ctxRight.operations.length, `${standaloneId} standalone down/right must differ`);
  }
});
