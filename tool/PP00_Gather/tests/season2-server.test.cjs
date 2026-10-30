const {test}=require('node:test'),assert=require('node:assert/strict');
async function engine(){try{return await import('../server/engine.mjs');}catch(e){if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;}}
const player=(id='p')=>({id,name:id,unit:'PP32',exp:0,season:2,items:[],effects:{},x:1000,y:350,lastSeen:1000,connection:id,room:'PP00'});
const game=()=>({players:{p:player(),q:player('q')},enemies:{},drops:{},tasks:{},rate:{},lastSpawn:{PP00:1000000000000}});
test('server rejects client XP writes and signs in at Taiwan midnight only once',async()=>{const E=await engine();assert.equal(typeof E.act,'function','server missing');let s=game();assert.throws(()=>E.act(s,'p','set_exp',{exp:9999},1000),/不支援/);s.players.p.lastLoginDate='1970-01-01';E.act(s,'p','signin',{},86400000);assert.equal(s.players.p.exp,50);E.act(s,'p','signin',{},86400000);assert.equal(s.players.p.exp,50);});
test('server RMA claims are exclusive and completion awards once',async()=>{const E=await engine();assert.ok(E.act);const s=game();s.players.q.x=1000;E.act(s,'p','rma_claim',{},1000,()=>0);assert.throws(()=>E.act(s,'q','rma_claim',{},1000),/搶修/);const t=s.tasks.PP00;assert.equal(t.targets.length,3);for(let i=0;i<3;i++){const cur=t.targets[i];s.players.p.x=cur.x;s.players.p.y=cur.y;E.act(s,'p','rma_start',{},1000+i*4000);E.act(s,'p','rma_finish',{},1000+i*4000+3100);}assert.equal(t.stage,'reporting');assert.equal(s.players.p.exp,60);s.players.p.x=998;s.players.p.y=350;E.act(s,'p','rma_report',{},20000,()=>0);assert.equal(s.players.p.exp,210);assert.equal(s.players.p.items.length,1);assert.throws(()=>E.act(s,'p','rma_report',{},21000),/尚未|任務/);});
test('gacha cancellation retains materials and repeat result repairs without exceeding capacity',async()=>{const E=await engine();assert.ok(E.act);const s=game(),p=s.players.p;p.x=1960;p.y=350;p.items=[{uid:'a',id:'pizza',category:'weapon',durability:3},{uid:'b',id:'coffee',category:'weapon',durability:3}];E.act(s,'p','gacha',{materials:['a','b']},1000,()=>0);assert.equal(p.items.length,1);assert.equal(p.items[0].category,'outfit');assert.equal(p.items[0].durability,5);assert.equal(p.exp,0);});
test('shield absorbs one complete hit and third hunt hit has only one penalty',async()=>{const E=await engine();assert.ok(E.act);const s=game(),p=s.players.p;p.exp=300;p.effects.shieldUntil=100000;E.hurt(s,p,'npc',1000,()=>0);assert.equal(p.exp,300);assert.equal(p.effects.shieldUntil,0);E.hurt(s,p,'hunt',4000,()=>.9);E.hurt(s,p,'hunt',7000,()=>.9);E.hurt(s,p,'hunt',10000,()=>.9);assert.equal(p.exp,180);assert.ok(p.effects.injuredUntil>10000);});
test('server combat resolves defeat once and busy bosses cannot repeatedly kidnap',async()=>{const E=await engine();assert.equal(typeof E.strike,'function','combat missing');const s=game(),p=s.players.p;p.x=380;p.y=310;s.enemies.b={id:'b',role:'vp',x:400,y:310,hp:2,maxHp:2,room:'PP00'};E.strike(s,p,'b',1000,()=>.1);assert.equal(p.exp,0);assert.ok(p.effects.lockedUntil);assert.equal(p.effects.injuredUntil,undefined);assert.equal(s.enemies.b.hp,1);});
test('opaque auth sessions isolate same names by department and reject takeover tokens',async()=>{const E=await import('../server/service.mjs').catch(()=>({}));assert.equal(typeof E.request,'function','auth service missing');const s={players:{},enemies:{},drops:{},tasks:{},rate:{}};let n=1000;const body={name:'Tony',unit:'PP32',pin:'987654',avatarId:'office_1',connection:'c1'};const r=await E.request(s,'register',body,'',n,'source');assert.ok(r.token);const q=await E.request(s,'register',{...body,unit:'PP31'},'',n,'source');assert.notEqual(r.player.id,q.player.id);await assert.rejects(E.request(s,'snapshot',{},'bad',n,'source'),/登入/);const again=await E.request(s,'login',{...body,connection:'c2'},'',n,'source');await assert.rejects(E.request(s,'snapshot',{},r.token,n,'source'),/登入/);assert.ok(again.token);});
test('pending gacha cancellation and expiry preserve all assets',async()=>{const E=await engine();const s=game(),p=s.players.p;p.x=1963;p.y=350;const clothes=E.assets.items.filter(i=>i.category==='outfit');p.items=clothes.slice(1,4).map((m,i)=>({...m,uid:'o'+i,durability:3})).concat([{uid:'a',id:'pizza',category:'weapon',durability:3},{uid:'b',id:'coffee',category:'weapon',durability:3}]);const before=JSON.stringify(p.items);E.act(s,'p','gacha',{materials:['a','b']},1000,()=>0);assert.ok(p.pending);assert.equal(JSON.stringify(p.items),before);E.act(s,'p','gacha_cancel',{},2000);assert.equal(JSON.stringify(p.items),before);E.act(s,'p','gacha',{materials:['a','b']},3000,()=>0);E.act(s,'p','heartbeat',{x:p.x,y:p.y},64000);assert.equal(p.pending,null);assert.equal(JSON.stringify(p.items),before);});
test('materials cannot consume worn outfits, equipped weapons or duplicate instances',async()=>{const E=await engine();const s=game(),p=s.players.p;p.x=1963;p.y=350;p.items=[{uid:'a',id:'pizza',category:'weapon',slot:0},{uid:'o',id:'outfit_boba_head',category:'outfit'}];assert.throws(()=>E.act(s,'p','gacha',{materials:['a','o']},1000),/材料/);assert.throws(()=>E.act(s,'p','gacha',{materials:['a','a']},1000),/不同/);});
test('moving cancels a channel; a shield cannot exempt boss discipline',async()=>{const E=await engine();const s=game(),p=s.players.p;p.x=1238;p.y=350;E.act(s,'p','lounge_start',{},1000);E.act(s,'p','heartbeat',{x:1238,y:390},2000);assert.equal(p.channel,null);assert.throws(()=>E.act(s,'p','facility_finish',{},7000),/中斷/);p.x=380;p.y=310;p.effects.shieldUntil=100000;s.enemies.b={id:'b',role:'vp',x:400,y:310,hp:3,maxHp:3,room:'PP00'};E.strike(s,p,'b',8000,()=>.1);assert.equal(p.effects.lockedUntil,16000);assert.equal(p.effects.shieldUntil,100000);});
test('two simultaneous recovery cases use separate clear seats and rescue awards once',async()=>{const E=await engine();const s=game();E.hurt(s,s.players.p,'npc',1000,()=>0);E.hurt(s,s.players.q,'npc',1000,()=>0);assert.notDeepEqual([s.players.p.x,s.players.p.y],[s.players.q.x,s.players.q.y]);const helper=player('h');s.players.h=helper;helper.x=s.players.p.x;helper.y=s.players.p.y;E.act(s,'h','heal_start',{target:'p'},2000);E.act(s,'h','heal_finish',{},8000);assert.equal(helper.exp,50);assert.throws(()=>E.act(s,'h','heal_finish',{},9000),/急救/);});
test('ordinary equipment repair awards fixed XP once after a timed repair',async()=>{const E=await engine();const s=game(),p=s.players.p;const t=E.assets.tasks[0];p.x=t.x;p.y=t.y;s.broken={[t.id]:{broken:true,room:p.room}};E.act(s,'p','device_start',{target:t.id},1000);assert.throws(()=>E.act(s,'p','device_finish',{},2000),/時間/);E.act(s,'p','device_finish',{},4100);assert.equal(p.exp,30);assert.equal(s.broken[t.id].broken,false);assert.throws(()=>E.act(s,'p','device_start',{target:t.id},5000),/故障/);});
test('ten bag storage items count toward capacity independently of equipped slots',async()=>{const E=await engine();const s=game(),p=s.players.p;p.items=Array.from({length:13},(_,i)=>({uid:'i'+i,id:'wrench',category:'weapon',slot:i<3?i:null}));s.drops.d={uid:'d',id:'pizza',category:'item',source:'world',x:p.x,y:p.y};assert.throws(()=>E.act(s,'p','pickup',{uid:'d'},1000),/背包/);});
test('real snack catalog items can pay for gacha',async()=>{const E=await engine();const s=game(),p=s.players.p;p.x=1963;p.y=350;p.items=['pizza','coffee'].map((id,i)=>({...E.assets.items.find(m=>m.id===id),uid:'i'+i,durability:2,slot:null}));E.act(s,'p','gacha',{materials:['i0','i1']},1000,()=>0);assert.equal(p.items.length,1);assert.equal(p.items[0].category,'outfit');});
test('pending materials cannot be equipped, damage cancels pending and confirmation revalidates',async()=>{const E=await engine();const s=game(),p=s.players.p;p.x=1963;p.y=350;p.items=E.assets.items.filter(i=>i.category==='outfit').slice(1,4).map((m,i)=>({...m,uid:'o'+i,durability:3})).concat(['wrench','bench'].map((id,i)=>({...E.assets.items.find(m=>m.id===id),uid:'m'+i,durability:3})));E.act(s,'p','gacha',{materials:['m0','m1']},1000,()=>0);assert.throws(()=>E.act(s,'p','equip',{uid:'m0'},1100),/保留/);E.hurt(s,p,'npc',2000,()=>.9);assert.equal(p.pending,null);assert.throws(()=>E.act(s,'p','gacha_confirm',{replace:'o0'},3000),/結束/);});
test('damage and logout cancel healing channels',async()=>{const E=await engine();const s=game(),p=s.players.p,q=s.players.q;p.x=q.x=900;p.y=q.y=1350;q.effects.injuredUntil=300000;E.act(s,'p','heal_start',{target:'q'},1000);E.hurt(s,p,'npc',2000,()=>.9);assert.equal(p.channel,null);assert.throws(()=>E.act(s,'p','heal_finish',{},8000),/中斷/);E.act(s,'p','heal_start',{target:'q'},9000);E.act(s,'p','logout',{},10000);assert.equal(p.channel,null);});
test('RMA never chooses equipment already in fault state',async()=>{const E=await engine();const s=game();s.broken=Object.fromEntries(E.assets.tasks.map(t=>[t.id,{broken:true,room:'PP00'}]));assert.throws(()=>E.act(s,'p','rma_claim',{},1000,()=>0),/設備/);});
test('receipt authorization denies revoked sessions and narrowly permits lost resume recovery',async()=>{const E=await import('../server/service.mjs');assert.equal(typeof E.canReplay,'function','receipt auth missing');const s={players:{},rate:{}};const a=await E.request(s,'register',{name:'Receipt',unit:'PP32',pin:'193812',connection:'r'},'',1000,'src');const requestId='recovery';const b=await E.request(s,'resume',{connection:'r2',requestId},a.token,2000,'src');const meta={playerId:b.player.id,generation:s.players[b.player.id].generation};assert.equal(await E.canReplay(s,'snapshot',a.token,'old',meta,2100),false);assert.equal(await E.canReplay(s,'resume',a.token,requestId,meta,2100),true);assert.equal(await E.canReplay(s,'resume',a.token,requestId,meta,33000),false);await E.request(s,'logout',{},b.token,2500,'src');assert.equal(await E.canReplay(s,'resume',a.token,requestId,meta,2600),false);});
test('weapon and snack equipment grants only server-calculated XP bonus',async()=>{const E=await engine();const s=game(),p=s.players.p;p.items=[{...E.assets.items.find(m=>m.id==='keyboard'),uid:'key',slot:0}];s.drops.d={...E.assets.items.find(m=>m.id==='pizza'),uid:'d',x:p.x,y:p.y,source:'world'};E.act(s,'p','pickup',{uid:'d'},1000);assert.equal(p.exp,18);});

