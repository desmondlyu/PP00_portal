const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Round 14: Minion ghost patrol routes cover office rooms, orbit red ghost, and pursue players', () => {
  const networkJs = fs.readFileSync(path.join(__dirname, '../static/js/network.js'), 'utf8');

  // 1. Minion waypoints cover multiple rooms
  assert.ok(networkJs.includes('minionWpsA') && networkJs.includes('minionWpsB'), 'Minions have separate roaming route waypoints');
  assert.ok(networkJs.includes('1695') && networkJs.includes('1360'), 'Minion waypoints cover Lab (1695, 1360)');
  assert.ok(networkJs.includes('2350') && networkJs.includes('350'), 'Minion waypoints cover Tea Room / Pantry (2350, 350)');
  assert.ok(networkJs.includes('410') && networkJs.includes('1450'), 'Minion waypoints cover Meeting Room A (410, 1450)');

  // 2. Minions orbit red ghost
  assert.ok(networkJs.includes('npc.isMinionGhost'), 'network.js has special movement for isMinionGhost');
  assert.ok(networkJs.includes('orbitR = 60'), 'Minions orbit around Red Ghost');

  // 3. Minions pursue nearby players
  assert.ok(networkJs.includes('Math.hypot(p.x - npc.x, p.y - npc.y) <= 200'), 'Minions pursue players within 200px');
});

test('Round 14: Bottom toolbar is centered and action pose dropdown does not overflow screen', () => {
  const css = fs.readFileSync(path.join(__dirname, '../static/css/style.css'), 'utf8');

  // 1. Centered bottom-hud-dock
  assert.ok(css.includes('.bottom-hud-dock {') && css.includes('justify-content: center;'), 'bottom-hud-dock is centered');

  // 2. Action pose dropdown expands leftwards to avoid overflowing off-screen
  assert.ok(css.includes('.action-pose-dropdown {') && css.includes('right: 0;') && css.includes('left: auto;'), 'action-pose-dropdown aligns right: 0 to expand inwards');
});

test('Round 14: Ghost scare fainting animation with dizzy stars and rising soul', () => {
  const avatarsJs = fs.readFileSync(path.join(__dirname, '../static/js/avatars.js'), 'utf8');
  const appJs = fs.readFileSync(path.join(__dirname, '../static/js/app.js'), 'utf8');

  // 1. avatars.js supports isGhostFainted and scared_faint
  assert.ok(avatarsJs.includes('isGhostFainted'), 'avatars.js accepts isGhostFainted parameter');
  assert.ok(avatarsJs.includes("actionState === 'scared_faint'"), 'avatars.js handles scared_faint action state');

  // 2. Dizzy stars and soul VFX
  assert.ok(avatarsJs.includes('💫'), 'avatars.js draws dizzy rotating stars for ghost faint');
  assert.ok(avatarsJs.includes('👻'), 'avatars.js draws ascending soul for ghost faint');

  // 3. app.js sets scared_faint on scare
  assert.ok(appJs.includes("localPlayer.actionState = 'scared_faint'"), 'app.js sets scared_faint upon ghost scare');
  assert.ok(appJs.includes('isGhostFainted:'), 'app.js passes isGhostFainted into drawWackyAvatar');
});
