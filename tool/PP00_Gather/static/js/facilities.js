// Compact accessible picker; materials are selected explicitly, never silently recycled.
(function(root){
 const spots=[
   {id:'rma',x:998,y:350,label:'接聽客訴電話（啟動 RMA 救火搶修）',action:'rma_claim'},
   {id:'lounge',x:1238,y:350,label:'電競娛樂室・猜拳對決／療傷',action:'lounge_start'},
   {id:'repair',x:1478,y:350,label:'保養武器・消耗 1 件材料',action:'repair_start'},
   {id:'shrine',x:1718,y:350,label:'乖乖祈福・3 秒',action:'shrine_start'},
   {id:'gacha',x:1963,y:350,label:'扭蛋・消耗 2 件材料',action:'gacha'}
 ];

 function nearby(p,s){
   const task=s?.task;
   if(task?.claimer===s?.player?.id){
     if(task.stage==='reporting'&&Math.hypot(p.x-998,p.y-350)<125)return {id:'rma_report',x:998,y:350,label:'🎖️ 救火任務完成，報到領取獎勵！',action:'rma_report'};
     if(task.stage==='repairing'&&Math.hypot(p.x-task.x,p.y-task.y)<125){
       const count=(task.repairedIds?.length||0)+1;
       return {id:'rma_target',x:task.x,y:task.y,label:`搶修設備 (${count}/3 台)・3 秒`,action:'rma_start'};
     }
   }
   return spots.find(f=>Math.hypot(p.x-f.x,p.y-f.y)<120);
 }

 function choose(title,items,{count=1,optional=false}={}){return new Promise(resolve=>{
  const dialog=document.createElement('dialog');dialog.className='s2-picker';const heading=document.createElement('h3');heading.textContent=title;dialog.append(heading);
  const form=document.createElement('form');form.method='dialog';const selected=new Set();
  for(const i of items){
    const label=document.createElement('label'),box=document.createElement('input');
    box.type=count===1?'radio':'checkbox';box.name='item';box.value=i.uid;
    box.addEventListener('change',()=>{if(count===1)selected.clear();if(box.checked)selected.add(i.uid);else selected.delete(i.uid);ok.disabled=selected.size!==count;});
    label.append(box,document.createTextNode(`${i.emoji||''} ${i.name} · ${i.durability}/${i.maxDurability||3}`));form.append(label);
  }
  const ok=document.createElement('button');ok.textContent='確認';ok.disabled=true;ok.value='ok';
  const cancel=document.createElement('button');cancel.textContent='取消';cancel.value='cancel';cancel.formNoValidate=true;
  form.append(ok,cancel);dialog.append(form);document.body.append(dialog);
  dialog.addEventListener('close',()=>{resolve(dialog.returnValue==='ok'?[...selected]:null);dialog.remove();},{once:true});
  dialog.showModal();
 });}

 function chooseOption(title, options){return new Promise(resolve=>{
  const dialog=document.createElement('dialog');dialog.className='s2-picker';
  const heading=document.createElement('h3');heading.textContent=title;dialog.append(heading);
  const form=document.createElement('form');form.method='dialog';let selected=options[0]?.id||null;
  for(const opt of options){
    const label=document.createElement('label'),box=document.createElement('input');
    box.type='radio';box.name='facility_opt';box.value=opt.id;if(opt.id===selected)box.checked=true;
    box.addEventListener('change',()=>{selected=opt.id;});
    label.append(box,document.createTextNode(' '+opt.name));form.append(label);
  }
  const ok=document.createElement('button');ok.textContent='確認';ok.value='ok';
  const cancel=document.createElement('button');cancel.textContent='取消';cancel.value='cancel';cancel.formNoValidate=true;
  form.append(ok,cancel);dialog.append(form);document.body.append(dialog);
  dialog.addEventListener('close',()=>{resolve(dialog.returnValue==='ok'?selected:null);dialog.remove();},{once:true});
  dialog.showModal();
 });}

 function showArcadeModal({ client, send, onResult } = {}) {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'arcade-rps-dialog';
    dialog.innerHTML = `
      <div class="arcade-cabinet">
        <div class="arcade-header">
          <div class="arcade-title">🕹️ 電競娛樂室・猜拳大對決</div>
          <button type="button" class="arcade-close-btn" title="關閉">✕</button>
        </div>
        <div class="arcade-sub">選定剪刀、石頭或布，街機拉霸隨機出拳！<br><span style="color:#fde047;">勝：隨機補給物資 +15 EXP｜敗：-10 EXP</span></div>
        <div class="arcade-slot-stage">
          <div class="slot-label">MACHINE CHOICE 電腦出拳</div>
          <div class="slot-reel-box">
            <div class="slot-reel-symbol">❓</div>
          </div>
          <div class="slot-status">請在下方選擇你的出拳</div>
        </div>
        <div class="arcade-player-choices">
          <button type="button" class="rps-choice-btn" data-choice="scissors">
            <span class="choice-icon">✌️</span>
            <span class="choice-name">剪刀</span>
          </button>
          <button type="button" class="rps-choice-btn" data-choice="rock">
            <span class="choice-icon">✊</span>
            <span class="choice-name">石頭</span>
          </button>
          <button type="button" class="rps-choice-btn" data-choice="paper">
            <span class="choice-icon">🖐️</span>
            <span class="choice-name">布</span>
          </button>
        </div>
        <div class="arcade-result-pane" style="display:none;">
          <div class="result-headline"></div>
          <div class="result-detail"></div>
          <div class="result-actions">
            <button type="button" class="arcade-action-btn primary btn-replay">再來一局</button>
            <button type="button" class="arcade-action-btn btn-exit">結束離開</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);
    dialog.showModal();

    const cabinet = dialog.querySelector('.arcade-cabinet');
    const closeBtn = dialog.querySelector('.arcade-close-btn');
    const reelSymbol = dialog.querySelector('.slot-reel-symbol');
    const slotStatus = dialog.querySelector('.slot-status');
    const choicesDiv = dialog.querySelector('.arcade-player-choices');
    const resultPane = dialog.querySelector('.arcade-result-pane');
    const headline = dialog.querySelector('.result-headline');
    const detail = dialog.querySelector('.result-detail');
    const replayBtn = dialog.querySelector('.btn-replay');
    const exitBtn = dialog.querySelector('.btn-exit');
    const choiceBtns = dialog.querySelectorAll('.rps-choice-btn');

    const choicesMap = {
      scissors: { name: '剪刀', icon: '✌️', beats: 'paper' },
      rock: { name: '石頭', icon: '✊', beats: 'scissors' },
      paper: { name: '布', icon: '🖐️', beats: 'rock' }
    };
    const choiceKeys = ['scissors', 'rock', 'paper'];

    function closeDialog() {
      dialog.close();
      dialog.remove();
      resolve();
    }

    closeBtn.addEventListener('click', closeDialog);
    exitBtn.addEventListener('click', closeDialog);

    function resetRound() {
      cabinet.classList.remove('shake');
      reelSymbol.className = 'slot-reel-symbol';
      reelSymbol.textContent = '❓';
      slotStatus.textContent = '請在下方選擇你的出拳';
      choiceBtns.forEach(b => {
        b.disabled = false;
        b.classList.remove('selected');
      });
      choicesDiv.style.display = 'flex';
      resultPane.style.display = 'none';
    }

    replayBtn.addEventListener('click', resetRound);

    choiceBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const playerChoiceKey = btn.dataset.choice;
        const playerChoice = choicesMap[playerChoiceKey];
        if (!playerChoice) return;

        choiceBtns.forEach(b => {
          b.disabled = true;
          if (b === btn) b.classList.add('selected');
        });

        reelSymbol.className = 'slot-reel-symbol rolling';
        slotStatus.textContent = '🎰 拉霸機高速旋轉中……';

        let spinCount = 0;
        const spinInterval = setInterval(() => {
          reelSymbol.textContent = choicesMap[choiceKeys[spinCount % 3]].icon;
          spinCount++;
        }, 65);

        await new Promise(r => setTimeout(r, 1200));
        clearInterval(spinInterval);

        const compChoiceKey = choiceKeys[Math.floor(Math.random() * choiceKeys.length)];
        const compChoice = choicesMap[compChoiceKey];

        reelSymbol.className = 'slot-reel-symbol landed';
        reelSymbol.textContent = compChoice.icon;

        let outcome = 'tie';
        if (playerChoiceKey === compChoiceKey) {
          outcome = 'tie';
        } else if (playerChoice.beats === compChoiceKey) {
          outcome = 'win';
        } else {
          outcome = 'lose';
        }

        choicesDiv.style.display = 'none';
        resultPane.style.display = 'flex';
        headline.className = 'result-headline ' + outcome;

        if (outcome === 'win') {
          headline.textContent = '🎉 勝利 VICTORY！';
          slotStatus.textContent = `恭喜獲勝！電腦出了 ${compChoice.icon} ${compChoice.name}`;
          detail.textContent = `你出【${playerChoice.icon} ${playerChoice.name}】成功擊破電腦【${compChoice.icon} ${compChoice.name}】！獲得隨機補給物資與 +15 EXP！`;
          
          if (typeof globalThis.spawnConfetti === 'function') {
            globalThis.spawnConfetti(window.innerWidth / 2, window.innerHeight / 2);
          }

          if (client && typeof send === 'function') {
            await send('lounge_game', { outcome: 'win' }).catch(() => {});
          } else if (typeof onResult === 'function') {
            onResult('win');
          }
        } else if (outcome === 'lose') {
          headline.textContent = '💀 戰敗 DEFEAT！';
          slotStatus.textContent = `遺憾落敗！電腦出了 ${compChoice.icon} ${compChoice.name}`;
          detail.textContent = `你出【${playerChoice.icon} ${playerChoice.name}】遭電腦【${compChoice.icon} ${compChoice.name}】擊破！扣除 -10 EXP。`;
          cabinet.classList.add('shake');

          if (client && typeof send === 'function') {
            await send('lounge_game', { outcome: 'lose' }).catch(() => {});
          } else if (typeof onResult === 'function') {
            onResult('lose');
          }
        } else {
          headline.textContent = '🤝 平手 DRAW！';
          slotStatus.textContent = `雙方出拳相同！平局`;
          detail.textContent = `雙方皆出【${playerChoice.icon} ${playerChoice.name}】！勢均力敵，不增減經驗值。`;
        }
      });
    });
  });
 }

 async function use(f,client,getPose=()=>undefined){
  const send=(action,data={})=>client?.send(action,{...data,pose:getPose()});
  const p=client?.snapshot?.player;
  const free=p?.items?.filter(i=>['weapon','item'].includes(i.category)&&i.slot==null&&!p.pending?.materials.includes(i.uid))||[];
  if(f.id==='gacha'){const materials=await choose('選擇兩件未裝備道具作為扭蛋材料',free,{count:2});if(!materials)return;await send('gacha',{materials});}
  else if(f.id==='repair'){const target=await choose('選擇要修復的武器',p.items.filter(i=>['weapon','item'].includes(i.category)&&i.durability<i.maxDurability));if(!target)return;const materials=await choose('選擇一件拆解材料',free.filter(i=>i.uid!==target[0]));if(!materials)return;await send('repair_start',{target:target[0],materials});}
  else if(f.id==='lounge'){
    const now = client?.snapshot?.now || Date.now();
    const hasLight = (p?.effects?.lightUntil || globalThis.localPlayer?.lightInjuredUntil || 0) > now;
    const hasInjured = (p?.effects?.injuredUntil || 0) > now || !!globalThis.localPlayer?.isInjured;
    if(hasLight || hasInjured){
      const choice = await chooseOption('電競娛樂室：你目前身受挫傷！請選擇行動', [
        { id: 'heal', name: '🩹 進行打電動療傷 (5 秒消除挫傷並獲得增益)' },
        { id: 'game', name: '🕹️ 挑戰電競猜拳 (剪刀石頭布拉霸對決)' }
      ]);
      if(!choice) return;
      if(choice === 'heal'){
        if(client) await send('lounge_start');
        else if(typeof globalThis.startNonSeasonHealing === 'function') globalThis.startNonSeasonHealing();
      } else {
        await showArcadeModal({ client, send, onResult: globalThis.handleNonSeasonArcadeResult });
      }
    } else {
      await showArcadeModal({ client, send, onResult: globalThis.handleNonSeasonArcadeResult });
    }
  }
  else if(client) await send(f.action);
 }

 root.OfficeFacilities={spots,nearby,choose,chooseOption,showArcadeModal,use};
})(globalThis);