test('pickup accepts interaction range but rejects items across furniture',async()=>{
 const E=await engine(),s=game(),p=s.players.p;p.x=1000;p.y=350;
 s.drops.near={...E.fresh('pizza'),uid:'near',x:1075,y:350,room:'PP00'};
 E.act(s,'p','pickup',{uid:'near'},100000);assert.equal(p.items.length,1);
 p.x=1630;p.y=200;s.drops.wall={...E.fresh('coffee'),uid:'wall',x:1710,y:200,room:'PP00'};
 assert.throws(()=>E.act(s,'p','pickup',{uid:'wall'},100001),/距離|障礙/);
});
test('ambient supplies retain twenty-minute two-item batches',async()=>{
 const E=await engine(),s=game(),p=s.players.p;s.players.q.lastSeen=0;p.lastSeen=1200000;s.lastSpawn={PP00:0};
 E.world(s,p,{},1199999,()=>.5);assert.equal(Object.keys(s.drops).length,0);
 E.world(s,p,{},1200000,()=>.5);assert.equal(Object.keys(s.drops).length,2);
 E.world(s,p,{},1230000,()=>.5);assert.equal(Object.keys(s.drops).length,2);
});
test('NPC loot remains thirty percent only on defeat, clothing independently five percent',async()=>{
 const E=await engine();
 for(const [roll,count]of [[.299,1],[.30,0],[.049,2],[.05,1]]){
  const s=game(),p=s.players.p;s.enemies.mob_test={id:'mob_test',role:'mob',tier:1,hp:2,maxHp:2,x:1050,y:350,room:'PP00'};
  E.strike(s,p,'mob_test',100000,()=>roll);assert.equal(Object.keys(s.drops).length,0);
  E.strike(s,p,'mob_test',100400,()=>roll);assert.equal(Object.keys(s.drops).length,count);
 }
});
test('request can move and pick up atomically without a preceding heartbeat',async()=>{
 const E=await engine(),S=await import('../server/service.mjs'),s=game(),p=s.players.p,token='atomic-pickup';p.tokenHash=await S.digest(token);p.sessionUntil=99999999;p.x=1500;p.y=520;
 s.drops.a={...E.fresh('coffee'),uid:'a',x:1075,y:520,room:'PP00'};
 const result=await S.request(s,'pickup',{uid:'a',pose:{x:1000,y:520}},token,100000);assert.equal(result.player.x,1000);assert(result.player.items.some(i=>i.id==='coffee'));
});
test('heartbeat can include master world update but ignores it after losing leadership',async()=>{
 const S=await import('../server/service.mjs'),s=game(),p=s.players.p,token='poll';p.tokenHash=await S.digest(token);p.sessionUntil=99999999;p.lastSeen=100000;s.players.q.lastSeen=0;
 await S.request(s,'heartbeat',{x:1000,y:520,world:{enemies:[{id:'npc_security_guard',x:1050,y:520}]}},token,100000);assert(s.enemies.npc_security_guard);
 s.players.q.lastSeen=100001;s.players.q.connection='a';p.connection='z';
 await S.request(s,'heartbeat',{x:1000,y:520,world:{enemies:[{id:'npc_ghost',x:1050,y:520}]}},token,100001);assert(!s.enemies.npc_ghost);
});
test('ambient cap is four and expired or timestamp-less generated loot cannot accumulate forever',async()=>{
 const E=await engine(),s=game(),p=s.players.p;p.lastSeen=1200000;s.players.q.lastSeen=0;s.lastSpawn={PP00:0};
 for(let i=0;i<3;i++)s.drops['a'+i]={...E.fresh('coffee'),room:'PP00',source:'world',origin:'ambient',createdAt:1199999};
 E.world(s,p,{},1200000,()=>.9);assert.equal(Object.keys(s.drops).length,4);
 s.drops.loot={...E.fresh('pizza'),room:'PP00',source:'world'};
 E.world(s,p,{},1200001,()=>.9);assert.equal(s.drops.loot.createdAt,1200001);
 p.lastSeen=3000002;E.world(s,p,{},3000002,()=>.9);assert(!s.drops.loot);
});
test('defeated mobs never auto-resurrect from a stale master packet',async()=>{
 const E=await engine(),s=game(),p=s.players.p;s.players.q.lastSeen=0;p.lastSeen=500000;
 s.enemies.mob_dead={id:'mob_dead',role:'mob',mob:true,room:'PP00',hp:0,maxHp:2,until:100000,defeatedAt:1000,lastSeen:1000,x:1000,y:520};
 E.world(s,p,{enemies:[{id:'mob_dead',x:1000,y:520}]},500000,()=>.9);assert(!s.enemies.mob_dead||s.enemies.mob_dead.hp===0);
 E.world(s,p,{enemies:[{id:'mob_dead',x:1000,y:520}]},500001,()=>.9);assert(!s.enemies.mob_dead||s.enemies.mob_dead.hp===0);
});
test('server alone rolls mob birth at 0.1 percent, max one, five-minute defeat cooldown',async()=>{
 const E=await engine(),s=game(),p=s.players.p;s.players.q.lastSeen=0;p.lastSeen=10000;
 E.world(s,p,{enemies:[{id:'mob_forged',x:1000,y:520}]},10000,()=>.9);assert(!s.enemies.mob_forged);
 E.world(s,p,{},11000,()=>.001);assert.equal(Object.values(s.enemies).filter(e=>e.mob).length,0);
 E.world(s,p,{},12000,()=>.0009);let mobs=Object.values(s.enemies).filter(e=>e.mob);assert.equal(mobs.length,1);
 E.world(s,p,{},13000,()=>0);assert.equal(Object.values(s.enemies).filter(e=>e.mob&&e.hp>0).length,1);
 const e=mobs[0];e.x=1050;e.y=350;e.hp=1;E.strike(s,p,e.id,14000,()=>.9);
 p.lastSeen=20000;E.world(s,p,{},20000,()=>0);assert.equal(Object.values(s.enemies).filter(e=>e.mob&&e.hp>0).length,0);
 p.lastSeen=315000;E.world(s,p,{},315000,()=>0);assert.equal(Object.values(s.enemies).filter(e=>e.mob&&e.hp>0).length,1);
});
test('guard defeats nearby server mob once without player loot or XP; dead mobs cannot be farmed',async()=>{
 const E=await engine(),s=game(),p=s.players.p;s.players.q.lastSeen=0;p.lastSeen=100000;s.enemies.mob_guard={id:'mob_guard',role:'mob',mob:true,room:'PP00',hp:2,maxHp:2,x:1040,y:350,lastSeen:100000};
 E.world(s,p,{enemies:[{id:'npc_security_guard',x:1000,y:350},{id:'mob_guard',x:1040,y:350}]},100000,()=>.9);
 assert.equal(s.enemies.mob_guard.hp,0);assert.equal(p.exp,0);assert.equal(Object.keys(s.drops).length,0);
 E.strike(s,p,'mob_guard',500000,()=>0);assert.equal(p.exp,0);assert.equal(Object.keys(s.drops).length,0);
});
test('off-shift stale NPC records cannot be attacked for invisible loot',async()=>{const E=await engine(),s=game(),p=s.players.p;s.enemies.old={id:'old',role:'vp',tier:3,hp:1,maxHp:6,room:'PP00',x:1050,y:350,lastSeen:1000};E.strike(s,p,'old',100000,()=>0);assert.equal(s.enemies.old.hp,1);assert.equal(p.exp,0);assert.equal(Object.keys(s.drops).length,0);});
test('six-character enter creates or resumes one cloud-only account and ignores legacy assets',async()=>{
 const S=await import('../server/service.mjs'),s={players:{},rate:{},enemies:{},drops:{},tasks:{}};
 await assert.rejects(S.request(s,'enter',{name:'Fresh',unit:'PP32',pin:'1234'},'',1000,'src'),/六碼/);
 const b={name:'Fresh',unit:'PP32',pin:'Ab1234',connection:'a',legacy:[{id:'coffee',durability:3}]},first=await S.request(s,'enter',b,'',2000,'src');assert.equal(first.player.items.length,0);assert.equal(first.player.exp,0);
 const again=await S.request(s,'enter',{...b,connection:'b'},'',3000,'src');assert.equal(again.player.id,first.player.id);assert.equal(Object.keys(s.players).length,1);
 await assert.rejects(S.identify(s,first.token,3000),/登入/);
 const bad=await S.request(s,'enter',{...b,pin:'ab1234'},'',3100,'src');assert(bad.error);
});
test('master attack synchronizes current target positions without an extra heartbeat round trip',async()=>{
 const E=await engine(),S=await import('../server/service.mjs'),s=game(),p=s.players.p,token='master-fresh';p.tokenHash=await S.digest(token);p.sessionUntil=999999;p.lastSeen=10000;s.players.q.lastSeen=0;p.items=[{...E.fresh('pizza'),slot:0}];p.activeSlot=0;
 s.enemies.mob_fast={id:'mob_fast',role:'mob',mob:true,hp:2,maxHp:2,room:'PP00',x:700,y:520,lastSeen:9000};
 const r=await S.request(s,'attack',{pose:{x:1000,y:520},targets:['mob_fast'],world:{enemies:[{id:'mob_fast',x:1060,y:520}]}},token,10000);
 assert.equal(r.enemies.mob_fast.hp,1);assert.equal(r.enemies.mob_fast.reaction.kind,'hit');
});

