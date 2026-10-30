const fs = require('fs');
const path = require('path');
const vm = require('vm');

const baseDir = fs.existsSync(path.resolve('static/js')) ? path.resolve('.') : path.resolve('tool/PP00_Gather');
const c = { window: {}, Math, Date };
vm.createContext(c);

for (const f of ['config', 'avatars', 'wardrobe', 'world']) {
  const filePath = path.join(baseDir, 'static/js', f + '.js');
  vm.runInContext(fs.readFileSync(filePath, 'utf8'), c);
}

const w = c.window;
const map = w.WORLD_MAP;
const tasks = [
  ...map.workstations.map((e, i) => ({ id: 'ws_' + i, x: e.x + e.w / 2, y: e.y + e.h + 18, name: e.owner })),
  ...map.labEquipments.map((e, i) => ({ id: 'lab_' + i, x: e.x + e.w / 2, y: e.y + e.h + 18, name: e.name }))
];

const walkable = [];
for (let y = 100; y < 1800; y += 20) {
  for (let x = 180; x < 2660; x += 20) {
    const f = w.findReachableDropPosition(x, y);
    if (Math.hypot(f.x - x, f.y - y) < 1) walkable.push([x, y]);
  }
}

const outPath = path.join(baseDir, 'server/assets.mjs');
const payload = {
  dropPolicy: {
    intervalMs: w.GATHER_CONFIG.security.randomDropIntervalMs,
    batchCount: w.GATHER_CONFIG.security.randomDropBatchCount,
    maxGround: w.GATHER_CONFIG.security.maxGroundItems,
    lifetimeMs: 1800000
  },
  mobPolicy: {
    chance: w.GATHER_CONFIG.security.mobSpawnChance,
    maxActive: w.GATHER_CONFIG.security.maxMobCount,
    cooldownMs: 300000
  },
  mobs: w.GATHER_CONFIG.minecraftMobs,
  items: w.GATHER_CONFIG.items,
  units: w.GATHER_CONFIG.units,
  avatars: w.AVATAR_CATALOG.map(a => a.id),
  tasks,
  walkable,
  colliders: [...map.walls, ...map.furnitureColliders, ...map.workstations, ...map.labEquipments]
};

fs.writeFileSync(outPath, '// Generated from existing catalog and map; regenerate after map/catalog changes.\nexport default ' + JSON.stringify(payload) + ';\n');
console.log('Successfully generated assets.mjs with', tasks.length, 'tasks,', walkable.length, 'walkable points,', payload.colliders.length, 'colliders.');
