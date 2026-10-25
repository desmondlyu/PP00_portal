const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function game(){const c={window:{},Math,Date};vm.createContext(c);for(const f of ['config','world','combat'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../static/js',f+'.js'),'utf8'),c);return c.window;}
test('drops inside desks, tables, walls and outside the map relocate to reachable floor',()=>{
 const w=game();assert.equal(typeof w.findReachableDropPosition,'function');
 for(const p of [...w.WORLD_MAP.workstations,...w.WORLD_MAP.labEquipments,...w.WORLD_MAP.furnitureColliders,...w.WORLD_MAP.walls]){
  const spot=w.findReachableDropPosition(p.x+p.w/2,p.y+p.h/2);assert(spot);assert(!w.isPositionBlocked(spot.x,spot.y,18));
 }
 for(const [x,y] of [[-500,-500],[9999,9999]]){const p=w.findReachableDropPosition(x,y);assert(p);assert(!w.isPositionBlocked(p.x,p.y,18));}
});
test('clear but sealed floor is not a valid drop area; valid floor stays put',()=>{
 const w=game();assert.equal(typeof w.findReachableDropPosition,'function');
 w.WORLD_MAP={width:400,height:400,toiletStalls:[],walls:[{x:220,y:0,w:20,h:400}],workstations:[],labEquipments:[],furnitureColliders:[]};
 // Entry on the west side; east side is isolated by a solid wall.
 const p=w.findReachableDropPosition(260,150,{x:190,y:150});assert(p.x<220);
 const q=w.findReachableDropPosition(p.x,p.y,{x:190,y:150});assert.equal(q.x,p.x);assert.equal(q.y,p.y);
});
test('existing shared loot is repaired only by the master without changing ownership or durability',()=>{
 const w=game(),desk=w.WORLD_MAP.workstations[0],item={uid:'same',id:'bench',durability:1,x:desk.x+20,y:desk.y+20};
 const n={clientId:'a',localPlayer:{},remotePlayers:new Map(),npcPlayers:new Map(),callbacks:{},broadcastPacket(){},isRoomMaster:()=>false};
 w.OfficeCombat.state(n).items.push(item);w.OfficeCombat.update(n,120);assert.equal(item.x,desk.x+20);
 n.isRoomMaster=()=>true;w.OfficeCombat.update(n,120);assert(!w.isPositionBlocked(item.x,item.y,18));assert.equal(item.uid,'same');assert.equal(item.durability,1);assert.equal(n.combat.items.length,1);
});
test('normal targeted and initial random drops land on reachable floor',()=>{
 const w=game();const eco=new w.OfficeEcosystem();
 const desk=w.WORLD_MAP.workstations[0];const item=eco.spawnDropAt(desk.x+desk.w/2,desk.y+desk.h/2,{id:'bench',name:'板凳'});
 assert(item);assert(!w.isPositionBlocked(item.x,item.y,18));
 for(const drop of eco.groundItems)assert(!w.isPositionBlocked(drop.x,drop.y,18));
});