test('toilet claims are exclusive, seat remains fixed through heartbeat, release and timeout unlock',async()=>{
 const E=await engine(),s=game(),p=s.players.p,q=s.players.q;
 p.x=q.x=2442;p.y=q.y=879;
 E.act(s,'p','toilet_enter',{stall:'wc_3'},1000);
 assert.deepEqual([p.x,p.y,p.action,p.stall],[2595,878,'toilet','wc_3']);
 assert.throws(()=>E.act(s,'q','toilet_enter',{stall:'wc_3'},1001),/有人/);
 E.act(s,'p','heartbeat',{x:2442,y:879,action:'toilet'},1002);
 assert.deepEqual([p.x,p.y],[2595,878]);
 assert.equal(E.snapshot(s,'q',1003).stalls.wc_3,'p');
 E.act(s,'p','toilet_exit',{},1004);assert.equal(p.stall,null);assert.equal(p.action,null);
 E.act(s,'q','toilet_enter',{stall:'wc_3'},1005);
 p.x=2442;p.y=879;E.act(s,'p','toilet_enter',{stall:'wc_3'},37000);
 assert.equal(p.stall,'wc_3');
 E.act(s,'p','logout',{},37001);assert.equal(E.snapshot(s,'q',37002).stalls.wc_3,undefined);
});
test('toilet entry rejects distant players and arbitrary toilet poses cannot acquire a lock',async()=>{
 const E=await engine(),s=game();assert.throws(()=>E.act(s,'p','toilet_enter',{stall:'wc_4'},1000),/靠近/);
 E.act(s,'p','heartbeat',{x:1000,y:350,action:'toilet'},1001);assert.equal(s.players.p.action,null);
});

