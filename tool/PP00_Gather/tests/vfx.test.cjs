const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// VM Context following repo pattern
const context = {
  window: {},
  console,
  performance,
  Date,
  Math,
  Set,
  Array,
  Map,
  Boolean,
  Promise
};
context.window = context;
context.globalThis = context;
vm.createContext(context);

vm.runInContext(fs.readFileSync(path.join(__dirname, '../static/js/vfxPresets.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../static/js/vfx.js'), 'utf8'), context);

const OfficeVfx = context.OfficeVfx;
const OfficeVfxPresets = context.OfficeVfxPresets;

test('same confirmed event plays once and expires', () => {
  const fx = new OfficeVfx({ maxActive: 24, maxSeen: 512 });
  const e = {
    id: 'enemy:reaction-1:hit',
    kind: 'hit',
    phase: 'confirmed',
    x: 10,
    y: 20,
    startedAt: 1000,
    durationMs: 420
  };
  assert.equal(fx.emit(e), true);
  assert.equal(fx.emit(e), false);
  fx.update(1419);
  assert.equal(fx.activeCount, 1);
  fx.update(1420);
  assert.equal(fx.activeCount, 0);
});

test('duplicate remains suppressed after the animation expires', () => {
  const fx = new OfficeVfx({ maxActive: 24, maxSeen: 512 });
  const e = {
    id: 'enemy:reaction-2:hit',
    kind: 'hit',
    phase: 'confirmed',
    x: 10,
    y: 20,
    startedAt: 0,
    durationMs: 100
  };
  assert.equal(fx.emit(e), true);
  fx.update(1000);
  assert.equal(fx.activeCount, 0);
  // Same id should still be suppressed even after it expired from active
  assert.equal(fx.emit({ ...e, startedAt: 1000 }), false);
});

test('bounded maxSeen set evicts oldest seen event IDs', () => {
  const fx = new OfficeVfx({ maxActive: 24, maxSeen: 3 });
  assert.equal(fx.emit({ id: 'evt-1', kind: 'hit' }), true);
  assert.equal(fx.emit({ id: 'evt-2', kind: 'hit' }), true);
  assert.equal(fx.emit({ id: 'evt-3', kind: 'hit' }), true);
  assert.equal(fx.seen.size, 3);

  // 4th event pushes out evt-1
  assert.equal(fx.emit({ id: 'evt-4', kind: 'hit' }), true);
  assert.equal(fx.seen.size, 3);
  assert.equal(fx.seen.has('evt-1'), false);
  assert.equal(fx.seen.has('evt-4'), true);
});

test('maxActive capacity evicts lowest priority ambient before core combat hits', () => {
  const fx = new OfficeVfx({ maxActive: 2, maxSeen: 10 });
  // Add a core hit (priority 30) and a sleep ambient (priority 5)
  fx.emit({ id: 'hit-1', kind: 'hit', startedAt: 100, durationMs: 1000 });
  fx.emit({ id: 'sleep-1', kind: 'sleep', startedAt: 200, durationMs: 1000, loop: true });
  assert.equal(fx.activeCount, 2);

  // Emitting another hit must evict sleep-1 (priority 5), NOT hit-1 (priority 30)
  fx.emit({ id: 'hit-2', kind: 'hit', startedAt: 300, durationMs: 1000 });
  assert.equal(fx.activeCount, 2);
  const kinds = fx.active.map(x => x.id);
  assert.equal(kinds.includes('hit-1'), true);
  assert.equal(kinds.includes('hit-2'), true);
  assert.equal(kinds.includes('sleep-1'), false);
});

test('resolveAnchor is a public method on OfficeVfx instance', () => {
  const fx = new OfficeVfx();
  assert.equal(typeof fx.resolveAnchor, 'function');
  assert.equal(typeof fx.setAnchorResolver, 'function');

  // Resolving without resolver returns null safely
  assert.equal(fx.resolveAnchor('npc-1'), null);

  // Set resolver and check resolution
  fx.setAnchorResolver(id => ({ x: 150, y: 250, headY: 210, visible: true }));
  const anchor = fx.resolveAnchor('npc-1');
  assert.deepEqual(anchor, { x: 150, y: 250, headY: 210, visible: true });
});

