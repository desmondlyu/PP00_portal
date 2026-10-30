// Inventory limits and wearable costumes. Worn clothes retain their bag slot.
(function () {
  const isOutfit = item => item?.category === 'outfit';
  const worn = p => p.inventory.find(i => isOutfit(i) && i.uid === p.wornOutfitUid) || null;
  const outfitCount = p => p.inventory.filter(isOutfit).length;
  const resolveDur = item => typeof item?.durability === 'number' ? item.durability : (item?.maxDurability || 3);
  const resolveMaxDur = item => typeof item?.maxDurability === 'number' ? item.maxDurability : 3;
  const stack = (p, item) => {
    if (isOutfit(item) || !p || !Array.isArray(p.inventory)) return null;
    const itemDur = resolveDur(item);
    const itemMaxDur = resolveMaxDur(item);
    const exact = p.inventory.find(i => i.id === item.id && (!i.category || i.category === item.category) && resolveDur(i) === itemDur && resolveMaxDur(i) === itemMaxDur);
    if (exact) return exact;
    return p.inventory.find(i => i.id === item.id && (!i.category || i.category === item.category));
  };
  function canAdd(p, item, autoEquip = false) {
    if (isOutfit(item) && outfitCount(p) >= 3) return false;
    return (!isOutfit(item) && autoEquip && p.equippedSlots.some(i => !i)) || !!stack(p, item) || p.inventory.length < 10;
  }
  function add(p, item, autoEquip = false) {
    if (!canAdd(p, item, autoEquip)) return false;
    const copy = {...item, count: 1, durability: resolveDur(item), maxDurability: resolveMaxDur(item)};
    if (autoEquip && !isOutfit(item)) {
      const idx = p.equippedSlots.findIndex(i => !i);
      if (idx >= 0) { p.equippedSlots[idx] = copy; p.activeEquipIndex = idx; return true; }
    }
    const existing = stack(p, item);
    if (existing) {
      existing.count = (existing.count || 1) + 1;
      const curDur = resolveDur(existing);
      const newDur = resolveDur(item);
      if (newDur > curDur) existing.durability = newDur;
    } else {
      p.inventory.push(copy);
    }
    return true;
  }
  function migrate(p) {
    p.overflow ||= []; p.inventory ||= []; p.equippedSlots ||= [null, null, null];
    const bag = p.inventory; p.inventory = [];
    for (const entry of bag) {
      if (isOutfit(entry)) {
        for (let i = 0; i < (entry.count || 1); i++) {
          const one = {...entry, count: 1, uid: i ? entry.uid + '_split_' + i : entry.uid};
          if (!add(p, one)) p.overflow.push(one);
        }
      } else if (p.inventory.length < 10) p.inventory.push(entry);
      else p.overflow.push(entry);
    }
    if (!worn(p)) p.wornOutfitUid = null;
  }
  function wear(p, index) {
    const item = p.inventory[index]; if (!isOutfit(item) || item.durability <= 0) return false;
    p.wornOutfitUid = p.wornOutfitUid === item.uid ? null : item.uid; return true;
  }
  function damage(p) {
    const item = worn(p); if (!item) return null;
    item.durability = Math.max(0, item.durability - 1);
    if (!item.durability) { p.inventory.splice(p.inventory.indexOf(item), 1); p.wornOutfitUid = null; }
    return item;
  }
  function equip(p, index) {
    const item = p.inventory[index]; if (!item || isOutfit(item)) return false;
    let target = p.equippedSlots.findIndex(i => !i);
    if (target < 0) target = p.activeEquipIndex || 0;
    const old = p.equippedSlots[target];
    const candidate = {...p, inventory: p.inventory.map(i => ({...i})), equippedSlots: [...p.equippedSlots]};
    if ((item.count || 1) > 1) candidate.inventory[index].count--; else candidate.inventory.splice(index, 1);
    if (old && !add(candidate, old)) return false;
    candidate.equippedSlots[target] = {...item, count: 1};
    p.inventory = candidate.inventory; p.equippedSlots = candidate.equippedSlots; p.activeEquipIndex = target;
    return true;
  }
  function unequip(p, index) {
    const item = p.equippedSlots[index]; if (!item || !add(p, item)) return false;
    p.equippedSlots[index] = null; return true;
  }
  function claim(p, index) {
    const item = p.overflow[index]; if (!item || !add(p, item)) return false;
    if ((item.count || 1) > 1) item.count--; else p.overflow.splice(index, 1);
    return true;
  }
  const outfits = window.COSTUME_CATALOG.map(a => ({id:'outfit_' + a.id, avatarId:a.id, category:'outfit', wearType:a.wearType, name:a.name, emoji:a.badge, power:0, expBonusPct:0, knockbackExp:0, maxDurability:5, spawnRate:0, desc:'特殊服裝｜耐久 5｜NPC 命中時 40% 機率扣 1 點'}));
  window.GATHER_CONFIG.items.push(...outfits);
  window.OfficeWardrobe = {isOutfit, worn, outfitCount, canAdd, add, migrate, wear, damage, equip, unequip, claim, outfits};
})();