test('weapon durability zero automatically refills from backpack inventory', async () => {
  const E = await engine();
  const s = game(), p = s.players.p;
  p.x = 1000; p.y = 350;
  p.items = [
    { uid: 'w1', id: 'keyboard', category: 'weapon', durability: 1, slot: 0 },
    { uid: 'w2', id: 'wrench', category: 'weapon', durability: 3, slot: null },
    { uid: 'o1', id: 'outfit_frog_eng', category: 'outfit', durability: 5, slot: null }
  ];
  p.activeSlot = 0;
  s.enemies.mob = { id: 'mob', role: 'mob', tier: 1, hp: 5, maxHp: 5, x: 1050, y: 350, room: 'PP00' };
  E.combat(s, p, {}, 1000, () => 0.5);
  assert.equal(p.items.some(i => i.uid === 'w1'), false);
  const equipped = p.items.find(i => i.slot === 0);
  assert.ok(equipped);
  assert.equal(equipped.uid, 'w2');
});

test('bare-handed attack works with 1s cooldown and 10 hits to repel without weapon', async () => {
  const E = await engine();
  const s = game(), p = s.players.p;
  p.items = [];
  s.enemies.mob = { id: 'mob', role: 'mob', x: p.x + 30, y: p.y, hp: 2, maxHp: 2, room: 'PP00', mob: true };
  E.combat(s, p, {}, 1000);
  assert.equal(p.lastAttack?.emoji, '👊');
  assert.equal(s.enemies.mob.fistHits, 1);
  E.combat(s, p, {}, 1500); // 500ms < 1000ms cooldown
  assert.equal(s.enemies.mob.fistHits, 1);
  E.combat(s, p, {}, 2050); // 1050ms >= 1000ms cooldown
  assert.equal(s.enemies.mob.fistHits, 2);
  for (let i = 3; i <= 10; i++) {
    E.combat(s, p, {}, 2050 + (i - 2) * 1050);
  }
  assert.equal(s.enemies.mob.hp, 0);
  assert.equal(s.enemies.mob.reaction.kind, 'defeat');
});

