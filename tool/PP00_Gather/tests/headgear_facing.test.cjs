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
    arc(x, y, r, sa, ea) { operations.push({ type: 'arc', x, y, r, sa, ea, fillStyle: this.fillStyle, strokeStyle: this.strokeStyle }); },
    ellipse(x, y, rx, ry, rot, sa, ea) { operations.push({ type: 'ellipse', x, y, rx, ry, rot, sa, ea }); },
    fillRect(x, y, w, h) { operations.push({ type: 'fillRect', x, y, w, h, fillStyle: this.fillStyle }); },
    strokeRect(x, y, w, h) { operations.push({ type: 'strokeRect', x, y, w, h, strokeStyle: this.strokeStyle }); },
    roundRect(x, y, w, h, r) { operations.push({ type: 'roundRect', x, y, w, h, r }); },
    fill() { operations.push({ type: 'fill', fillStyle: this.fillStyle }); },
    stroke() { operations.push({ type: 'stroke', strokeStyle: this.strokeStyle }); },
    fillText(text, x, y) { operations.push({ type: 'fillText', text, x, y }); },
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