test('despawned entity purges continuous looping effects immediately on draw', () => {
  const fx = new OfficeVfx();
  let entityAlive = true;
  fx.setAnchorResolver(id => (entityAlive ? { x: 100, y: 100, visible: true } : null));

  fx.emit({ id: 'loop-sleep', kind: 'sleep', entityId: 'npc-target', loop: true });
  fx.emit({ id: 'once-hit', kind: 'hit', entityId: 'npc-target', loop: false, startedAt: 1000, durationMs: 400 });
  assert.equal(fx.activeCount, 2);

  const fakeCtx = {
    save() {}, restore() {}, translate() {}, fillRect() {}, strokeRect() {},
    beginPath() {}, arc() {}, stroke() {}, fillText() {},
    set globalAlpha(_) {}, set fillStyle(_) {}, set strokeStyle(_) {}, set lineWidth(_) {}
  };

  // Entity alive: both drawn
  fx.draw(fakeCtx, 'front', null, 1100);
  assert.equal(fx.activeCount, 2);

  // Entity despawns
  entityAlive = false;
  fx.draw(fakeCtx, 'front', null, 1150);

  // The continuous looping effect is purged; the one-shot hit effect survives to finish
  assert.equal(fx.activeCount, 1);
  assert.equal(fx.active[0].id, 'once-hit');
});

test('removeByEntity cleans up continuous looping status effects', () => {
  const fx = new OfficeVfx();
  fx.emit({ id: 's1', kind: 'sleep', entityId: 'npc-bob', loop: true });
  fx.emit({ id: 's2', kind: 'stunned', entityId: 'npc-alice', loop: true });
  assert.equal(fx.activeCount, 2);

  fx.removeByEntity('npc-bob');
  assert.equal(fx.activeCount, 1);
  assert.equal(fx.active[0].entityId, 'npc-alice');
});

test('draw uses drawImage when manifest spritesheet is present and falls back gracefully', () => {
  const fx = new OfficeVfx();
  const drawImageCalls = [];

  const mockImage = {
    complete: true,
    naturalWidth: 128,
    naturalHeight: 32
  };

  fx.manifest = {
    effects: {
      hit: {
        image: 'static/assets/vfx/hit-spark.png',
        pivotPx: { x: 16, y: 16 },
        frames: [
          { x: 0, y: 0, w: 32, h: 32, durationMs: 100 },
          { x: 32, y: 0, w: 32, h: 32, durationMs: 100 }
        ]
      }
    }
  };
  fx.images.set('static/assets/vfx/hit-spark.png', mockImage);

  fx.emit({ id: 'spr-1', kind: 'hit', x: 200, y: 300, startedAt: 1000, durationMs: 200 });

  const fakeCtx = {
    save() {}, restore() {}, translate() {}, fillRect() {}, strokeRect() {},
    beginPath() {}, arc() {}, stroke() {}, fillText() {},
    set globalAlpha(_) {}, set fillStyle(_) {}, set strokeStyle(_) {}, set lineWidth(_) {},
    drawImage(...args) { drawImageCalls.push(args); }
  };

  fx.draw(fakeCtx, 'front', null, 1050);

  // Should have drawn sprite frame 0
  assert.equal(drawImageCalls.length, 1);
  assert.equal(drawImageCalls[0][0], mockImage);
  assert.equal(drawImageCalls[0][1], 0); // frame.x

  // Bad image (not complete / missing): falls back gracefully to drawFallback without throwing
  fx.images.delete('static/assets/vfx/hit-spark.png');
  assert.doesNotThrow(() => {
    fx.draw(fakeCtx, 'front', null, 1060);
  });
});

test('clear resets active effects and seen caches', () => {
  const fx = new OfficeVfx();
  fx.emit({ id: 'e1', kind: 'hit' });
  assert.equal(fx.activeCount, 1);
  assert.equal(fx.seen.size, 1);

  fx.clear();
  assert.equal(fx.activeCount, 0);
  assert.equal(fx.seen.size, 0);
  // After clear, e1 can be emitted again
  assert.equal(fx.emit({ id: 'e1', kind: 'hit' }), true);
});

test('all manifest sprite image files exist on disk with valid PNG headers', () => {
  const manifestPath = path.join(__dirname, '../static/assets/vfx/manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  for (const [key, effect] of Object.entries(manifest.effects)) {
    if (effect.image) {
      const imgPath = path.join(__dirname, '..', effect.image);
      assert.equal(fs.existsSync(imgPath), true, `Image must exist for effect ${key}: ${imgPath}`);
      const header = fs.readFileSync(imgPath).subarray(0, 4).toString('hex');
      assert.equal(header, '89504e47', `Must be valid PNG header for effect ${key}`);
    }
  }
});

test('load handles non-browser environment safely and validates structure', async () => {
  const fx = new OfficeVfx();
  const res = await fx.load('static/assets/vfx/manifest.json');
  assert.equal(typeof res, 'object');
  assert.equal(typeof res.ok, 'boolean');
});
