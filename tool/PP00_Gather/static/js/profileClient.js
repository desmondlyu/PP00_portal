// A transaction keeps its request ID through retries, including across reloads.
(function(root){
 class GatherProfileClient {
  constructor(url,{storage=null,onSnapshot=()=>{},onError=()=>{}}={}){this.url=url;this.storage=storage;this.onSnapshot=onSnapshot;this.onError=onError;this.token=storage?.getItem('gather_s2_token')||'';this.queue=Promise.resolve();this.pending=null;}
  async raw(body,token=this.token){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);try{const res=await fetch(this.url,{method:'POST',headers:{'Content-Type':'application/json','x-gather-session':token},body:JSON.stringify(body),signal:controller.signal});const data=await res.json();if(data.error){const e=new Error(data.error);e.final=res.status!==409&&res.status!==503;throw e;}if(!res.ok)throw new Error('同步未完成');return data;}finally{clearTimeout(timer);}}
  send(action,data={}){
   const work=async()=>{
    if(this.pending)throw new Error('上一筆操作尚未確認，請先重試同步');
    const req={action,data,requestId:crypto.randomUUID()};return this.run(req);
   };const result=this.queue.then(work);this.queue=result.catch(()=>{});return result;
  }
  async run(req){
   this.pending=req;if(!['login','register'].includes(req.action))this.storage?.setItem('gather_s2_pending',JSON.stringify({req,token:this.token}));
   try{let result;for(let i=0;i<2;i++){try{result=await this.raw(req);break;}catch(e){if(e.final||i===1)throw e;}}
    this.pending=null;this.storage?.removeItem('gather_s2_pending');if(result.token){this.token=result.token;this.storage?.setItem('gather_s2_token',this.token);}if(result.player){this.snapshot=result;this.onSnapshot(result);}return result;
   }catch(e){if(e.final){this.pending=null;this.storage?.removeItem('gather_s2_pending');}this.onError(e);throw e;}
  }
  async recover(){const raw=this.storage?.getItem('gather_s2_pending');if(!raw)return;const saved=JSON.parse(raw);if(saved.token!==this.token)return;return this.run(saved.req);}
  retry(){if(this.pending)return this.run(this.pending);return this.recover();}
  async flush(){await this.queue;if(this.pending)await this.retry();}
  clear(){this.token='';this.storage?.removeItem('gather_s2_token');this.storage?.removeItem('gather_s2_pending');this.pending=null;}
 }
 root.GatherProfileClient=GatherProfileClient;
})(globalThis);
