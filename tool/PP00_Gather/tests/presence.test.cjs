const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function network(callbacks = {}) {
  const context = {window: {addEventListener() {}}, localStorage: {getItem: () => null}, console, Date, Math, setTimeout, clearTimeout};
  vm.createContext(context);
  for (const file of ['config', 'avatars', 'network']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../static/js', file + '.js'), 'utf8'), context);
  return new context.window.EphemeralOfficeNetwork(callbacks);
}
function packet(n, type, player) { n.handleIncomingPacket({nonce: Math.random().toString(), senderId: player.id, type, player}); }
test('join announcement notifies once and state sync does not duplicate it', () => {
  const joins = []; const n = network({onPlayerJoin: p => joins.push(p.id)}); n.broadcastPacket = () => {};
  const p = {id: 'colleague', name: '同事'};
  packet(n, 'join_announce', p); packet(n, 'state_sync', p); packet(n, 'join_announce', p);
  assert.deepEqual(joins, ['colleague']);
});
test('explicit leave removes the player and notifies once', () => {
  const leaves = []; const n = network({onPlayerLeave: p => leaves.push(p.id)}); n.broadcastPacket = () => {};
  const p = {id: 'colleague', name: '同事'};
  packet(n, 'join_announce', p); packet(n, 'leave_announce', p); packet(n, 'leave_announce', p);
  assert.equal(n.remotePlayers.has(p.id), false); assert.deepEqual(leaves, [p.id]);
});
test('late move packets cannot bring a logged-out session back', () => {
  const n = network(); n.broadcastPacket = () => {}; const p = {id: 'colleague', name: '同事'};
  packet(n, 'join_announce', p); packet(n, 'leave_announce', p); packet(n, 'move', p);
  assert.equal(n.remotePlayers.has(p.id), false);
});
test('disconnect sends departure before untracking and closing channels; repeat calls are harmless', async () => {
  const n = network(); n.localPlayer = {id: n.clientId, name: '同事', x: 10, y: 20};
  const calls = [];
  n.broadcastChannel = {postMessage(p) { calls.push(p.type); }, close() { calls.push('close'); }};
  n.isCloudConnected = true;
  n.realtimeChannel = {send: async () => { calls.push('send'); }, untrack: async () => { calls.push('untrack'); }};
  n.supabaseClient = {removeChannel: async () => { calls.push('remove'); }};
  await n.disconnect(); await n.disconnect();
  assert.deepEqual(calls, ['leave_announce', 'send', 'untrack', 'remove', 'close']);
  assert.equal(n.isCloudConnected, false); assert.equal(n.localPlayer, null);
});
test('join is still announced when an early state packet arrives first', () => {
  const joins = []; const n = network({onPlayerJoin: p => joins.push(p.id)}); n.broadcastPacket = () => {};
  const p = {id: 'colleague', name: '同事'};
  packet(n, 'state_sync', p); packet(n, 'join_announce', p); packet(n, 'join_announce', p);
  assert.deepEqual(joins, [p.id]);
});
