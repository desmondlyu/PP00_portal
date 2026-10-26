const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function game(send){
 const c={console,Date,Math,setTimeout:()=>0,clearTimeout(){},localStorage:{getItem:()=>null,setItem(){},removeItem(){},key(){return null},length:0},document:{getElementById:()=>null},window:{addEventListener(){}}};vm.createContext(c);
 for(const f of ['config','world','progression','combat'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../static/js',f+'.js'),'utf8'),c);
 c.window.OfficeProgression=c.OfficeProgression;c.testSend=send;
 let s=fs.readFileSync(path.join(__dirname,'../static/js/app.js'),'utf8');s=s.replace("  window.addEventListener('DOMContentLoaded', init);",`
 isLoggedIn=true;network={npcPlayers:new Map(),isRoomMaster:()=>true,broadcastPacket(){},getAllOtherPlayers:()=>[]};ecosystem={groundItems:[],mobs:[]};
 showCombatToast=()=>{};season.client={send:testSend,snapshot:{player:{id:'p',effects:{}},players:[],drops:[]}};
 window.testGame={season,player:localPlayer,attack:triggerWeaponAttack,interact:seasonInteract,poll:seasonPoll,get network(){return network},get ecosystem(){return ecosystem}};
 `);vm.runInContext(s,c);c.window.isPositionBlocked=()=>false;
 const g=c.window.testGame;g.player.x=1000;g.player.y=520;g.player.equippedSlots=[{id:'pizza',emoji:'🍕',durability:3},null,null];return {g,c};
}
test('pickup hides immediately and sends a single request containing current position',async()=>{
 let done;const calls=[],{g}=game((action,data)=>{calls.push({action,data});return new Promise(r=>done=r)});
 const d={uid:'drop',id:'coffee',name:'咖啡',x:1075,y:520,seasonDrop:true};g.ecosystem.groundItems=[d];g.season.client.snapshot.drops=[d];
 const job=g.interact();assert.equal(g.ecosystem.groundItems.length,0,'pickup should respond before network');
 assert.deepEqual(calls.map(c=>c.action),['pickup']);assert.equal(calls[0].data.pose.x,1000);done({player:{}});await job;
});
test('failed pickup restores the visible item without granting any inventory',async()=>{
 const {g}=game(async()=>{throw Error('背包已滿')});const d={uid:'drop',name:'咖啡',x:1075,y:520,seasonDrop:true};g.ecosystem.groundItems=[d];g.season.client.snapshot.drops=[d];
 await g.interact();assert.equal(g.ecosystem.groundItems[0]?.uid,'drop');assert.equal(g.player.inventory.length,0);
});
test('attack reacts locally before one cloud request returns and never queues duplicate attacks',async()=>{
 let done;const calls=[],{g,c}=game((action,data)=>{calls.push({action,data});return new Promise(r=>done=r)});
 const npc={id:'npc_security_guard',x:1060,y:520};g.network.npcPlayers.set(npc.id,npc);
 g.attack();assert.deepEqual(calls.map(c=>c.action),['attack']);assert.equal(calls[0].data.pose.x,1000);
 assert.equal(npc.combatReaction?.predicted,true);assert(c.window.OfficeCombat.reactionPose(npc,Date.now()+100).active);
 g.attack();assert.equal(calls.length,1);done({player:{}});await Promise.resolve();await Promise.resolve();
});
test('background polling leaves an active user request alone',async()=>{
 const calls=[],{g}=game(async(action)=>{calls.push(action);return {}});g.season.client.busy=true;g.season.client.pending={action:'pickup'};g.season.client.retry=()=>{throw Error('poll replayed active request')};
 await g.poll();assert.equal(calls.length,0);
});
