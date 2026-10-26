// Compact accessible picker; materials are selected explicitly, never silently recycled.
(function(root){
 const spots=[{id:'rma',x:998,y:350,label:'接聽客訴電話（啟動 RMA 救火搶修）',action:'rma_claim'}, {id:'lounge',x:1238,y:350,label:'打電動療傷・5 秒',action:'lounge_start'}, {id:'repair',x:1478,y:350,label:'保養武器・消耗 1 件材料',action:'repair_start'}, {id:'shrine',x:1718,y:350,label:'乖乖祈福・3 秒',action:'shrine_start'}, {id:'gacha',x:1963,y:350,label:'扭蛋・消耗 2 件材料',action:'gacha'}];
 function nearby(p,s){const task=s?.task;if(task?.claimer===s?.player?.id){if(task.stage==='reporting'&&Math.hypot(p.x-998,p.y-350)<95)return {id:'rma_report',x:998,y:350,label:'🎖️ 救火任務完成，報到領取獎勵！',action:'rma_report'};if(task.stage==='repairing'&&Math.hypot(p.x-task.x,p.y-task.y)<95){const count=(task.repairedIds?.length||0)+1;return {id:'rma_target',x:task.x,y:task.y,label:`搶修設備 (${count}/3 台)・3 秒`,action:'rma_start'};}}return spots.find(f=>Math.hypot(p.x-f.x,p.y-f.y)<90);}
 function choose(title,items,{count=1,optional=false}={}){return new Promise(resolve=>{
  const dialog=document.createElement('dialog');dialog.className='s2-picker';const heading=document.createElement('h3');heading.textContent=title;dialog.append(heading);
  const form=document.createElement('form');form.method='dialog';const selected=new Set();
  for(const i of items){const label=document.createElement('label'),box=document.createElement('input');box.type=count===1?'radio':'checkbox';box.name='item';box.value=i.uid;box.addEventListener('change',()=>{if(count===1)selected.clear();if(box.checked)selected.add(i.uid);else selected.delete(i.uid);ok.disabled=selected.size!==count;});label.append(box,document.createTextNode(`${i.emoji||''} ${i.name} · ${i.durability}/${i.maxDurability||3}`));form.append(label);}
  const ok=document.createElement('button');ok.textContent='確認';ok.disabled=true;ok.value='ok';const cancel=document.createElement('button');cancel.textContent='取消';cancel.value='cancel';cancel.formNoValidate=true;form.append(ok,cancel);dialog.append(form);document.body.append(dialog);
  dialog.addEventListener('close',()=>{resolve(dialog.returnValue==='ok'?[...selected]:null);dialog.remove();},{once:true});dialog.showModal();
 });}
 async function use(f,client,getPose=()=>undefined){
  const send=(action,data={})=>client.send(action,{...data,pose:getPose()});
  const p=client.snapshot.player,free=p.items.filter(i=>['weapon','item'].includes(i.category)&&i.slot==null&&!p.pending?.materials.includes(i.uid));
  if(f.id==='gacha'){const materials=await choose('選擇兩件未裝備道具作為扭蛋材料',free,{count:2});if(!materials)return;await send('gacha',{materials});}
  else if(f.id==='repair'){const target=await choose('選擇要修復的武器',p.items.filter(i=>['weapon','item'].includes(i.category)&&i.durability<i.maxDurability));if(!target)return;const materials=await choose('選擇一件拆解材料',free.filter(i=>i.uid!==target[0]));if(!materials)return;await send('repair_start',{target:target[0],materials});}
  else await send(f.action);
 }
 root.OfficeFacilities={spots,nearby,choose,use};
})(globalThis);
