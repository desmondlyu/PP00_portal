const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Round 9: Scheme A mobile RPG action bar dock markup and styles', () => {
  const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '../static/css/style.css'), 'utf8');

  // Verify Scheme A structure
  assert.ok(indexHtml.includes('id="bottomCenterCommandDock" class="bottom-center-command-dock"'));
  assert.ok(indexHtml.includes('id="combatActionCluster" class="combat-action-cluster"'));
  assert.ok(indexHtml.includes('class="combat-main-attack-btn"'));
  assert.ok(indexHtml.includes('class="skill-btn skill-tile-btn"'));

  // Verify CSS classes
  assert.ok(css.includes('.combat-action-cluster'));
  assert.ok(css.includes('.combat-main-attack-btn'));
  assert.ok(css.includes('.skill-tile-btn'));
  assert.ok(css.includes('.arcade-rps-dialog'));
  assert.ok(css.includes('.slot-reel-box'));
});

test('Round 9: Server engine handles lounge_game action for win (+15 EXP + supply item) and lose (-10 EXP)', async () => {
  const engineModule = await import('../server/engine.mjs');
  const { act } = engineModule;

  const state = {
    players: {
      p1: {
        id: 'p1',
        connection: 'conn1',
        name: 'Tester',
        room: 'PP00',
        exp: 100,
        items: [],
        effects: {},
        lastSeen: Date.now(),
      }
    },
    drops: {},
    enemies: {},
    tasks: {}
  };

  // Test win
  const winRes = act(state, 'p1', 'lounge_game', { outcome: 'win' });
  assert.ok(winRes.item, 'Win should grant an item');
  assert.ok(state.players.p1.exp > 100, 'Exp should increase by 15');
  assert.ok(['pizza','boba','coffee','duck','ic_pkg','wrench','keyboard','bench'].includes(winRes.item.id));
  assert.ok(winRes.item.category !== 'outfit', 'Prize item should not be an outfit');

  // Test lose
  const curExp = state.players.p1.exp;
  const loseRes = act(state, 'p1', 'lounge_game', { outcome: 'lose' });
  assert.equal(loseRes.lostExp, 10);
  assert.equal(state.players.p1.exp, curExp - 10, 'Exp should decrease by 10');
});

test('Round 9: Server world tick triggers hurt on NPC/mob player proximity', async () => {
  const engineModule = await import('../server/engine.mjs');
  const { world } = engineModule;

  const state = {
    players: {
      p1: {
        id: 'p1',
        connection: 'conn1',
        name: 'Tester',
        room: 'PP00',
        x: 100,
        y: 100,
        exp: 200,
        items: [],
        effects: {},
        lastSeen: Date.now(),
      }
    },
    drops: {},
    enemies: {
      mob_1: {
        id: 'mob_1',
        role: 'mob',
        x: 110,
        y: 110,
        hp: 3,
        maxHp: 3,
        room: 'PP00'
      }
    },
    tasks: {}
  };

  const now = Date.now();
  // World tick with seeded RNG that rolls light injury (0.10)
  world(
    state,
    state.players.p1,
    {
      enemies: [
        { id: 'mob_1', x: 110, y: 110, attacking: true }
      ]
    },
    now,
    () => 0.10
  );
  assert.ok(state.players.p1.effects.lastHurt, 'Player should be hurt by nearby mob');
  assert.ok(state.players.p1.effects.lightUntil > now, 'Light injury should be applied to player');
});