test('storage bag full at 10 items stacks gifted item if same material exists, never exceeding 10', async () => {
  const E = await engine();
  const s = game(), p = s.players.p, q = s.players.q;
  p.x = 1000; p.y = 350;
  q.x = 1050; q.y = 350;
  // Q has 10 items in bag, one of which is coffee (material)
  q.items = Array.from({ length: 9 }, (_, i) => ({ uid: 'qi' + i, id: 'wrench', category: 'weapon', slot: null }));
  q.items.push({ uid: 'q_coffee', id: 'coffee', category: 'item', slot: null, count: 1, durability: 2 });
  // P has coffee to gift
  p.items = [{ uid: 'p_coffee', id: 'coffee', category: 'item', slot: null, count: 1, durability: 3 }];

  assert.equal(q.items.filter(i => i.slot == null).length, 10);
  E.act(s, 'p', 'gift', { target: 'q', uid: 'p_coffee' }, 1000);
  // Q should still have exactly 10 bag items, with coffee count incremented to 2 and durability updated to 3
  assert.equal(q.items.filter(i => i.slot == null).length, 10);
  const qCoffee = q.items.find(i => i.id === 'coffee');
  assert.equal(qCoffee.count, 2);
  assert.equal(qCoffee.durability, 3);
});

test('storage bag full at 10 items blocks claim_legacy if same item is only in equipped slot', async () => {
  const E = await engine();
  const s = game(), p = s.players.p;
  // P has 3 equipped items (one is wrench) and 10 bag items (none of which is wrench)
  p.items = [
    { uid: 'eq0', id: 'wrench', category: 'weapon', slot: 0 },
    { uid: 'eq1', id: 'keyboard', category: 'weapon', slot: 1 },
    { uid: 'eq2', id: 'mouse', category: 'weapon', slot: 2 },
    ...Array.from({ length: 10 }, (_, i) => ({ uid: 'b' + i, id: 'pizza', category: 'item', slot: null }))
  ];
  p.overflow = [{ uid: 'ov_wrench', id: 'wrench', category: 'weapon' }];

  assert.equal(p.items.filter(i => i.slot == null).length, 10);
  assert.throws(() => E.act(s, 'p', 'claim_legacy', { uid: 'ov_wrench' }, 1000), /無法領取/);
  // Bag length must remain 10
  assert.equal(p.items.filter(i => i.slot == null).length, 10);
});

