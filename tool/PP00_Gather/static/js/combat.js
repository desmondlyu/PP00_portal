// Shared defeat health, loot ownership and bounded stun effects.
(function(){
  const master=(n,id)=>[n.clientId,...[...n.remotePlayers.values()].filter(p=>!p.isNpc&&!p.isMob).map(p=>p.id)].sort()[0]===id;
  const tier=e=>e.isBirdCommander||/npc_(vp|dir)/.test(e.id)?3:e.isSecurityGuard||e.isGhost||/rma|qit/.test(e.id)?2:1;
  const health=e=>e.isMob?(tier(e)===2?3:2):[0,3,5,6][tier(e)];
  function state(n){return n.combat ||= {enemies:{},items:[],grants:{},effects:{},cooldowns:{}};}
  const player=(n,id)=>id===n.clientId?n.localPlayer:n.remotePlayers.get(id);
  function emit(n){apply(n,{senderId:n.clientId,state:state(n)});n.broadcastPacket('combat_state',{state:state(n)});}
  function apply(n,pkt){
    if(!master(n,pkt.senderId)||!pkt.state)return;
    n.combat=pkt.state;
    n.combatVisuals ||= {};
    for(const e of [...n.npcPlayers.values(),...(n.callbacks.getMobs?.()||[])]){
      const entityId=e.uid||e.id;
      const reaction=n.combat.enemies?.[e.uid||e.id]?.reaction;
      if(reaction && n.combatVisuals[entityId]?.id!==reaction.id){
        n.combatVisuals[entityId]={...reaction,startedAt:Date.now()};
        e.emote={emoji:reaction.kind==='dodge'?'💨':'💥',expiresAt:Date.now()+600};
      }
      e.combatReaction=n.combatVisuals[entityId];
    }
    const s=state(n), p=n.localPlayer;if(!p)return;
    n.combatSeen ||= new Set();
    for(const [id,g] of Object.entries(s.grants))if(g.owner===n.clientId&&!n.combatSeen.has(id)){
      n.combatSeen.add(id);n.callbacks.onCombatPickup?.(g.item);
    }
    if(s.recovery?.[n.clientId]) n.callbacks.onRecoveryLocation?.(s.recovery[n.clientId]);
    const effect=s.effects[n.clientId];
    if(effect&&!n.combatSeen.has(effect.id)){
      n.combatSeen.add(effect.id);n.callbacks.onCombatDamage?.(effect);
    }
  }
  function loot(n,e){
    if(Math.random()>=.30)return null;
    const pools={1:['pizza','boba','coffee','duck','ic_pkg'],2:['keyboard','wrench','wafer_blade'],3:['bench','rma_report']};
    const ids=pools[tier(e)], id=ids[Math.floor(Math.random()*ids.length)];
    const meta=window.GATHER_CONFIG.items.find(i=>i.id===id);
    const item={...meta,uid:'loot_'+(e.uid||e.id)+'_'+Date.now(),x:e.x+35,y:e.y+20,dropY:0,combatDrop:true,durability:meta.maxDurability};
    window.relocateBlockedDrop?.(item);
    state(n).items.push(item);return item;
  }
  function costumeLoot(n,e){
    if(Math.random()>=.05 || !window.OfficeWardrobe)return null;
    const outfits=window.OfficeWardrobe.outfits,meta=outfits[Math.floor(Math.random()*outfits.length)];
    const item={...meta,uid:'costume_'+(e.uid||e.id)+'_'+Date.now(),x:e.x-35,y:e.y+20,dropY:0,combatDrop:true,durability:5};
    window.relocateBlockedDrop?.(item);
    state(n).items.push(item);return item;
  }
  function strike(n,id,targetId){
    if(!n.isRoomMaster())return;
    const a=player(n,id),e=n.npcPlayers.get(targetId)||(n.callbacks.getMobs?.()||[]).find(m=>(m.uid||m.id)===targetId);
    if(!a||!e||a.isInjured||Date.now()<(a.stunnedUntil||0)||Math.hypot(a.x-e.x,a.y-e.y)>140||window.isPositionBlocked((a.x+e.x)/2,(a.y+e.y)/2,8))return;
    if(window.OfficeHunt?.clock?.()?.active&&window.OfficeHunt?.safe?.(a))return;
    if(!n.npcPlayers.has(e.id)) e.isMob=true;
    const entityId=e.uid||e.id;
    const s=state(n),now=Date.now(),key=id+':'+targetId;
    if(now-(s.cooldowns[key]||0)<250)return;s.cooldowns[key]=now;
    let h=s.enemies[entityId];
    if(!h)h=s.enemies[entityId]={hp:health(e),maxHp:health(e),until:0};
    if(h.until>now)return;
    if(h.hp<=0){h.hp=h.maxHp;h.until=0;}
    const dodge=e.isGhost?.60:e.isBirdCommander?.45:e.isSecurityGuard?.25:0;
    const angle=Math.atan2(e.y-a.y,e.x-a.x);
    const reaction=(kind)=>{h.reaction={id:entityId+':'+now+':'+id,kind,angle,startedAt:now,duration:450};};
    if(Math.random()<dodge){reaction('dodge');emit(n);return;}
    reaction('hit');
    h.hp--;e.hp=h.hp;e.maxHp=h.maxHp;
    if(e.isBirdCommander && window.OfficeHunt?.clock?.()?.active)window.OfficeHunt.strike?.(n,id);
    e.knockback={vx:Math.cos(angle)*16,vy:Math.sin(angle)*16,ticksLeft:20};
    e.isBerserk=false;e.emote={emoji:'💥',expiresAt:now+1000};
    if(h.hp===0){
      reaction('defeat');
      h.defeatedAt=now;
      if (e.isGhost || e.id === 'npc_night_ghost') {
        h.until = 0;
        e.actionState = null;
        e.isMoving = true;
        e.combatDown = false;
        n.transformRedGhost?.(e);
      } else {
        h.until=now+(e.isMob?180000:e.isBirdCommander?(window.OfficeHunt?.clock?.()?.active?10000:180000):60000);
        e.actionState='sleep_bed';e.isMoving=false;e.knockback=null;e.isFleeing=false;
      }
      const items=[loot(n,e),costumeLoot(n,e)].filter(Boolean);h.result=`擊倒【${e.name}】${items.length?'，掉落 '+items.map(i=>i.name).join('、'):'，未掉落道具'}`;h.resultId=now+':'+e.id;
      n.broadcastPacket('combat_result',{text:h.result,id:h.resultId,owner:id});
      if(id===n.clientId)n.callbacks.onCombatResult?.(h.result);
    }
    emit(n);
  }
  function damage(n,id,npc=true){
    if(!n.isRoomMaster())return;
    const p=player(n,id),s=state(n),now=Date.now();if(!p||p.isInjured||window.OfficeHunt?.clock?.()?.active&&window.OfficeHunt?.safe?.(p))return;
    if(now-(s.cooldowns['hurt:'+id]||0)<2000)return;
    s.cooldowns['hurt:'+id]=now;
    // Independent rolls; an existing stun never gets extended.
    const drop=Math.random()<.20,stun=Math.random()<.20;
    s.effects[id]={id:'hurt_'+id+'_'+now,drop,stun,outfitDamage:npc&&Math.random()<.40,until:now+2000};emit(n);
  }
  function packet(n,p){
    if(p.type==='combat_state'){apply(n,p);return;}
    if(p.type==='combat_result'){if(master(n,p.senderId)&&p.owner===n.clientId)n.callbacks.onCombatResult?.(p.text);return;}
    if(!n.isRoomMaster())return;
    if(p.type==='recovery_release'){if(state(n).recovery)delete state(n).recovery[p.senderId];emit(n);return;}
    if(p.type==='recovery_request'){
      const s=state(n),now=Date.now();s.recovery ||= {};
      for(const [id,r] of Object.entries(s.recovery))if(r.until<=now||!player(n,id))delete s.recovery[id];
      if(!player(n,p.senderId)||!Number.isFinite(p.until)||p.until<=now)return;
      if(!s.recovery[p.senderId]){
        const occupied=[...Object.values(s.recovery),...[n.localPlayer,...n.remotePlayers.values()].filter(Boolean)];
        outer:for(let y=1350;y<=1750;y+=70)for(let x=740;x<=1130;x+=65){
          if(window.isPositionBlocked(x,y,26)||occupied.some(o=>Math.hypot(o.x-x,o.y-y)<62))continue;
          s.recovery[p.senderId]={x,y,until:Math.min(p.until,now+300000)};break outer;
        }
      }
      emit(n);return;
    }
    if(p.type==='combat_strike')strike(n,p.senderId,p.targetId);
    if(p.type==='combat_hurt'&&p.targetId===p.senderId)damage(n,p.senderId,p.npc!==false);
    if(p.type==='combat_drop'&&p.item){
      const a=player(n,p.senderId),s=state(n),effect=s.effects[p.senderId];
      if(!a||!effect?.drop||effect.id!==p.effectId||effect.consumed)return;
      effect.consumed=true;s.items.push({...p.item,uid:'lost_'+effect.id,combatDrop:true,x:a.x+60,y:a.y,dropY:0,pickupAfter:Date.now()+2000});window.relocateBlockedDrop?.(s.items[s.items.length-1]);emit(n);
    }
    if(p.type==='combat_claim'){
      const s=state(n),a=player(n,p.senderId),i=s.items.findIndex(x=>x.uid===p.uid);
      if(i<0||!a||a.isInjured)return;const item=s.items[i];
      if(Date.now()<(item.pickupAfter||0)||Math.hypot(a.x-item.x,a.y-item.y)>68)return;
      const bag=a.inventoryState || (Array.isArray(a.inventory)?a:null);
      if(window.OfficeWardrobe && bag && !window.OfficeWardrobe.canAdd(bag,item,true))return;
      // Reserve remote capacity until the next state update arrives.
      if(window.OfficeWardrobe && bag && a!==n.localPlayer)window.OfficeWardrobe.add(bag,item,true);
      s.items.splice(i,1);s.grants[item.uid]={owner:p.senderId,item};emit(n);
    }
  }
  function send(n,type,data={}){if(n.isRoomMaster())packet(n,{type,senderId:n.clientId,...data});else n.broadcastPacket(type,data);}
  function update(n,tick){
    const s=state(n),now=Date.now();
    if(n.localPlayer && tick%120===0){
      if(n.localPlayer.isInjured && (!s.recovery?.[n.clientId]||s.recovery[n.clientId].until<=now)) send(n,'recovery_request',{until:n.localPlayer.injuredUntil});
      else if(!n.localPlayer.isInjured&&s.recovery?.[n.clientId]) send(n,'recovery_release');
    }
    for(const e of [...n.npcPlayers.values(),...(n.callbacks.getMobs?.()||[])]){
      const entityId=e.uid||e.id;
      e.combatReaction=n.combatVisuals?.[entityId];
      const h=s.enemies[entityId];if(!h)continue;
      const down=h.until>now;if(down&&!e.combatDown)e.combatDownAt=now;
      e.combatDown=down;e.hp=h.hp;e.maxHp=h.maxHp;
      if(e.combatDown){e.actionState='sleep_bed';e.isMoving=false;if(e.isMob&&now-(h.defeatedAt||now)>1800)n.callbacks.onCombatMobDefeat?.(e.uid);}
      else if(h.hp<=0 && !e.isMob && n.isRoomMaster()){h.hp=h.maxHp;h.until=0;e.actionState=null;}
    }
    if(n.isRoomMaster()&&tick%120===0)s.items.forEach(item=>window.relocateBlockedDrop?.(item));
    n.callbacks.onCombatGround?.(s.items);
    if(n.isRoomMaster()&&tick%30===0)emit(n);
  }
  let previewId=0;
  function predictImpact(entity,angle,now=Date.now()){
    const id='preview_'+(++previewId);
    // Presentation only: HP, position, loot and evade outcomes stay server-authoritative.
    entity.combatReaction={id,kind:'anticipate',angle,startedAt:now,duration:650,predicted:true};
    return id;
  }
  // Use the viewer's animation clock, never the server timestamp or network latency.
  function receiveReaction(entity,reaction,now=Date.now()){
    if(!reaction||entity.lastConfirmedReactionId===reaction.id||entity.combatReaction?.id===reaction.id)return false;
    entity.lastConfirmedReactionId=reaction.id;
    const preview=entity.combatReaction;
    const startedAt=preview?.predicted&&reaction.kind==='hit'&&now-preview.startedAt<500?preview.startedAt:now;
    entity.combatReaction={...reaction,startedAt,duration:Math.max(650,reaction.duration||0)};
    entity.emote={emoji:reaction.kind==='dodge'?'💨':'💥',expiresAt:now+650};
    return true;
  }
  function reactionPose(e,now=Date.now()){
    const r=e.combatReaction,t=r?(now-r.startedAt)/r.duration:1;
    if(!r||t<0||t>=1)return {x:0,y:0,jump:0,active:false};
    const wave=Math.sin(t*Math.PI),angle=r.angle+(r.kind==='dodge'?Math.PI/2:0);
    return {x:Math.cos(angle)*wave*34,y:Math.sin(angle)*wave*24,jump:wave*(r.kind==='dodge'?26:18),active:true,kind:r.kind};
  }
  const defeatVisible=(e,now=Date.now())=>!e.combatDown||now-(e.combatDownAt??0)<650;
  window.OfficeCombat={tier,health,strike,damage,send,packet,update,state,reactionPose,receiveReaction,predictImpact,defeatVisible};
})();
