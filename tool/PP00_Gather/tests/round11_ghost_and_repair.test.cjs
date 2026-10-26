const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Round 11: Machine repair interruption allows re-repair and handles leaving halfway', async () => {
  const engine = await import('../server/engine.mjs');
  const player = (id = 'p') => ({ id, name: id, unit: 'PP32', exp: 0, season: 2, items: [], effects: {}, x: 1000, y: 350, lastSeen: 1000, connection: id, room: 'PP00' });
  const game = () => ({ players: { p: player() }, enemies: {}, drops: {}, tasks: {}, rate: {} });

  const s = game(), p = s.players.p;
  const t = engine.assets.tasks[0];
  p.x = t.x; p.y = t.y;
  s.broken = { [t.id]: { broken: true, room: p.room } };

  // 1. Start repairing
  engine.act(s, 'p', 'device_start', { target: t.id }, 1000);
  assert.ok(p.channel, 'Channel must be established on device_start');
  assert.equal(p.channel.target, t.id);

  // 2. Player leaves halfway (moved away > 25px)
  p.x += 50;
  // Heartbeat or moving away clears channel without clearing broken status
  engine.act(s, 'p', 'heartbeat', { x: p.x, y: p.y }, 2000);
  assert.equal(p.channel, null, 'Moving away must clear channel');
  assert.equal(s.broken[t.id].broken, true, 'Machine must remain broken when repair is interrupted halfway');

  // 3. Player returns and starts repair again
  p.x = t.x; p.y = t.y;
  engine.act(s, 'p', 'device_start', { target: t.id }, 3000);
  assert.ok(p.channel, 'Player can start second repair after moving away');

  // 4. Complete repair successfully after 3s
  engine.act(s, 'p', 'device_finish', {}, 6100);
  assert.equal(s.broken[t.id].broken, false, 'Machine is successfully repaired after staying for full duration');
  assert.equal(p.exp, 30, 'Repair grants 30 EXP');
});

test('Round 11: Ghost defeat transforms into Red Ghost, spawns 2 minions, and reverts after 1 minute', () => {
  const combatJs = fs.readFileSync(path.join(__dirname, '../static/js/combat.js'), 'utf8');
  const networkJs = fs.readFileSync(path.join(__dirname, '../static/js/network.js'), 'utf8');
  const avatarsJs = fs.readFileSync(path.join(__dirname, '../static/js/avatars.js'), 'utf8');

  // Combat.js triggers transformRedGhost instead of sleep_bed
  assert.ok(combatJs.includes('transformRedGhost'), 'combat.js must invoke transformRedGhost upon ghost defeat');
  assert.ok(combatJs.includes('npc_night_ghost'), 'combat.js must check npc_night_ghost');

  // Avatars.js renders Red Ghost and Minions
  assert.ok(avatarsJs.includes('isRedGhost'), 'avatars.js must support isRedGhost rendering');
  assert.ok(avatarsJs.includes('isMinionGhost'), 'avatars.js must support isMinionGhost rendering');
  assert.ok(avatarsJs.includes('ghost_red'), 'avatars.js must support ghost_red avatar');

  // Network.js ghost transformation logic
  assert.ok(networkJs.includes('transformRedGhost'), 'network.js must define transformRedGhost');
  assert.ok(networkJs.includes('spawnGhostMinions'), 'network.js must define spawnGhostMinions');
  assert.ok(networkJs.includes('npc_ghost_minion_1'), 'network.js must spawn npc_ghost_minion_1');
  assert.ok(networkJs.includes('npc_ghost_minion_2'), 'network.js must spawn npc_ghost_minion_2');

  // 1-minute expiration logic (60000ms)
  assert.ok(networkJs.includes('60000') || networkJs.includes('60 * 1000'), 'network.js must have 60-second red ghost timer');
  assert.ok(networkJs.includes('NPC:恐怖紅色幽靈'), 'Red ghost must be named NPC:恐怖紅色幽靈');
});

test('Round 11: Ghost waypoints include VP office, meeting rooms, director room, lab, restroom, and tea room', () => {
  const networkJs = fs.readFileSync(path.join(__dirname, '../static/js/network.js'), 'utf8');

  // Verify ghost waypoint coordinates cover all rooms
  assert.ok(networkJs.includes('380') && networkJs.includes('350'), 'Ghost waypoints must cover VP office (380, 350)');
  assert.ok(networkJs.includes('410') && networkJs.includes('1450'), 'Ghost waypoints must cover Meeting Room A (410, 1450)');
  assert.ok(networkJs.includes('935') && networkJs.includes('1450'), 'Ghost waypoints must cover Meeting Room B (935, 1450)');
  assert.ok(networkJs.includes('1820') && networkJs.includes('1520'), 'Ghost waypoints must cover Director Room / Lab deep (1820, 1520)');
  assert.ok(networkJs.includes('1695') && networkJs.includes('1360'), 'Ghost waypoints must cover Lab entrance (1695, 1360)');
  assert.ok(networkJs.includes('2255') && networkJs.includes('682'), 'Ghost waypoints must cover Restroom (2255, 682)');
  assert.ok(networkJs.includes('2350') && networkJs.includes('350'), 'Ghost waypoints must cover Tea Room / Pantry (2350, 350)');
});

test('Round 11: Bird Commander 50% night sleep in VP office, quiet behavior, and daytime wakeup', () => {
  const networkJs = fs.readFileSync(path.join(__dirname, '../static/js/network.js'), 'utf8');

  assert.ok(networkJs.includes('isSleepingInVp'), 'network.js must track Bird Commander isSleepingInVp');
  assert.ok(networkJs.includes("actionState = 'sleep_bed'") || networkJs.includes("actionState='sleep_bed'"), 'Bird Commander must sleep in bed');
  assert.ok(networkJs.includes('Math.random() < 0.50'), '50% probability check for night sleep in VP office');
  assert.ok(networkJs.includes('zzz……報告明天再看……') || networkJs.includes('呼嚕……不要叫我開會……zzz'), 'Bird Commander sleep snoring murmur');
  assert.ok(networkJs.includes('bird.isSleepingInVp = false'), 'Bird Commander wakes up when daytime arrives');
});

test('Round 11: Tuned probabilities (Zap anger chase 80%, exchange 50%, cheer drunk 10% / drop 40%)', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '../static/js/app.js'), 'utf8');

  // Zap anger chase 80% (love 20%)
  assert.ok(appJs.includes('Math.random() < 0.20'), 'Zap must have 20% love rate (80% anger chase)');

  // NPC exchange rate tuned to 50%
  assert.ok(appJs.includes('Math.random() < 0.50'), 'NPC exchange acceptance must be tuned to 50%');

  // Cheer drunk 10% and drop 40%
  assert.ok(appJs.includes('Math.random() < 0.10'), 'Cheer drunk rate tuned to 10%');
  assert.ok(appJs.includes('Math.random() < 0.40'), 'Cheer drunk item drop rate tuned to 40%');
});
