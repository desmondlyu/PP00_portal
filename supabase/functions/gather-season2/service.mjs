import {act,combat,world,snapshot,assets,nowDate,uid} from './engine.mjs';
const enc=new TextEncoder();
export const digest=async str=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(str))),b=>b.toString(16).padStart(2,'0')).join('');
async function pinHash(pin,salt){const k=await crypto.subtle.importKey('raw',enc.encode(pin),'PBKDF2',false,['deriveBits']);return Array.from(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:600000,hash:'SHA-256'},k,256)),b=>b.toString(16).padStart(2,'0')).join('');}
export async function identify(s,token,now){const h=await digest(token);const p=Object.values(s.players).find(p=>p.tokenHash===h&&p.sessionUntil>now);if(!p)throw new Error('登入已失效，請重新輸入個人密碼');return p;}
export async function request(s,kind,b,token,now,source='local'){
  s.players||={};s.rate||={};
  if(kind==='login'||kind==='register'||kind==='enter'){
    const key=(b.name||'').trim().toLowerCase(),unit=b.unit;
    if(!key||key.length>16||!assets.units.includes(unit)||!/^[A-Za-z0-9]{6}$/.test(b.pin||''))throw new Error('請輸入名稱、部門與六碼英數字個人密碼');
    const limit=s.rate[source]||{at:now,count:0};if(now-limit.at>60000){limit.at=now;limit.count=0;}s.rate[source]=limit;if(++limit.count>20)return {error:'嘗試過於頻繁，請稍後重試'};
    let p=Object.values(s.players).find(p=>p.nameKey===key&&p.unit===unit);
    if(p?.credentials.lockedUntil>now)return {error:'密碼錯誤次數過多暫時鎖定，請稍後重試'};
    if(!p){
      const salt=uid(),id=uid();p=s.players[id]={id,nameKey:key,name:String(b.name).trim(),unit,exp:0,season:2,items:[],overflow:[],effects:{},x:880,y:525,room:'PP00',lastLoginDate:nowDate(now),avatarId:assets.avatars.includes(b.avatarId)?b.avatarId:'office_1',credentials:{salt,hash:await pinHash(b.pin,salt),failures:0}};
    }else if(await pinHash(b.pin,p.credentials.salt)!==p.credentials.hash){p.credentials.failures++;if(p.credentials.failures>=5){p.credentials.lockedUntil=now+900000;p.credentials.failures=0;}return {error:'登入資料不正確或暫時鎖定，請稍後重試'};}
    p.credentials.failures=0;p.credentials.lockedUntil=0;p.totalLogins=(p.totalLogins||0)+1;
    const raw=uid()+uid();p.generation=uid();p.resumeRecovery=null;p.tokenHash=await digest(raw);p.sessionUntil=now+30*86400000;p.connection=String(b.connection||uid()).slice(0,80);p.lastSeen=now;
    act(s,p.id,'signin',{},now);return {...snapshot(s,p.id,now),token:raw};
  }
  const p=await identify(s,token,now);
  if(kind==='resume'){const oldHash=p.tokenHash,raw=uid()+uid();p.generation=uid();p.resumeRecovery={oldHash,requestId:b.requestId,until:now+30000,generation:p.generation};p.tokenHash=await digest(raw);p.sessionUntil=now+30*86400000;p.connection=String(b.connection||uid()).slice(0,80);p.lastSeen=now;act(s,p.id,'signin',{},now);return {...snapshot(s,p.id,now),token:raw};}
  if(kind==='snapshot')return snapshot(s,p.id,now);
  // Position and interaction commit together: no preliminary HTTP heartbeat is needed.
  if(b.pose&&typeof b.pose==='object')act(s,p.id,'heartbeat',b.pose,now);
  if(kind==='heartbeat'&&b.world){
    act(s,p.id,'heartbeat',b,now);
    const leader=Object.values(s.players).filter(q=>q.room===p.room&&q.lastSeen>now-35000).sort((a,b)=>a.connection.localeCompare(b.connection))[0];
    if(leader?.id===p.id)world(s,p,b.world,now);
  }
  else if(kind==='attack'){
    const leader=Object.values(s.players).filter(q=>q.room===p.room&&q.lastSeen>now-35000).sort((a,b)=>a.connection.localeCompare(b.connection))[0];
    if(b.world&&leader?.id===p.id)world(s,p,b.world,now,Math.random,true);
    combat(s,p,b,now);
  }
  else if(kind==='world')world(s,p,b,now);
  else act(s,p.id,kind,b,now);
  return kind==='logout'?{loggedOut:true,now}:snapshot(s,p.id,now);
}

// A lost rotation response can be recovered for 30 seconds only, by the same old token + request ID.
export async function canReplay(s,kind,token,requestId,meta,now){
 if(!meta)return false;
 const p=s.players[meta.playerId];if(!p)return false;
 if(kind==='logout')return meta.logoutHash===await digest(token);
 if(!p.tokenHash||p.sessionUntil<=now||p.generation!==meta.generation)return false;
 if(kind==='login'||kind==='register'||kind==='enter')return true; // Scope includes the exact submitted PIN and source hash.
 const h=await digest(token);if(p.tokenHash===h)return true;
 const r=p.resumeRecovery;
 return kind==='resume'&&r?.oldHash===h&&r.requestId===requestId&&r.until>now&&r.generation===p.generation;
}
