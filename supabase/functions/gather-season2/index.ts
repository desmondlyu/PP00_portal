// Opaque Gather session authentication is performed in service.mjs, not by the gateway JWT.
import {request,digest,identify,canReplay} from './service.mjs';
const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const allowed=new Set(['https://desmondlyu.github.io','http://localhost:8139','http://localhost:5173']);
async function rpc(name:string,args:unknown={}){
 const res=await fetch(url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(args)});
 if(!res.ok)throw new Error('後端暫時無法使用');return res.json();
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('Origin')||'';
 const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':allowed.has(origin)?origin:'https://desmondlyu.github.io','Access-Control-Allow-Headers':'content-type,apikey,authorization,x-gather-session','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
 const out=(body:any,status=200)=>{const {_auth,...publicBody}=body||{};return new Response(JSON.stringify(publicBody),{status,headers});};
 if(origin&&!allowed.has(origin))return out({error:'來源不允許'},403);
 if(req.method==='OPTIONS')return out({});if(req.method!=='POST')return out({error:'Method not allowed'},405);
 try{
  const raw=await req.text();if(raw.length>60000)return out({error:'請求過大'},413);
  const b=JSON.parse(raw),token=req.headers.get('x-gather-session')||'';
  if(b.action==='status'){const state=await rpc('gather_s2_load');return out({enabled:state.enabled,now:state.now});}
  if(b.protocol!=='cloud6-20261026')return out({error:'請重新整理遊戲，載入最新登入版本'},426);
  if(!/^[0-9a-f-]{36}$/i.test(b.requestId||'')||typeof b.action!=='string')return out({error:'請求格式不正確'},400);
  const source=await digest((req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim());
  const scope=await digest(token||JSON.stringify([b.action,b.data?.name,b.data?.unit,b.data?.pin,source]));

  const transient=['heartbeat','world','snapshot'].includes(b.action);
  for(let attempt=0;attempt<6;attempt++){
   const loaded=await rpc('gather_s2_load');if(!loaded.enabled)return out({error:'新版進度尚未開放'},503);
   const prior=transient?null:await rpc('gather_s2_receipt',{p_scope:scope,p_request:b.requestId});
   if(prior){if(await canReplay(loaded.state,b.action,token,b.requestId,prior._auth,loaded.now))return out(prior);return out({error:'登入已失效，請重新輸入個人密碼'},401);}
   let owner:any=null;
   if(!['login','register','enter'].includes(b.action)){try{owner=await identify(loaded.state,token,loaded.now);}catch{return out({error:'登入已失效，請重新輸入個人密碼'},401);}}

   let result;
   try{result=await request(loaded.state,b.action,{...(b.data||{}),requestId:b.requestId},token,loaded.now,source);}catch(e){return out({error:e.message},400);}
   const current=owner||loaded.state.players[result.player?.id];
   result._auth=current?{playerId:current.id,generation:current.generation,logoutHash:b.action==='logout'?await digest(token):undefined}:null;
   if(b.action==='snapshot')return out(result);
   const ok=await rpc('gather_s2_commit',{p_revision:loaded.revision,p_state:loaded.state,p_scope:scope,p_request:b.requestId,p_result:transient?null:result});
   if(ok)return out(result);
   // Reload state and validate receipt ownership again on the next CAS attempt.
  }
  return out({error:'辦公室忙碌中，請以同一請求重試'},409);
 }catch(e){return out({error:'同步未完成，請重試'},503);}
});
