const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function game(){let now=100000,roll=.9;const math=Object.create(Math);math.random=()=>roll;const c={window:{isPositionBlocked:()=>false},Math:math,Date:{now:()=>now}};vm.createContext(c);for(const f of ['config','combat'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../static/js',f+'.js'),'utf8'),c);const picked=[],effects=[];const mob={id:'mob_low_yield',uid:'mob_instance_1',isMob:true,name:'怪物',x:0,y:0};const n={clientId:'a',localPlayer:{id:'a',x:0,y:0},remotePlayers:new Map(),npcPlayers:new Map([['npc_aunt',{id:'npc_aunt',name:'阿姨',x:0,y:0}]]),isRoomMaster:()=>true,callbacks:{getMobs:()=>[mob],onCombatPickup:i=>picked.push(i),onCombatDamage:e=>effects.push(e)},broadcastPacket(){}};return {c,h:c.window.OfficeCombat,n,picked,effects,mob,advance:ms=>now+=ms,roll:r=>roll=r};}
test('ordinary NPC needs three hits; loot rolls only on actual defeat and once per life',()=>{const g=game();g.roll(.1);for(let i=0;i<2;i++){g.h.strike(g.n,'a','npc_aunt');g.advance(300);}assert.equal(g.n.combat.enemies.npc_aunt.hp,1);assert.equal(g.n.combat.items.length,0);g.h.strike(g.n,'a','npc_aunt');assert.equal(g.n.combat.items.length,1);g.advance(300);g.h.strike(g.n,'a','npc_aunt');assert.equal(g.n.combat.items.length,1);});
test('drop probability is strictly below 30 percent; tiers offer stronger pools',()=>{const g=game();g.roll(.30);for(let i=0;i<3;i++){g.h.strike(g.n,'a','npc_aunt');g.advance(300);}assert.equal(g.n.combat.items.length,0);assert.equal(g.h.tier({id:'npc_vp_boss'}),3);assert.equal(g.h.tier({id:'guard',isSecurityGuard:true}),2);assert.equal(g.h.health({id:'bird',isBirdCommander:true}),6);});
test('mob health uses unique instance ids, and duplicate claims grant only one item',()=>{const g=game();g.roll(.1);g.h.strike(g.n,'a',g.mob.uid);g.advance(300);g.h.strike(g.n,'a',g.mob.uid);assert.equal(g.n.combat.items.length,1);const uid=g.n.combat.items[0].uid;for(let i=0;i<2;i++)g.h.send(g.n,'combat_claim',{uid});assert.equal(g.picked.length,1);assert.equal(g.n.combat.items.length,0);});
test('drop and stun roll independently with a two-second hit protection',()=>{const g=game();let r=[.1,.9];g.c.Math.random=()=>r.shift();g.h.damage(g.n,'a');assert.equal(g.effects[0].drop,true);assert.equal(g.effects[0].stun,false);g.h.damage(g.n,'a');assert.equal(g.effects.length,1);g.advance(2000);r=[.9,.1];g.h.damage(g.n,'a');assert.equal(g.effects[1].drop,false);assert.equal(g.effects[1].stun,true);});
test('dropped item retains durability and can only be deposited once per damage event',()=>{const g=game();g.roll(.1);g.h.damage(g.n,'a');const id=g.effects[0].id;for(let i=0;i<2;i++)g.h.send(g.n,'combat_drop',{effectId:id,item:{id:'bench',durability:1,maxDurability:3,power:32}});assert.equal(g.n.combat.items.length,1);assert.equal(g.n.combat.items[0].durability,1);assert.equal(g.n.combat.items[0].power,32);});
test('non-master never rolls combat and rejects spoofed state',()=>{const g=game();g.n.isRoomMaster=()=>false;g.h.strike(g.n,'a','npc_aunt');assert.equal(g.n.combat,undefined);g.h.packet(g.n,{type:'combat_state',senderId:'z',state:{}});assert.equal(g.n.combat,undefined);});

test('recovery assignments use distinct unobstructed positions inside meeting room B',()=>{
  const g=game();
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../static/js/world.js'),'utf8'),g.c);
  for(const id of ['a','b','c','d']){
    if(id!=='a')g.n.remotePlayers.set(id,{id,x:0,y:0,isInjured:true});
    g.h.packet(g.n,{type:'recovery_request',senderId:id,until:120000});
  }
  const spots=Object.values(g.n.combat.recovery);assert.equal(spots.length,4);
  for(let i=0;i<spots.length;i++){
    const p=spots[i];assert(p.x>=740&&p.x<=1130&&p.y>=1350&&p.y<=1750);
    assert(!g.c.window.isPositionBlocked(p.x,p.y,26));
    for(let j=0;j<i;j++)assert(Math.hypot(p.x-spots[j].x,p.y-spots[j].y)>=62);
  }
  g.h.packet(g.n,{type:'recovery_release',senderId:'a'});assert(!g.n.combat.recovery.a);
});

test('costume rolls independently at five percent on defeat, never on ordinary hit',()=>{
 const g=game();for(const f of ['avatars','wardrobe'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../static/js',f+'.js'),'utf8'),g.c);
 g.roll(.9);g.h.strike(g.n,'a','npc_aunt');g.advance(300);g.h.strike(g.n,'a','npc_aunt');assert.equal(g.n.combat.items.length,0);g.advance(300);
 let rolls=[.9,.9,.049,.0];g.c.Math.random=()=>rolls.shift()??.9;g.h.strike(g.n,'a','npc_aunt');assert.equal(g.n.combat.items.length,1);assert.equal(g.n.combat.items[0].category,'outfit');assert.equal(g.n.combat.items[0].durability,5);
});
test('NPC clothing damage has forty percent boundary; PvP does not damage clothes',()=>{
 const g=game();g.roll(.399);g.h.damage(g.n,'a');assert.equal(g.effects[0].outfitDamage,true);g.advance(2000);g.roll(.4);g.h.damage(g.n,'a');assert.equal(g.effects[1].outfitDamage,false);g.advance(2000);g.roll(0);g.h.damage(g.n,'a',false);assert.equal(g.effects[2].outfitDamage,false);
});
test('full inventory cannot claim a shared ground drop',()=>{
 const g=game();for(const f of ['avatars','wardrobe'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../static/js',f+'.js'),'utf8'),g.c);
 g.n.localPlayer.inventory=Array.from({length:10},(_,i)=>({id:'i'+i,category:'weapon',durability:1,maxDurability:3}));g.n.localPlayer.equippedSlots=[{},{},{}];g.roll(.1);for(let i=0;i<3;i++){g.h.strike(g.n,'a','npc_aunt');g.advance(300);}const uid=g.n.combat.items[0].uid;g.h.send(g.n,'combat_claim',{uid});assert.equal(g.n.combat.items.length,1);assert.equal(g.picked.length,0);
});
test('exactly five percent does not drop a costume',()=>{
 const g=game();for(const f of ['avatars','wardrobe'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../static/js',f+'.js'),'utf8'),g.c);
 g.roll(.9);for(let i=0;i<2;i++){g.h.strike(g.n,'a','npc_aunt');g.advance(300);}let rolls=[.9,.9,.05];g.c.Math.random=()=>rolls.shift()??.9;g.h.strike(g.n,'a','npc_aunt');assert.equal(g.n.combat.items.length,0);
});
test('duplicate combat state does not repeat costume damage effect',()=>{
 const g=game();g.roll(.1);g.h.damage(g.n,'a');const snapshot=g.n.combat;g.h.packet(g.n,{type:'combat_state',senderId:'a',state:snapshot});assert.equal(g.effects.length,1);assert.equal(g.effects[0].outfitDamage,true);
});
test('every hit and dodge publishes a timed reaction for master and remote viewers',()=>{
 const g=game(),e=g.n.npcPlayers.get('npc_aunt');e.isSecurityGuard=true;
 g.roll(.1);g.h.strike(g.n,'a',e.id);assert.equal(g.n.combat.enemies[e.id].reaction.kind,'dodge');assert.equal(e.combatReaction.kind,'dodge');
 const remote=game();remote.n.clientId='z';remote.n.remotePlayers.set('a',{id:'a'});remote.n.isRoomMaster=()=>false;
 remote.h.packet(remote.n,{type:'combat_state',senderId:'a',state:JSON.parse(JSON.stringify(g.n.combat))});assert.equal(remote.n.npcPlayers.get(e.id).combatReaction.kind,'dodge');
 g.advance(300);g.roll(.9);g.h.strike(g.n,'a',e.id);assert.equal(e.combatReaction.kind,'hit');const pose=g.h.reactionPose(e,100400);assert(pose.jump>0);assert.notEqual(pose.x,0);
 assert.equal(g.h.reactionPose(e,101000).jump,0);
});
test('final defeat keeps an impact animation even though physical knockback stops',()=>{
 const g=game(),e=g.n.npcPlayers.get('npc_aunt');for(let i=0;i<3;i++){g.h.strike(g.n,'a',e.id);g.advance(300);}assert.equal(g.n.combat.enemies[e.id].hp,0);assert.equal(e.combatReaction.kind,'defeat');assert(g.h.reactionPose(e,100800).jump>0);
});
