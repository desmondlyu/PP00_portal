const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function game(hour = 22) {
  let now = new Date(2026,9,24,hour).getTime(); let roll = .1;
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
  const math = Object.create(Math); math.random = () => roll;
  const c = {window:{addEventListener(){}, isPositionBlocked:()=>false}, localStorage:{getItem:()=>null}, Date:Clock, Math:math, console, setTimeout, clearTimeout};
  vm.createContext(c);
  for (const f of ['config','avatars','network']) vm.runInContext(fs.readFileSync(path.join(__dirname,'../static/js',f+'.js'),'utf8'),c);
  const calls=[]; const n=new c.window.EphemeralOfficeNetwork({onGhostScare:until=>calls.push(until)});
  n.clientId='a'; n.localPlayer={id:'a',x:1120,y:840}; n.broadcastPacket=(type,data)=>calls.push({type,...data});
  return {n,calls,setRoll:r=>roll=r,advance:ms=>now+=ms,now:()=>now};
}
test('ghost spawns only at night, including shift boundaries',()=>{
  for(const hour of [0,4,17,23]) assert(game(hour).n.npcPlayers.has('npc_night_ghost'));
  for(const hour of [5,12,16]) assert(!game(hour).n.npcPlayers.has('npc_night_ghost'));
});
test('scare rolls once per ten seconds and applies exactly five seconds',()=>{
  const g=game();g.n.updateGhost(g.now());assert.equal(g.calls.length,0);
  g.advance(10000);g.n.updateGhost(g.now());assert(g.calls.some(p=>p.type==='ghost_scare'&&p.until===g.now()+5000));
  const count=g.calls.length;g.advance(1);g.n.updateGhost(g.now());assert.equal(g.calls.length,count);
  g.setRoll(.5);g.advance(10000);g.n.updateGhost(g.now());assert.equal(g.calls.length,count);
});
test('followers do not independently roll scares or dodge results',()=>{
  const g=game();g.n.clientId='z';g.n.remotePlayers.set('a',{id:'a',x:1120,y:840});
  g.n.updateGhost(g.now());assert.equal(g.calls.length,0);assert.equal(g.n.resolveGhostStrike('a'),undefined);
});
test('ghost frightens guard and bird, clears aggression, and sets escape direction',()=>{
  const g=game();for(const p of g.n.npcPlayers.values()) if(p.isSecurityGuard||p.isBirdCommander){p.x=1140;p.y=840;p.isBerserk=true;}
  g.n.updateGhost(g.now());
  for(const p of g.n.npcPlayers.values()) if(p.isSecurityGuard||p.isBirdCommander){assert(p.isFleeing);assert(!p.isBerserk);assert(p.targetX>p.x);assert.equal(p.ghostScaredUntil,g.now()+5000);}
});
test('60 percent dodge boundary and per-attacker strike cooldown',()=>{
  const g=game();g.setRoll(.599);assert.equal(g.n.resolveGhostStrike('a'),true);
  g.setRoll(.6);assert.equal(g.n.resolveGhostStrike('a'),undefined);g.advance(250);
  assert.equal(g.n.resolveGhostStrike('a'),false);assert(g.n.npcPlayers.get('npc_night_ghost').knockback);
});
