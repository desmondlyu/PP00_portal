import '../static/js/progression.js';
import assets from './assets.mjs';
const R=globalThis.OfficeProgression;
const fail=message=>{throw new Error(message);};
const near=(p,x,y,d=110)=>Math.hypot(p.x-x,p.y-y)<=d;
const itemMeta=id=>assets.items.find(i=>i.id===id);
const nowDate=t=>new Date(t+8*3600000).toISOString().slice(0,10);
const active=(p,t)=>p.lastSeen>t-35000;
const locked=(p,t)=>p.effects.injuredUntil>t||p.effects.lockedUntil>t||p.effects.stunnedUntil>t||p.effects.ghostUntil>t;
const isMaterial=i=>i&&['weapon','item'].includes(i.category);
const outfits=p=>p.items.filter(i=>i.category==='outfit');
const pick=(xs,rng)=>xs[Math.min(xs.length-1,Math.floor(rng()*xs.length))];
const uid=()=>crypto.randomUUID();
const fresh=(id)=>({...itemMeta(id),uid:uid(),durability:itemMeta(id).maxDurability||3});
const bag=p=>p.items.filter(i=>i.slot==null);
const capacity=(p,item)=>p.items.length<10&&(item.category!=='outfit'||outfits(p).length<3);
const award=(p,n)=>{p.exp=R.change(p.exp,n);};
const gain=(p,n)=>award(p,Math.round(n*(1+p.items.filter(i=>i.slot!=null).reduce((a,i)=>a+(itemMeta(i.id)?.expBonusPct||0),0)/100)));
const walkable=assets.walkable||[];
const clear=(x,y)=>x>160&&y>80&&x<2660&&y<1790&&!assets.colliders.some(r=>x+18>r.x&&x-18<r.x+r.w&&y+18>r.y&&y-18<r.y+r.h);
const segment=(x,y,xx,yy)=>{const n=Math.ceil(Math.hypot(xx-x,yy-y)/8);for(let i=0;i<=n;i++)if(!clear(x+(xx-x)*i/Math.max(1,n),y+(yy-y)*i/Math.max(1,n)))return false;return true;};
export function floor(x,y){
  let best=null,distance=Infinity;
  for(const [xx,yy]of walkable){const d=(xx-x)**2+(yy-y)**2;if(d<distance){distance=d;best={x:xx,y:yy};}}
  if(best){if(distance<900&&clear(x,y)&&segment(x,y,best.x,best.y))return {x,y};return best;}
  if(clear(x,y))return {x,y};return {x:850,y:520};
}
function recovery(s,p,now){
  const occupied=Object.values(s.players).filter(q=>q.id!==p.id&&q.effects.injuredUntil>now);
  for(let y=1350;y<=1750;y+=70)for(let x=740;x<=1130;x+=65){const f=floor(x,y);if(f.x!==x||f.y!==y||occupied.some(q=>near(q,x,y,62)))continue;p.x=x;p.y=y;return;}
  fail('會議室 B 休養位置已滿，請稍後重試');
}
export function hurt(s,p,source,now,rng=Math.random){
  const e=p.effects;
  if(locked(p,now))return {ignored:true};
  if(e.shieldUntil>now){e.shieldUntil=0;p.lastDamage={id:uid(),absorbed:true,at:now};return {absorbed:true};}
  if(e.lastHurt&&now-e.lastHurt<2000)return {ignored:true};e.lastHurt=now;
  p.channel=null;closePending(p,false);
  let injury=null;
  if(source==='hunt'){
    const round=Math.floor(now/900000);if(p.huntRound!==round){p.huntRound=round;p.huntHits=0;}p.huntHits=(p.huntHits||0)+1;
    if(p.huntHits>=3){award(p,-120);e.injuredUntil=now+R.restMs(R.level(p.exp));recovery(s,p,now);injury='critical';}
  }else {injury=R.injury(rng());if(injury==='critical'){award(p,-80);e.injuredUntil=now+R.restMs(R.level(p.exp));recovery(s,p,now);}else if(injury==='light')e.lightUntil=now+60000;}
  const drop=rng()<.2,stun=rng()<.2;
  let lost=null;
  if(drop){const i=p.items.find(i=>i.slot===p.activeSlot)||pick(p.items,rng);if(i){p.items=p.items.filter(a=>a.uid!==i.uid);p.worn=p.worn===i.uid?null:p.worn;lost={...i,slot:null,worn:false,...floor(p.x+60,p.y),uid:uid(),source:'player',pickupAfter:now+2000};s.drops[lost.uid]=lost;}}
  if(source!=='pvp'&&rng()<.4){const i=p.items.find(i=>i.uid===p.worn);if(i){i.durability--;if(i.durability<=0){p.items=p.items.filter(a=>a.uid!==i.uid);p.worn=null;}}}
  if(stun&&!(e.injuredUntil>now)){if(e.stunImmuneUntil>now)e.stunImmuneUntil=0;else e.stunnedUntil=now+2000;}
  const result={id:uid(),source,injury,drop:lost?.id,stun:!!(e.stunnedUntil>now),at:now};p.lastDamage=result;return result;
}
function material(p,ids,n){if(!Array.isArray(ids)||ids.length!==n||new Set(ids).size!==n)fail('請選擇不同的材料');return ids.map(id=>{const i=p.items.find(i=>i.uid===id);if(!i||!isMaterial(i)||i.slot!=null||p.pending?.materials.includes(id))fail('材料不存在或已裝備／保留');return i;});}
function closePending(p,commit){const g=p.pending;if(!g)return;if(commit){p.items=p.items.filter(i=>!g.materials.includes(i.uid)&&i.uid!==g.replace);p.items.push(g.outfit);if(p.worn===g.replace)p.worn=null;}p.pending=null;}
export function snapshot(s,id,now){
  const p=s.players[id];return {now,player:p?{...p,credentials:undefined,tokenHash:undefined,sessionUntil:undefined,resumeRecovery:undefined,generation:undefined}:null,
    players:Object.values(s.players).filter(q=>active(q,now)&&q.room===p?.room).map(q=>({id:q.id,clientId:q.connection,name:q.name,unit:q.unit,x:q.x,y:q.y,avatarId:q.avatarId,effects:q.effects,worn:q.items.find(i=>i.uid===q.worn)?.avatarId||null,action:q.action})),
    broken:s.broken||{},enemies:Object.fromEntries(Object.entries(s.enemies).filter(([,e])=>e.room===p?.room)),drops:Object.values(s.drops).filter(d=>d.room===p?.room||!d.room),task:s.tasks[p?.room]||null};
}
export function act(s,id,kind,b={},now=Date.now(),rng=Math.random){
  s.enemies ||= {};s.drops ||= {};s.tasks ||= {};s.rate ||= {};
  const p=s.players[id];if(!p)fail('登入已失效');p.effects ||= {};p.items ||= [];
  if(p.pending&&p.pending.until<=now)closePending(p,false);
  const task=s.tasks[p.room];if(task&&((task.until<=now)||task.claimer&&!active(s.players[task.claimer],now))){s.tasks[p.room]={cooldown:now+30000};}
  if(kind==='signin'){const d=nowDate(now);if(p.lastLoginDate!==d){p.lastLoginDate=d;award(p,50);}return;}
  if(kind==='logout'){p.tokenHash=null;p.lastSeen=0;p.channel=null;closePending(p,false);p.resumeRecovery=null;return;}
  if(kind==='heartbeat'){
    if(!locked(p,now)&&Number.isFinite(b.x)&&Number.isFinite(b.y)){const f=floor(Math.max(55,Math.min(2700,b.x)),Math.max(55,Math.min(1900,b.y)));p.x=f.x;p.y=f.y;}
    if(p.channel&&!near(p,p.channel.x,p.channel.y,25))p.channel=null;
    p.lastSeen=now;p.action=typeof b.action==='string'?b.action.slice(0,32):null;return;
  }
  if(kind==='cancel'){p.channel=null;closePending(p,false);return;}
  if(kind==='gacha_cancel'){closePending(p,false);return;}
  if(locked(p,now))fail('目前狀態無法操作');
  if(kind==='gift'){
    const q=s.players[b.target],i=p.items.find(i=>i.uid===b.uid);if(!q||q.room!==p.room||!active(q,now)||!near(p,q.x,q.y,180)||!i||!isMaterial(i)||!capacity(q,i)||p.pending?.materials.includes(i.uid))fail('無法贈送道具，請確認距離與背包空間');
    p.items=p.items.filter(a=>a.uid!==i.uid);q.items.push({...i,slot:null,source:'gift'});return;
  }
  if(kind==='equip'){
    const i=p.items.find(i=>i.uid===b.uid);if(!i)fail('物品不存在');if(p.pending?.materials.includes(i.uid))fail('材料已保留，請先完成或取消扭蛋');
    if(i.category==='outfit'){p.worn=p.worn===i.uid?null:i.uid;return;}
    if(i.slot!=null){if(bag(p).length>=10)fail('背包已滿');i.slot=null;return;}
    const slot=Number.isInteger(b.slot)&&b.slot>=0&&b.slot<3?b.slot:[0,1,2].find(j=>!p.items.some(a=>a.slot===j))??0;
    const old=p.items.find(a=>a.slot===slot);if(old)old.slot=null;i.slot=slot;p.activeSlot=slot;return;
  }
  if(kind==='active'){if(!Number.isInteger(b.slot)||b.slot<0||b.slot>2)fail('欄位錯誤');p.activeSlot=b.slot;return;}
  if(kind==='claim_legacy'){const i=p.overflow?.find(i=>i.uid===b.uid);if(!i||!capacity(p,i))fail('無法領取');p.overflow=p.overflow.filter(a=>a.uid!==b.uid);p.items.push(i);return;}
  if(kind==='pickup'){
    const d=s.drops[b.uid];if(!d||d.claimed||d.room&&d.room!==p.room||d.pickupAfter>now||!near(p,d.x,d.y,R.pickupRadius(R.level(p.exp)))||!segment(p.x,p.y,d.x,d.y)||!capacity(p,d))fail('物品已被撿走、距離過遠、有障礙物或背包已滿');
    p.items.push({...d,uid:uid(),slot:null});d.claimed=true;if(d.source==='world')gain(p,15);return;
  }
  if(kind==='drop'){
    const i=p.items.find(i=>i.uid===b.uid);if(!i||p.pending?.materials.includes(i.uid))fail('不能丟棄');p.items=p.items.filter(a=>a.uid!==i.uid);if(p.worn===i.uid)p.worn=null;
    const d={...i,...floor(p.x+45,p.y),uid:uid(),room:p.room,source:'player',slot:null,pickupAfter:now+2000};s.drops[d.uid]=d;return;
  }
  if(kind==='lounge_start'||kind==='shrine_start'||kind==='repair_start'){
    const x=kind==='lounge_start'?1238:kind==='shrine_start'?1718:1478;
    if(!near(p,x,350))fail('請靠近設施');
    if(kind==='lounge_start'&&p.effects.loungeCooldown>now||kind==='shrine_start'&&p.effects.shieldCooldown>now)fail('設施冷卻中');
    if(kind==='repair_start'){material(p,b.materials,1);const target=p.items.find(i=>i.uid===b.target);if(!target||!isMaterial(target)||b.materials.includes(b.target)||target.durability>=target.maxDurability)fail('請選擇需要維修的武器');}
    p.channel={kind:kind.replace('_start',''),at:now,x:p.x,y:p.y,materials:b.materials,target:b.target};return;
  }
  if(kind==='facility_finish'){
    const c=p.channel;if(!c||!near(p,c.x,c.y,25)||now-c.at<(c.kind==='lounge'?5000:3000))fail('互動已中斷或時間不足');
    if(c.kind==='lounge'){p.effects.lightUntil=0;p.effects.loungeUntil=now+30000;p.effects.stunImmuneUntil=now+30000;p.effects.loungeCooldown=now+60000;}
    else if(c.kind==='shrine'){p.effects.shieldUntil=now+180000;p.effects.shieldCooldown=now+180000;}
    else if(c.kind==='repair'){material(p,c.materials,1);const i=p.items.find(i=>i.uid===c.target);if(!i||i.durability>=i.maxDurability)fail('維修目標已變更');p.items=p.items.filter(a=>!c.materials.includes(a.uid));i.durability=i.maxDurability;}
    p.channel=null;return;
  }
  if(kind==='gacha'){
    if(!near(p,1963,350)||p.pending)fail('請靠近扭蛋機或先處理上次結果');material(p,b.materials,2);
    const outfit=fresh(pick(assets.items.filter(i=>i.category==='outfit'),rng).id);
    const copies=outfits(p).filter(i=>i.id===outfit.id).sort((a,b)=>a.durability-b.durability);
    if(copies.length){if(copies[0].durability<5){copies[0].durability=5;p.items=p.items.filter(i=>!b.materials.includes(i.uid));}return {duplicate:true,refunded:copies[0].durability===5};}
    if(outfits(p).length>=3){p.pending={materials:b.materials,outfit,until:now+60000};return;}
    p.items=p.items.filter(i=>!b.materials.includes(i.uid));if(!capacity(p,outfit))fail('背包已滿');p.items.push(outfit);return;
  }
  if(kind==='gacha_confirm'){
    if(!p.pending||!near(p,1963,350))fail('抽獎已結束');if(p.pending.materials.some(uid=>!p.items.some(i=>i.uid===uid&&isMaterial(i)&&i.slot==null)))fail('保留材料已變更，無法兌換');if(!outfits(p).some(i=>i.uid===b.replace))fail('請選擇替換的服裝');p.pending.replace=b.replace;closePending(p,true);return;
  }
  if(kind==='device_start'){
    const t=assets.tasks.find(t=>t.id===b.target),fault=s.broken?.[b.target];
    if(!t||!fault?.broken||fault.room!==p.room||!near(p,t.x,t.y,100))fail('無可維修故障');
    p.channel={kind:'device',at:now,x:p.x,y:p.y,target:b.target};return;
  }
  if(kind==='device_finish'){
    const c=p.channel,f=s.broken?.[c?.target];if(c?.kind!=='device'||!f?.broken||now-c.at<3000||!near(p,c.x,c.y,25))fail('修復時間不足或設備已修好');
    const t=s.tasks[p.room];if(t?.targetId===c.target)fail('請使用 RMA 任務修復');
    f.broken=false;f.handledAt=now;gain(p,30);p.channel=null;return;
  }
  if(kind==='rma_claim'){
    if(!near(p,998,350))fail('請靠近電話');if(s.tasks[p.room]?.claimer||s.tasks[p.room]?.cooldown>now)fail('目前搶修中或電話冷卻中');
    const available=assets.tasks.filter(t=>!s.broken?.[t.id]?.broken);if(!available.length)fail('目前沒有可用設備');
    const t=pick(available,rng);s.tasks[p.room]={...t,id:uid(),targetId:t.id,claimer:id,until:now+120000};return;
  }
  if(kind==='rma_start'){const t=s.tasks[p.room];if(!t||t.claimer!==id||!near(p,t.x,t.y,90))fail('無有效任務或距離過遠');p.channel={kind:'rma',at:now,x:p.x,y:p.y,task:t.id};return;}
  if(kind==='rma_finish'){
    const t=s.tasks[p.room],c=p.channel;if(!t||t.claimer!==id||c?.task!==t.id||now-c.at<3000||!near(p,t.x,t.y,90))fail('任務尚未完成');
    if(s.broken?.[t.targetId]){s.broken[t.targetId].broken=false;s.broken[t.targetId].handledAt=now;}award(p,60);s.tasks[p.room]={cooldown:now+30000};p.channel=null;return;
  }
  if(kind==='heal_start'){
    const q=s.players[b.target];if(!q||q.room!==p.room||!near(p,q.x,q.y,75)||!(q.effects.injuredUntil>now||q.effects.lightUntil>now)||p.effects.lightUntil>now)fail('無法急救');
    p.channel={kind:'heal',target:q.id,at:now,x:p.x,y:p.y,duration:q.effects.injuredUntil>now?R.healMs(R.level(p.exp)):2000,event:q.effects.injuredUntil||q.effects.lightUntil};return;
  }
  if(kind==='heal_finish'){
    const c=p.channel,q=s.players[c?.target];if(!c||c.kind!=='heal'||p.effects.lightUntil>now||locked(p,now)||!q||!near(p,q.x,q.y,75)||now-c.at<c.duration||!near(p,c.x,c.y,25))fail('急救已中斷');
    if(q.effects.injuredUntil===c.event&&q.effects.injuredUntil>now){q.effects.injuredUntil=0;award(p,50);}else if(q.effects.lightUntil===c.event&&q.effects.lightUntil>now)q.effects.lightUntil=0;else fail('對方已康復');p.channel=null;return;
  }
  fail('不支援的操作');
}
export {assets,R,award,near,active,locked,fresh,uid,nowDate};
export function strike(s,p,targetId,now,rng=Math.random){
  const e=s.enemies[targetId];if(!e||e.room!==p.room||e.until>now||!near(p,e.x,e.y,140)||!segment(p.x,p.y,e.x,e.y)||locked(p,now))return;
  const a=Math.atan2(e.y-p.y,e.x-p.x),dodge=e.role==='ghost'?.6:e.role==='bird'?.45:e.role==='guard'?.25:0;
  e.reaction={id:uid(),kind:'hit',angle:a,at:now,duration:450};
  if(rng()<dodge){e.reaction.kind='dodge';return;}
  e.hp--;Object.assign(e,floor(e.x+Math.cos(a)*35,e.y+Math.sin(a)*35));
  if(e.hp<=0){
    e.until=now+(e.role==='bird'&&now%900000<60000?10000:e.mob?180000:60000);e.reaction.kind='defeat';gain(p,30);
    const makeDrop=id=>{const d={...fresh(id),...floor(e.x+35,e.y+20),room:p.room,source:'world'};s.drops[d.uid]=d;};
    if(rng()<.3){const ids=e.tier===3?['bench','rma_report']:e.tier===2?['keyboard','wrench','wafer_blade']:['pizza','boba','coffee','duck','ic_pkg'];makeDrop(pick(ids,rng));}
    if(rng()<.05)makeDrop(pick(assets.items.filter(i=>i.category==='outfit'),rng).id);
  }else if(['vp','dir','auntie'].includes(e.role)&&!(e.busyUntil>now)&&rng()<.5){
    const dest=e.role==='vp'?{x:380,y:310}:e.role==='dir'?{x:755,y:310}:{x:2340,y:820};
    Object.assign(p,dest);p.effects.lockedUntil=now+8000;p.beating={npcId:e.id,role:e.role,until:now+8000,startedAt:now};e.busyUntil=now+8000;award(p,-50);
  }
}
export function combat(s,p,b,now,rng=Math.random){
  if(locked(p,now)||now-(p.lastSwing||0)<300)return;
  const weapon=p.items.find(i=>i.slot===(p.activeSlot||0))||p.items.find(i=>i.slot!=null);if(!weapon)return;p.lastSwing=now;
  const targets=Object.values(s.enemies).filter(e=>e.room===p.room&&near(p,e.x,e.y,135)&&!(e.until>now));
  const others=Object.values(s.players).filter(q=>q.id!==p.id&&q.room===p.room&&active(q,now)&&near(p,q.x,q.y,135));
  for(const e of targets){strike(s,p,e.id,now,rng);if(p.effects.lockedUntil>now)break;}
  if(!(p.effects.lockedUntil>now))for(const q of others)hurt(s,q,'pvp',now,rng);
  if((targets.length||others.length)&&rng()>=(R.level(p.exp)-1)*.01){weapon.durability--;if(weapon.durability<=0)p.items=p.items.filter(i=>i.uid!==weapon.uid);}
  p.lastAttack={at:now,emoji:weapon.emoji};
}
export function world(s,p,b,now,rng=Math.random){
  const online=Object.values(s.players).filter(q=>q.room===p.room&&active(q,now)).sort((a,b)=>a.connection.localeCompare(b.connection));
  if(online[0]?.id!==p.id)throw new Error('只有目前房長可更新場景');
  for(const e of Object.values(s.enemies))if(e.until&&e.until<=now){e.hp=e.maxHp;e.until=0;}
  for(const row of (b.enemies||[]).slice(0,50)){
    if(typeof row.id!=='string'||!Number.isFinite(row.x)||!Number.isFinite(row.y)||!/^npc_|^mob_/.test(row.id))continue;
    const role=/vp_boss/.test(row.id)?'vp':/dir_pp00/.test(row.id)?'dir':/auntie/.test(row.id)?'auntie':/bird_commander/.test(row.id)?'bird':/ghost/.test(row.id)?'ghost':/security|guard/.test(row.id)?'guard':'mob';
    const tier=['vp','dir','bird'].includes(role)?3:['ghost','guard'].includes(role)?2:1;
    const hp=role==='mob'?2:[0,3,5,6][tier];let e=s.enemies[row.id];
    if(!e)e=s.enemies[row.id]={id:row.id,role,tier,hp,maxHp:hp,room:p.room,mob:role==='mob'};
    if(e.room!==p.room||e.until>now||e.busyUntil>now)continue;
    e.x=Math.max(55,Math.min(2700,row.x));e.y=Math.max(55,Math.min(1900,row.y));e.name=String(row.name||row.id).slice(0,40);e.templateId=String(row.templateId||row.id);e.lastSeen=now;
    if(row.attacking||role==='bird'&&now%900000<60000){
      for(const q of online){if(!near(q,e.x,e.y,75)||locked(q,now))continue;
        if(role==='bird'&&now%900000<60000){if(q.x>=2220&&q.x<=2500&&q.y>=160&&q.y<=460)continue;hurt(s,q,'hunt',now,rng);}
        else if(role==='ghost'){if(now-(q.lastScare||0)>7000&&rng()<.5){q.lastScare=now;q.effects.ghostUntil=now+5000;}}
        else if(['guard','mob','bird'].includes(role))hurt(s,q,'npc',now,rng);
      }
    }
  }
  s.broken||={};
  for(const id of (b.broken||[]).slice(0,100)){if(!assets.tasks.some(t=>t.id===id))continue;const old=s.broken[id];if(!old||!old.broken&&now-(old.handledAt||0)>30000)s.broken[id]={broken:true,room:p.room};}
  for(const [id,e]of Object.entries(s.enemies))if(e.mob&&now-(e.lastSeen||now)>120000)delete s.enemies[id];
  const room=p.room;
  s.lastSpawn||={};
  if(!Number.isFinite(s.lastSpawn[room]))s.lastSpawn[room]=now;
  const policy=assets.dropPolicy;
  if(now-s.lastSpawn[room]>=policy.intervalMs){
    s.lastSpawn[room]=now;
    const existing=Object.values(s.drops).filter(d=>d.room===room&&!d.claimed).length;
    const hour=new Date(now+8*3600000).getUTCHours();
    const pool=assets.items.filter(i=>isMaterial(i)&&i.spawnRate>0).map(i=>({item:i,weight:i.spawnRate*((hour>=11&&hour<=13||hour>=15&&hour<=16)&&['pizza','boba','coffee'].includes(i.id)?1.2:(hour>=21||hour<7)&&['coffee','kuaikuai'].includes(i.id)?1.25:1)}));
    const total=pool.reduce((n,i)=>n+i.weight,0);
    for(let n=0;n<Math.min(policy.batchCount,16-existing);n++){
      let roll=rng()*total;const m=(pool.find(i=>(roll-=i.weight)<0)||pool.at(-1))?.item;
      if(m){const d={...fresh(m.id),...floor(300+rng()*1600,550+rng()*1100),room,source:'world',createdAt:now};s.drops[d.uid]=d;}
    }
  }
  for(const [id,d]of Object.entries(s.drops))if(d.claimed||d.createdAt&&now-d.createdAt>1800000)delete s.drops[id];
}
