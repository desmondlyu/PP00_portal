// One shared quarter-hour clock; only the elected room master resolves combat.
(function () {
  const PERIOD = 15 * 60 * 1000, DURATION = 60000;
  const safe = p => p.x >= 2220 && p.x <= 2500 && p.y >= 160 && p.y <= 460;
  function clock(now = Date.now()) {
    const start = Math.floor(now / PERIOD) * PERIOD;
    return {start, end: start + DURATION, active: now < start + DURATION,
      warning: now >= start + PERIOD - 10000, next: start + PERIOD};
  }
  function master(n, id) {
    return [n.clientId, ...[...n.remotePlayers.values()].filter(p => !p.isNpc && !p.isMob).map(p => p.id)].sort()[0] === id;
  }
  function state(n, now) {
    const c = clock(now);
    if (!n.hunt || n.hunt.start !== c.start) n.hunt = {start:c.start, hits:{}, protectedUntil:{}, stunnedUntil:0};
    return n.hunt;
  }
  function receive(n, pkt) {
    if (!master(n,pkt.senderId) || pkt.hunt?.start !== clock().start) return;
    const previous=n.hunt?.start===pkt.hunt.start?n.hunt:null;
    if(previous) for(const id of Object.keys(previous.hits)) pkt.hunt.hits[id]=Math.max(pkt.hunt.hits[id]||0,previous.hits[id]);
    n.hunt = pkt.hunt;
    const count = Math.min(3, Math.max(0, n.hunt.hits[n.clientId] || 0));
    if (n.localPlayer && count > (n.localPlayer.huntHits || 0) && n.callbacks.onHuntHit) n.callbacks.onHuntHit(count);
    if (n.localPlayer) n.localPlayer.huntHits = count;
  }
  function publish(n) {
    const pkt = {senderId:n.clientId, hunt:n.hunt};
    receive(n,pkt); n.broadcastPacket('hunt_state',{hunt:n.hunt});
  }
  // Grid routing lets the pursuer go around desks rather than through walls.
  function route(bird,target) {
    const size=40, key=(x,y)=>x+','+y, sx=Math.round(bird.x/size), sy=Math.round(bird.y/size);
    const q=[[sx,sy]], parent=new Map([[key(sx,sy),null]]); let end=null;
    for(let i=0;i<q.length && i<4000;i++) {
      const [x,y]=q[i];
      if(Math.hypot(x*size-target.x,y*size-target.y)<55){end=[x,y];break;}
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx=x+dx,ny=y+dy,k=key(nx,ny);
        if(nx<2||ny<2||nx>68||ny>44||parent.has(k)||window.isPositionBlocked(nx*size,ny*size,14)||window.isPositionBlocked((x+nx)*size/2,(y+ny)*size/2,14))continue;
        parent.set(k,[x,y]);q.push([nx,ny]);
      }
    }
    if(!end)return [];
    const result=[];while(end && key(...end)!==key(sx,sy)){result.unshift({x:end[0]*size,y:end[1]*size});end=parent.get(key(...end));}return result;
  }
  function strike(n,id) {
    if(!clock().active||!n.isRoomMaster())return;
    const p=id===n.clientId?n.localPlayer:n.remotePlayers.get(id), bird=n.npcPlayers.get('npc_bird_commander');
    const h=state(n,Date.now());
    if(!p||!bird||safe(p)||p.isInjured||(h.hits[id]||0)>=3||Math.hypot(p.x-bird.x,p.y-bird.y)>140)return;
    h.strikes ||= {};
    if(Date.now()-(h.strikes[id]||0)<500)return;
    h.strikes[id]=Date.now();h.stunnedUntil=Date.now()+650;
    const angle=Math.atan2(bird.y-p.y,bird.x-p.x);
    for(let i=0;i<4;i++){
      const x=bird.x+Math.cos(angle)*12,y=bird.y+Math.sin(angle)*12;
      if(!window.isPositionBlocked(x,y,14)){bird.x=x;bird.y=y;}
    }
    bird.jumpOffset=18;bird.emote={emoji:'💫',expiresAt:Date.now()+650};publish(n);
  }
  function update(n,tick) {
    const now=Date.now(),c=clock(now),h=state(n,now);
    if(n.localPlayer && n.localPlayer.huntRound!==c.start){n.localPlayer.huntRound=c.start;n.localPlayer.huntHits=0;}
    if(c.active && !n.npcPlayers.has('npc_bird_commander')) n.spawnBirdCommander();
    const bird=n.npcPlayers.get('npc_bird_commander');
    if(!c.active){if(bird?.huntActive){bird.huntActive=false;bird.isBerserk=false;bird.isMoving=false;bird.actionState=null;bird.berserkCooldownUntil=now+10000;}ui(n,c,now);return;}
    if(bird){bird.huntActive=true;bird.isBerserk=false;bird.isFleeing=false;bird.ghostScaredUntil=0;bird.knockback=null;}
    if(bird && n.localPlayer && n.isRoomMaster()) {
      const targets=[n.localPlayer,...n.remotePlayers.values()].filter(p=>!p.isNpc&&!p.isMob&&!p.isInjured&&!safe(p)&&(h.hits[p.id]||0)<3);
      const target=targets.sort((a,b)=>Math.hypot(a.x-bird.x,a.y-bird.y)-Math.hypot(b.x-bird.x,b.y-bird.y))[0];
      bird.isMoving=false;
      if(target && !bird.combatDown && now>=h.stunnedUntil){
        bird.actionState=null;
        if(!bird.huntPathAt||now-bird.huntPathAt>900||bird.huntTarget!==target.id){bird.huntPath=route(bird,target);bird.huntPathAt=now;bird.huntTarget=target.id;}
        const waypoint=bird.huntPath?.[0]||target, dx=waypoint.x-bird.x,dy=waypoint.y-bird.y,d=Math.hypot(dx,dy)||1;
        const speed=6.2, step=Math.min(speed,d),x=bird.x+dx/d*step,y=bird.y+dy/d*step;
        if(!window.isPositionBlocked(x,bird.y,14))bird.x=x;
        if(!window.isPositionBlocked(bird.x,y,14))bird.y=y;
        if(d<speed)bird.huntPath?.shift();
        bird.dir=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');bird.isMoving=true;
        if(Math.hypot(target.x-bird.x,target.y-bird.y)<38 && now>=(h.protectedUntil[target.id]||0) && !window.isPositionBlocked((target.x+bird.x)/2,(target.y+bird.y)/2,8)){
          h.hits[target.id]=(h.hits[target.id]||0)+1;h.protectedUntil[target.id]=now+2000;
          bird.emote={emoji:'💥',expiresAt:now+500};publish(n);
        }
      }
      if(tick%30===0)publish(n);
    }
    ui(n,c,now);
  }
  function ui(n,c,now){
    if(typeof document==='undefined'||!n.localPlayer)return;
    let el=document.getElementById('huntHud');
    if(!el){el=document.createElement('div');el.id='huntHud';el.setAttribute('aria-live','polite');document.body.appendChild(el);}
    el.hidden=!c.active&&!c.warning;
    document.body.classList.toggle('hunt-active',c.active);
    if(el.hidden)return;
    const hit=n.hunt?.hits[n.clientId]||0;
    const label=c.active?`🚨 鳥人追殺 ${Math.ceil((c.end-now)/1000)} 秒 ｜受擊 ${hit}/3${safe(n.localPlayer)?' ｜安全區':''}`:`🚨 ${Math.ceil((c.next-now)/1000)} 秒後鳥人追殺開始`;
    if(el.dataset.label!==label){el.dataset.label=label;el.textContent=label;
      const btn=document.createElement('button');btn.textContent='退出／前往安全區';btn.onclick=()=>n.callbacks.onHuntEscape?.();el.appendChild(btn);}
    document.body.classList.toggle('hunt-active',c.active);
    if(c.active && n.huntAnnounced!==c.start){n.huntAnnounced=c.start;
      const banner=document.createElement('div');banner.className='hunt-start';banner.textContent='🚨 警告：鳥人指揮官追殺模式啟動';document.body.appendChild(banner);setTimeout(()=>banner.remove(),2800);}
  }
  window.OfficeHunt={clock,safe,update,strike,receive};
})();