test('device_repair for broken equipment in different room or out of range awards no exp and does not repair', async () => {
  const E = await engine();
  const s = game(), p = s.players.p;
  p.room = 'PP00';
  p.exp = 0;
  // Lab device broken in another room 'LAB'
  s.broken = { 'lab_0': { broken: true, room: 'LAB' } };

  E.act(s, 'p', 'device_repair', { target: 'lab_0' }, 1000);
  assert.equal(p.exp, 0, 'No EXP should be awarded for cross-room repair');
  assert.equal(s.broken['lab_0'].broken, true, 'Cross-room device must remain broken');
});

test('device_finish without active channel fails and awards no exp', async () => {
  const E = await engine();
  const s = game(), p = s.players.p;
  const t = E.assets.tasks[0];
  p.x = t.x; p.y = t.y;
  p.exp = 0;
  p.channel = null;
  s.broken = { [t.id]: { broken: true, room: p.room } };

  assert.throws(() => E.act(s, 'p', 'device_finish', {}, 1000), /修復時間不足/);
  assert.equal(p.exp, 0, 'No EXP should be awarded without channel');
  assert.equal(s.broken[t.id].broken, true, 'Device must remain broken');
});

test('storage bag full at 10 items: npc_love_gift stacks matching item without creating 11th slot', async () => {
  const E = await engine();
  const s = game(), p = s.players.p;
  // 10 items in bag, including pizza
  p.items = Array.from({ length: 9 }, (_, i) => ({ uid: 'item_' + i, id: 'wrench', category: 'weapon', slot: null }));
  p.items.push({ uid: 'p_pizza', id: 'pizza', category: 'item', slot: null, count: 1, durability: 2 });
  assert.equal(p.items.filter(i => i.slot == null).length, 10);

  // RNG returning index for 'pizza' (index 0 in pool ['pizza','boba',...])
  E.act(s, 'p', 'npc_love_gift', {}, 1000, () => 0);
  assert.equal(p.items.filter(i => i.slot == null).length, 10, 'Bag must remain exactly 10 slots');
  const pizza = p.items.find(i => i.id === 'pizza');
  assert.equal(pizza.count, 2, 'Pizza stack count must be 2');
});

test('storage bag full at 10 items: rma_report stacks matching reward item without creating 11th slot', async () => {
  const E = await engine();
  const s = game(), p = s.players.p;
  p.x = 998; p.y = 350;
  // 10 items in bag, one is keyboard
  p.items = Array.from({ length: 9 }, (_, i) => ({ uid: 'item_' + i, id: 'wrench', category: 'weapon', slot: null }));
  p.items.push({ uid: 'p_key', id: 'keyboard', category: 'weapon', slot: null, count: 1, durability: 3 });
  assert.equal(p.items.filter(i => i.slot == null).length, 10);

  // Set up ready reporting task
  s.tasks[p.room] = { claimer: 'p', stage: 'reporting', targets: [], repairedIds: [] };
  // Find keyboard in assets.items and pick it
  const keyIdx = E.assets.items.findIndex(i => i.id === 'keyboard');
  E.act(s, 'p', 'rma_report', {}, 1000, () => (keyIdx + 0.1) / E.assets.items.length);

  assert.equal(p.items.filter(i => i.slot == null).length, 10, 'Bag must remain exactly 10 slots');
  const key = p.items.find(i => i.id === 'keyboard');
  assert.equal(key.count, 2, 'Keyboard stack count must be 2');
});
