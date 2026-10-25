// PP00 Gather Office — 十種誇張花俏人物造型 + 10 種情境動作骨骼動畫 + NPC 暴走紅蓮氣場引擎

window.COSTUME_CATALOG = [
  {
    id: 'minotaur',
    wearType: 'headgear',
    name: '牛頭套狂戰士',
    tag: '鼻孔噴氣・霸氣鎮場',
    badge: '🐮',
    primary: '#b45309',
    secondary: '#fde68a',
    desc: '頂著超巨大立體牛頭套與純金鼻環，走路自帶氣場與白煙！',
  },
  {
    id: 'frog_eng',
    wearType: 'suit',
    name: '青蛙裝工程師',
    tag: '充氣偶裝・肝帝代表',
    badge: '🐸',
    primary: '#22c55e',
    secondary: '#bbf7d0',
    desc: '全身綠油油充氣青蛙裝，胸前還掛著 PP00 工程師識別證。',
  },
  {
    id: 'wafer_mecha',
    wearType: 'headgear',
    name: '晶圓盒鋼彈',
    tag: '12吋FOUP・雷射護目鏡',
    badge: '🤖',
    primary: '#3b82f6',
    secondary: '#93c5fd',
    desc: '把 12 吋晶圓傳送盒當成機甲頭盔，雙眼掃描良率異常！',
  },
  {
    id: 'trex_intern',
    wearType: 'suit',
    name: '充氣暴龍實習生',
    tag: '小短手・甩尾狂奔',
    badge: '🦖',
    primary: '#f97316',
    secondary: '#fed7aa',
    desc: '橘色巨型充氣暴龍裝，短短小手拿著探針卡，走路尾巴狂甩。',
  },
  {
    id: 'boba_head',
    wearType: 'headgear',
    name: '波霸珍奶頭怪客',
    tag: '全糖少冰・珍珠滾動',
    badge: '🧋',
    primary: '#d97706',
    secondary: '#fef3c7',
    desc: '整顆頭是一杯透明波霸珍奶，裡面的黑糖珍珠會隨步伐滾動！',
  },
  {
    id: 'kuaikuai_god',
    wearType: 'suit',
    name: '神聖綠乖乖本尊',
    tag: '機台守護神・綠燈保證',
    badge: '🟢',
    primary: '#10b981',
    secondary: '#a7f3d0',
    desc: '化身巨型綠色奶油椰子乖乖包裝本體，頭頂懸浮神聖金光環！',
  },
  {
    id: 'code_wizard',
    wearType: 'suit',
    name: '鍵盤大法師',
    tag: 'RGB法杖・零Bug咒語',
    badge: '🧙‍♂️',
    primary: '#8b5cf6',
    secondary: '#ddd6fe',
    desc: '巫師帽、紫色長袍與發光鍵盤法杖，保留原本臉部與眼鏡。',
  },
  {
    id: 'shark_slacker',
    wearType: 'suit',
    name: '鯊魚布偶摸魚王',
    tag: '嘴叼披薩・茶水間霸主',
    badge: '🦈',
    primary: '#0284c7',
    secondary: '#bae6fd',
    desc: '藍白鯊魚連身布偶裝，嘴裡還咬著一片起司披薩，走路冒水泡。',
  },
  {
    id: 'alien_debug',
    wearType: 'suit',
    name: '外星天線 Debug 客',
    tag: '雙球天線・腦波通靈',
    badge: '👽',
    primary: '#84cc16',
    secondary: '#ecfccb',
    desc: '螢光綠外星人身穿銀色無塵衣，頭頂雙天線會隨時閃爍青色電弧。',
  },
  {
    id: 'crt_bot',
    wearType: 'headgear',
    name: '復古 CRT 電視頭',
    tag: '映像管顏文字・波形臉',
    badge: '📺',
    primary: '#64748b',
    secondary: '#e2e8f0',
    desc: '復古映像管外殼頭套，螢幕開口露出原人物的臉與眼鏡。',
  },
];

// 🔒 NPC 專屬獨立人物造型目錄（嚴格與使用者 10 種造型完全區隔、絕不重複，且不開放給使用者登入選用）
window.AVATAR_CATALOG = [
  {
    "id": "office_1",
    "name": "青年西裝同事",
    "gender": "male",
    "age": 26,
    "body": "slim",
    "style": "suit",
    "primary": "#334155",
    "secondary": "#f1f5f9",
    "hair": "#30241e",
    "glasses": false,
    "skin": "#edc3a1",
    "badge": "▣",
    "tag": "26 歲・日常上班穿搭",
    "desc": "青年西裝同事，26 歲。外觀不影響移動速度與戰力。"
  },
  {
    "id": "office_2",
    "name": "襯衫工程師",
    "gender": "male",
    "age": 35,
    "body": "tall",
    "style": "shirt",
    "primary": "#93c5fd",
    "secondary": "#1e293b",
    "hair": "#27272a",
    "glasses": true,
    "skin": "#d6a17d",
    "badge": "▣",
    "tag": "35 歲・日常上班穿搭",
    "desc": "襯衫工程師，35 歲。外觀不影響移動速度與戰力。"
  },
  {
    "id": "office_3",
    "name": "運動服同事",
    "gender": "male",
    "age": 29,
    "body": "broad",
    "style": "sport",
    "primary": "#166534",
    "secondary": "#d1fae5",
    "hair": "#292524",
    "glasses": false,
    "skin": "#bd8968",
    "badge": "▣",
    "tag": "29 歲・日常上班穿搭",
    "desc": "運動服同事，29 歲。外觀不影響移動速度與戰力。"
  },
  {
    "id": "office_4",
    "name": "針織衫前輩",
    "gender": "male",
    "age": 52,
    "body": "stocky",
    "style": "knit",
    "primary": "#92400e",
    "secondary": "#fef3c7",
    "hair": "#94a3b8",
    "glasses": true,
    "skin": "#edc3a1",
    "badge": "▣",
    "tag": "52 歲・日常上班穿搭",
    "desc": "針織衫前輩，52 歲。外觀不影響移動速度與戰力。"
  },
  {
    "id": "office_5",
    "name": "休閒外套同事",
    "gender": "male",
    "age": 44,
    "body": "regular",
    "style": "jacket",
    "primary": "#475569",
    "secondary": "#e2e8f0",
    "hair": "#57534e",
    "glasses": false,
    "skin": "#d6a17d",
    "badge": "▣",
    "tag": "44 歲・日常上班穿搭",
    "desc": "休閒外套同事，44 歲。外觀不影響移動速度與戰力。"
  },
  {
    "id": "office_6",
    "name": "俐落西裝同事",
    "gender": "female",
    "age": 32,
    "body": "tall",
    "style": "suit",
    "primary": "#713f62",
    "secondary": "#fce7f3",
    "hair": "#292524",
    "glasses": false,
    "skin": "#bd8968",
    "badge": "▣",
    "tag": "32 歲・日常上班穿搭",
    "desc": "俐落西裝同事，32 歲。外觀不影響移動速度與戰力。"
  },
  {
    "id": "office_7",
    "name": "襯衫同事",
    "gender": "female",
    "age": 25,
    "body": "slim",
    "style": "shirt",
    "primary": "#f5e6ce",
    "secondary": "#475569",
    "hair": "#78350f",
    "glasses": true,
    "skin": "#edc3a1",
    "badge": "▣",
    "tag": "25 歲・日常上班穿搭",
    "desc": "襯衫同事，25 歲。外觀不影響移動速度與戰力。"
  },
  {
    "id": "office_8",
    "name": "運動外套同事",
    "gender": "female",
    "age": 38,
    "body": "broad",
    "style": "sport",
    "primary": "#0f766e",
    "secondary": "#ccfbf1",
    "hair": "#30241e",
    "glasses": false,
    "skin": "#d6a17d",
    "badge": "▣",
    "tag": "38 歲・日常上班穿搭",
    "desc": "運動外套同事，38 歲。外觀不影響移動速度與戰力。"
  },
  {
    "id": "office_9",
    "name": "針織衫資深同事",
    "gender": "female",
    "age": 56,
    "body": "stocky",
    "style": "knit",
    "primary": "#9f5368",
    "secondary": "#ffe4e6",
    "hair": "#a8a29e",
    "glasses": true,
    "skin": "#bd8968",
    "badge": "▣",
    "tag": "56 歲・日常上班穿搭",
    "desc": "針織衫資深同事，56 歲。外觀不影響移動速度與戰力。"
  },
  {
    "id": "office_10",
    "name": "休閒襯衫同事",
    "gender": "female",
    "age": 46,
    "body": "regular",
    "style": "shirt",
    "primary": "#c4b5fd",
    "secondary": "#334155",
    "hair": "#57534e",
    "glasses": false,
    "skin": "#edc3a1",
    "badge": "▣",
    "tag": "46 歲・日常上班穿搭",
    "desc": "休閒襯衫同事，46 歲。外觀不影響移動速度與戰力。"
  }
];

window.NPC_AVATAR_CATALOG = [
  {
    id: 'npc_vp_uncle',
    name: '白髮微胖西裝大叔 (VP專屬)',
    tag: '銀白背頭・金框眼鏡・深藍高定西裝',
    badge: '👔',
    primary: '#1e3a8a',
    secondary: '#fde047',
    desc: 'VP 大老闆專屬形象：慈祥又霸氣的白髮微胖大叔，鼻樑架著金框眼鏡，身穿深海軍藍高定西裝與純金領帶。',
  },
  {
    id: 'npc_dir_pp00_slim',
    name: '灰髮纖瘦西裝大叔 (PP00處長專屬)',
    tag: '鐵灰分線髮・精實纖瘦・酒紅領帶鐵灰西裝',
    badge: '🕴️',
    primary: '#334155',
    secondary: '#f43f5e',
    desc: 'PP00 處長專屬形象：身材纖瘦俐落的灰髮中年大叔，身穿與 VP 截然不同的鐵灰修身三件式西裝與酒紅斜紋領帶。',
  },
  {
    id: 'npc_auntie_meifeng',
    name: '桃紅花巾打掃阿姨 (美鳳姐專屬)',
    tag: '捲髮花頭巾・粉色圍裙・黃金掃把',
    badge: '🧹',
    primary: '#db2777',
    secondary: '#fbcfe8',
    desc: '打掃阿姨美鳳姐專屬形象：親切波浪捲髮包著桃紅碎花頭巾，身穿玫瑰粉保潔圍裙。',
  },
  {
    id: 'npc_auntie_shufen',
    name: '藍格頭巾打掃阿姨 (淑芬姐專屬)',
    tag: '包頭藍格巾・青色防水圍裙・家事手套',
    badge: '🧽',
    primary: '#0891b2',
    secondary: '#cffafe',
    desc: '打掃阿姨淑芬姐專屬形象：俐落包頭綁著天藍格紋頭巾，身穿青色防水圍裙與亮黃橡膠手套。',
  },
  {
    id: 'npc_flamingo_cmd',
    name: '紅鶴頭套指揮官 (鳥人NPC專屬)',
    tag: '粉紅長頸・極速奔襲・特殊NPC專用',
    badge: '🦩',
    primary: '#ec4899',
    secondary: '#fbcfe8',
    desc: '特殊 NPC 鳥人指揮官專屬形象：頭戴超吸睛立體粉紅紅鶴頭套，奔跑時雙翼狂拍！',
  },
  {
    id: 'npc_security_guard',
    name: '深藍制服安保警衛 (夜間警衛老李專屬)',
    tag: '金徽大盤帽・深藍防暴制服・手持黑色警棍',
    badge: '🏏',
    primary: '#1e3a8a',
    secondary: '#facc15',
    desc: '夜間巡邏警衛專屬形象：頭戴金屬警徽大盤帽、身穿深藍安保制服與防暴背心、手持黑色警棍巡視全場守護辦公室。',
  },
];

window.getAvatarMetaById = function (avatarId) {
  return (
    window.AVATAR_CATALOG.find((a) => a.id === avatarId) ||
    window.NPC_AVATAR_CATALOG.find((a) => a.id === avatarId) ||
    window.COSTUME_CATALOG.find((a) => a.id === avatarId) ||
    window.AVATAR_CATALOG[0]
  );
};

window.getAvatarAppearance = function(baseId,outfitId) {
  const person=window.AVATAR_CATALOG.find(a=>a.id===baseId)||null;
  const costume=person?window.COSTUME_CATALOG.find(a=>a.id===outfitId)||null:null;
  return {person,costume,renderId:costume?.wearType==='suit'&&costume.id!=='code_wizard'?costume.id:baseId};
};
function drawWearableLayer(ctx,costume,tick) {
  if(!costume)return;
  ctx.save();
  // Never paint inside the face opening: (-11,-27) to (11,-4).
  const frame=(color,top=-34,width=19)=>{
    ctx.fillStyle=color;ctx.fillRect(-width,top,width*2,-27-top);
    ctx.fillRect(-width,-27,width-11,29);ctx.fillRect(11,-27,width-11,29);ctx.fillRect(-width,-4,width*2,6);
    ctx.fillStyle='rgba(255,255,255,.3)';ctx.fillRect(-width,top,width*2,2);
    ctx.fillStyle='rgba(0,0,0,.22)';ctx.fillRect(width-3,top+2,3,29);
  };
  switch(costume.id){
    case 'crt_bot':
      frame('#64748b');ctx.fillStyle='#1e293b';ctx.fillRect(12,-24,5,15);
      ctx.fillStyle='#4ade80';ctx.fillRect(13,-8,2,2);ctx.fillStyle='#cbd5e1';ctx.fillRect(13,-5,2,2);
      ctx.strokeStyle='#94a3b8';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-6,-34);ctx.lineTo(-12,-42);ctx.moveTo(6,-34);ctx.lineTo(12,-42);ctx.stroke();break;
    case 'minotaur':
      frame('#92400e',-35,18);ctx.fillStyle='#fef3c7';
      for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*14,-32);ctx.lineTo(side*28,-43);ctx.lineTo(side*24,-29);ctx.lineTo(side*17,-25);ctx.closePath();ctx.fill();}
      ctx.fillStyle='#b45309';ctx.fillRect(-8,-35,16,7);ctx.strokeStyle='#facc15';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-30,3,0,Math.PI);ctx.stroke();break;
    case 'wafer_mecha':
      frame('#2563eb',-37,20);ctx.fillStyle='#bfdbfe';ctx.fillRect(-16,-35,32,3);ctx.fillRect(-20,-25,6,15);ctx.fillRect(14,-25,6,15);
      ctx.fillStyle='#22d3ee';ctx.fillRect(-18,-21,2,8);ctx.fillRect(16,-21,2,8);ctx.fillStyle='#475569';ctx.fillRect(-5,-41,10,4);break;
    case 'boba_head':
      frame('#d6a46a',-35,18);ctx.fillStyle='#fef3c7';ctx.fillRect(-20,-37,40,4);ctx.fillStyle='#f472b6';ctx.fillRect(7,-48,4,12);
      ctx.fillStyle='#422006';for(const side of [-1,1])for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(side*14,-20+i*7+Math.sin(tick*.05+i),2,0,Math.PI*2);ctx.fill();}break;
    case 'code_wizard':
      ctx.fillStyle='#6d28d9';ctx.beginPath();ctx.moveTo(-10,-4);ctx.lineTo(10,-4);ctx.lineTo(16,17);ctx.lineTo(-16,17);ctx.closePath();ctx.fill();
      ctx.fillStyle='#facc15';ctx.fillRect(-1,-4,2,21);ctx.fillRect(-14,14,28,2);
      ctx.fillStyle='#7c3aed';ctx.beginPath();ctx.moveTo(-13,-29);ctx.lineTo(3,-51);ctx.lineTo(12,-29);ctx.closePath();ctx.fill();ctx.fillRect(-17,-29,34,3);
      ctx.fillStyle='#fde68a';ctx.fillRect(-1,-40,3,3);ctx.fillStyle='#713f12';ctx.fillRect(18,-9,3,28);ctx.fillStyle='#1e293b';ctx.fillRect(14,-14,12,8);
      for(let i=0;i<4;i++){ctx.fillStyle=['#f472b6','#22d3ee','#a3e635','#facc15'][i];ctx.fillRect(15+i*3,-12,2,3);}break;
  }
  ctx.restore();
}

function fillRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function strokeRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.stroke();
}

/**
 * 繪製角色本體 + 11 種情境動作姿態動畫 + 紅鶴頭套 + 武器揮擊殘影 + NPC 暴走紅蓮特效
 */
window.drawWackyAvatar = function (ctx, opts) {
  const {
    avatarId = 'office_1',
    x = 0,
    y = 0,
    dir = 'down',
    isMoving = false,
    tick = 0,
    scale = 1,
    jumpOffset = 0,
    actionState = null,    // 11 種情境動作 ID (含電腦、馬桶、洗手台、茶水間等)
    isBerserk = false,     // NPC 暴走攻擊狀態
    isSweeper = false,     // 打掃阿姨常駐掃把標記
    isKnockedBack = false, // 玩家或 NPC 被擊飛拋物線狀態
    weaponSwing = null,    // 揮舞武器狀態 { emoji, progress: 0~1 }
    isInjured = false,     // 🚑 重傷休養狀態
    beingHealed = false,   // 🩹 正在接受醫療狀態
    healProgress = 0,      // 醫療進度 0~1
    isFleeing = false,     // 😱 慌張逃跑狀態
  } = opts;

  const appearance=window.getAvatarAppearance(avatarId,opts.outfitAvatarId);
  if (avatarId === 'ghost') {
    const bob = Math.sin(tick * .06) * 5;
    const scare = Date.now() < (opts.scareUntil || 0);
    ctx.save(); ctx.translate(x, y - 20 + bob - jumpOffset);
    if(opts.combatDown) ctx.rotate(Math.PI/2);
    ctx.scale(scale * (scare ? 1.45 : 1), scale * (scare ? 1.45 : 1));
    ctx.globalAlpha = .78; ctx.shadowColor = '#67e8f9'; ctx.shadowBlur = 18;
    ctx.fillStyle = '#cffafe';
    ctx.beginPath(); ctx.arc(0, -12, 16, Math.PI, 0);
    ctx.lineTo(16, 15);
    for (let i = 16; i >= -16; i -= 8) ctx.lineTo(i, 15 + ((i / 8) % 2 === 0 ? 6 : 0));
    ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#164e63'; ctx.fillRect(-8,-14,5,8); ctx.fillRect(4,-14,5,8);
    ctx.beginPath(); ctx.ellipse(0, 3, scare ? 6 : 3, scare ? 9 : 4, 0, 0, Math.PI*2); ctx.fill();
    if (scare) { ctx.strokeStyle = '#a5f3fc'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0,0,32 + Math.sin(tick*.3)*8,0,Math.PI*2); ctx.stroke(); }
    ctx.restore(); return;
  }

  ctx.save();

  // 依據情境動作調整角色姿態高度、傾斜度與懸浮效果
  let poseOffsetY = 0;
  let poseOffsetX = 0;
  let poseRotate = 0;

  if (isKnockedBack) {
    poseRotate = tick * 0.48; // 被打飛時空中高速旋轉特效
  } else if (isFleeing) {
    poseOffsetX = Math.sin(tick * 0.9) * 3.5; // 慌張左右劇烈抖動
    poseOffsetY = -Math.abs(Math.sin(tick * 0.6)) * 4; // 慌張小碎步亂跳
    poseRotate = Math.sin(tick * 0.7) * 0.15; // 慌亂歪頭
  } else if (actionState === 'sit_code') {
    poseOffsetY = 5;
    poseOffsetX = Math.sin(tick * 0.7) * 0.8; // 高速打字微震動
  } else if (actionState === 'toilet') {
    poseOffsetY = 4 + Math.sin(tick * 0.15) * 1.2; // 蹲坐馬桶微幅用力晃動
  } else if (actionState === 'wash_hands') {
    poseOffsetY = 1;
    poseRotate = Math.sin(tick * 0.35) * 0.08; // 前傾搓手律動
  } else if (actionState === 'drink_coffee') {
    poseRotate = -Math.abs(Math.sin(tick * 0.12)) * 0.16; // 仰頭暢飲咖啡
  } else if (actionState === 'slack_nap') {
    poseOffsetY = 4;
    poseRotate = 0.16 + 0.06 * Math.sin(tick * 0.06); // 打瞌睡歪頭搖晃
  } else if (actionState === 'sleep_bed') {
    poseOffsetY = 10;
    poseRotate = -Math.PI / 2 + Math.sin(tick * 0.05) * 0.03; // 躺平熟睡呼吸起伏
  } else if (actionState === 'pray_kuaikuai') {
    poseOffsetY = Math.sin(tick * 0.25) * 5; // 虔誠上下鞠躬膜拜
    poseRotate = Math.sin(tick * 0.25) * 0.18;
  } else if (actionState === 'victory_dance') {
    poseOffsetY = -Math.abs(Math.sin(tick * 0.35)) * 12; // 狂歡熱舞彈跳
    poseOffsetX = Math.sin(tick * 0.18) * 6;
    poseRotate = Math.sin(tick * 0.18) * 0.2;
  } else if (actionState === 'daydream') {
    poseRotate = 0.12;
  } else if (actionState === 'cry') {
    poseOffsetY = 3; poseRotate = Math.sin(tick * .3) * .06;
  } else if (actionState === 'meeting_discuss' || actionState === 'watch_stock' || actionState === 'golf_putt') {
    poseRotate = Math.sin(tick * .1) * .025;
  } else if (actionState === 'cheer_stock') {
    poseOffsetY = -Math.abs(Math.sin(tick * .18)) * 8;
  } else if (actionState === 'zen_debug') {
    poseOffsetY = -12 + Math.sin(tick * 0.1) * 4; // 盤腿懸浮離地
  }

  ctx.translate(x + poseOffsetX, y - jumpOffset + poseOffsetY);
  ctx.scale(scale, scale);

  // 💻 若處於「坐下寫 Code」狀態，於角色後方繪製 3D 像素人體工學電競椅背與底座
  if (actionState === 'sit_code') {
    ctx.save();
    ctx.fillStyle = '#1e293b';
    fillRoundRect(ctx, -13, -18, 26, 26, 6);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    strokeRoundRect(ctx, -13, -18, 26, 26, 6);
    ctx.fillStyle = '#334155';
    fillRoundRect(ctx, -15, 6, 30, 6, 3);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-3, 12, 6, 6);
    ctx.fillRect(-11, 16, 22, 3);
    ctx.restore();
  } else if (actionState === 'sleep_bed') {
    // 🛌 躺平睡覺：在角色下方繪製柔軟睡墊與枕頭
    ctx.save();
    ctx.fillStyle = '#1e3a8a';
    fillRoundRect(ctx, -26, -6, 52, 22, 6);
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 1.5;
    strokeRoundRect(ctx, -26, -6, 52, 22, 6);
    ctx.fillStyle = '#f8fafc';
    fillRoundRect(ctx, -23, -3, 14, 16, 4);
    ctx.restore();
  }

  // 🔥 若處於 NPC 暴走攻擊狀態，繪製腳下與全身狂暴紅蓮火焰光圈
  if (isBerserk) {
    ctx.save();
    const ragePulse = 1 + Math.sin(tick * 0.4) * 0.25;
    const rg = ctx.createRadialGradient(0, -8, 4, 0, -8, 34 * ragePulse);
    rg.addColorStop(0, 'rgba(239, 68, 68, 0.85)');
    rg.addColorStop(0.6, 'rgba(249, 115, 22, 0.45)');
    rg.addColorStop(1, 'rgba(239, 68, 68, 0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(0, -8, 34 * ragePulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 16, 22 * ragePulse, 9 * ragePulse, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 🧘 盤腿通靈 Debug 模式的金色八卦光陣
  if (actionState === 'zen_debug') {
    ctx.save();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 26 - poseOffsetY, 22, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(250, 204, 21, 0.22)';
    ctx.fill();
    ctx.restore();
  }

  const walkCycle = isMoving && !actionState ? Math.sin(tick * 0.28) : 0;
  const bobY = actionState ? 0 : isMoving ? Math.abs(Math.sin(tick * 0.28)) * -4 : Math.sin(tick * 0.07) * 1.5;
  const flipX = dir === 'left' ? -1 : 1;

  // 1. 底部角色立體陰影
  ctx.fillStyle = 'rgba(15, 23, 42, 0.32)';
  ctx.beginPath();
  ctx.ellipse(0, 18 + jumpOffset * 0.5 - poseOffsetY * 0.6, 15, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, bobY);
  ctx.rotate(poseRotate);
  ctx.scale(flipX, 1);

  const officePerson = appearance.renderId===avatarId ? appearance.person : null;
  if (officePerson) {
    const sizes = {slim:[.86,1], tall:[.94,1.13], broad:[1.13,1.04], stocky:[1.19,.96], regular:[1,1]};
    ctx.scale(...sizes[officePerson.body]);
  }

  // 2. 雙腳擺動 (依據微胖 VP / 纖瘦 PP00 處長調整褲管寬度與配色，坐下或盤腿時彎曲收起)
  ctx.fillStyle =
    avatarId === 'npc_vp_uncle'
      ? '#172554'
      : avatarId === 'npc_dir_pp00_slim'
      ? '#334155'
      : '#1e293b';
  if (actionState === 'sit_code' || actionState === 'toilet' || actionState === 'zen_debug') {
    fillRoundRect(ctx, -10, 8, 8, 5, 2.5);
    fillRoundRect(ctx, 2, 8, 8, 5, 2.5);
  } else if (avatarId === 'npc_vp_uncle') {
    // VP 微胖大叔：較寬厚穩重的深藍西裝褲腿
    const leftLegY = 10 + walkCycle * 3;
    const rightLegY = 10 - walkCycle * 3;
    fillRoundRect(ctx, -11, leftLegY, 7.5, 8.5, 3);
    fillRoundRect(ctx, 3.5, rightLegY, 7.5, 8.5, 3);
  } else if (avatarId === 'npc_dir_pp00_slim') {
    // PP00 處長：纖瘦修長的鐵灰西裝褲腿
    const leftLegY = 10 + walkCycle * 3.8;
    const rightLegY = 10 - walkCycle * 3.8;
    fillRoundRect(ctx, -6.5, leftLegY, 4.5, 9, 2);
    fillRoundRect(ctx, 2, rightLegY, 4.5, 9, 2);
  } else {
    const leftLegY = 10 + walkCycle * 3.5;
    const rightLegY = 10 - walkCycle * 3.5;
    fillRoundRect(ctx, -8, leftLegY, 6, 8, 3);
    fillRoundRect(ctx, 2, rightLegY, 6, 8, 3);
  }

  // 3. 繪製 10 種使用者誇張角色 + 5 種獨立不重複的專屬 NPC 角色
  switch (appearance.renderId) {
    case 'minotaur': {
      ctx.fillStyle = '#991b1b';
      fillRoundRect(ctx, -12, -2, 24, 15, 5);
      ctx.fillStyle = '#334155';
      fillRoundRect(ctx, -9, -2, 18, 14, 4);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-1.5, 0, 3, 9);

      ctx.fillStyle = '#fef3c7';
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-12, -16);
      ctx.quadraticCurveTo(-26, -22, -22, -33);
      ctx.quadraticCurveTo(-16, -26, -10, -21);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(12, -16);
      ctx.quadraticCurveTo(26, -22, 22, -33);
      ctx.quadraticCurveTo(16, -26, 10, -21);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      const headGrad = ctx.createLinearGradient(0, -30, 0, -4);
      headGrad.addColorStop(0, '#b45309');
      headGrad.addColorStop(1, '#78350f');
      ctx.fillStyle = headGrad;
      fillRoundRect(ctx, -14, -28, 28, 24, 8);

      ctx.fillStyle = '#fca5a5';
      fillRoundRect(ctx, -10, -14, 20, 10, 5);
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.arc(-4, -9, 1.8, 0, Math.PI * 2);
      ctx.arc(4, -9, 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, -5, 4.5, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();

      ctx.fillStyle = isBerserk ? '#ef4444' : '#fef08a';
      ctx.beginPath();
      ctx.arc(-6, -19, 2.6, 0, Math.PI * 2);
      ctx.arc(6, -19, 2.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'frog_eng': {
      const frogGrad = ctx.createRadialGradient(-3, -6, 2, 0, -4, 22);
      frogGrad.addColorStop(0, '#4ade80');
      frogGrad.addColorStop(1, '#16a34a');
      ctx.fillStyle = frogGrad;
      fillRoundRect(ctx, -14, -22, 28, 34, 12);

      ctx.fillStyle = '#dcfce7';
      fillRoundRect(ctx, -9, -4, 18, 14, 7);

      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-4, -4);
      ctx.lineTo(0, 2);
      ctx.lineTo(4, -4);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      fillRoundRect(ctx, -4, 1, 8, 6, 1.5);

      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(-8, -24, 6.5, 0, Math.PI * 2);
      ctx.arc(8, -24, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-8, -24, 4.5, 0, Math.PI * 2);
      ctx.arc(8, -24, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(-7.5, -24, 2.3, 0, Math.PI * 2);
      ctx.arc(8.5, -24, 2.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fed7aa';
      fillRoundRect(ctx, -8, -16, 16, 10, 5);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.4;
      ctx.strokeRect(-6.5, -14.5, 5, 4);
      ctx.strokeRect(1.5, -14.5, 5, 4);
      break;
    }

    case 'wafer_mecha': {
      ctx.fillStyle = '#1d4ed8';
      fillRoundRect(ctx, -15, -5, 30, 10, 3);
      ctx.fillStyle = '#f8fafc';
      fillRoundRect(ctx, -10, -4, 20, 16, 3);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(0, 5);
      ctx.lineTo(6, 0);
      ctx.stroke();

      ctx.fillStyle = '#e2e8f0';
      fillRoundRect(ctx, -14, -28, 28, 23, 5);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      strokeRoundRect(ctx, -14, -28, 28, 23, 5);

      ctx.fillStyle = '#0f172a';
      fillRoundRect(ctx, -10, -24, 20, 15, 3);
      const laserGlow = 0.6 + 0.4 * Math.sin(tick * 0.2);
      ctx.fillStyle = `rgba(56, 189, 248, ${laserGlow})`;
      fillRoundRect(ctx, -8, -19, 16, 4, 2);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-9, -33);
      ctx.lineTo(0, -26);
      ctx.lineTo(9, -33);
      ctx.stroke();
      break;
    }

    case 'trex_intern': {
      const tailSwing = Math.sin(tick * 0.22) * 5;
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.moveTo(-10, 6);
      ctx.quadraticCurveTo(-24, 8 + tailSwing, -26, 2 + tailSwing);
      ctx.quadraticCurveTo(-20, -2 + tailSwing, -10, 0);
      ctx.closePath();
      ctx.fill();

      const rexGrad = ctx.createLinearGradient(0, -28, 0, 12);
      rexGrad.addColorStop(0, '#fb923c');
      rexGrad.addColorStop(1, '#ea580c');
      ctx.fillStyle = rexGrad;
      fillRoundRect(ctx, -12, -10, 24, 22, 8);
      ctx.fillStyle = '#ffedd5';
      fillRoundRect(ctx, -7, -6, 14, 16, 6);

      ctx.fillStyle = '#f97316';
      fillRoundRect(ctx, -13, -30, 28, 21, 7);
      ctx.fillStyle = '#1e293b';
      fillRoundRect(ctx, -7, -18, 16, 8, 3);
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(-5, -24, 3, 0, Math.PI * 2);
      ctx.arc(6, -24, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'boba_head': {
      ctx.fillStyle = '#78350f';
      fillRoundRect(ctx, -10, -3, 20, 15, 5);

      ctx.save();
      ctx.rotate(0.18);
      ctx.fillStyle = '#ec4899';
      fillRoundRect(ctx, -3, -38, 6, 16, 2);
      ctx.restore();

      const teaGrad = ctx.createLinearGradient(0, -26, 0, -4);
      teaGrad.addColorStop(0, '#fef3c7');
      teaGrad.addColorStop(0.3, '#fde68a');
      teaGrad.addColorStop(1, '#b45309');
      ctx.fillStyle = teaGrad;
      fillRoundRect(ctx, -13, -27, 26, 24, 6);
      ctx.fillStyle = '#f8fafc';
      fillRoundRect(ctx, -15, -29, 30, 4, 2);

      ctx.fillStyle = '#27272a';
      [
        [-8, -7],
        [-4, -6],
        [0, -8],
        [4, -6],
        [8, -7],
      ].forEach(([px, py], idx) => {
        const bounce = isMoving ? Math.sin(tick * 0.35 + idx) * 1.8 : 0;
        ctx.beginPath();
        ctx.arc(px, py + bounce, 2.2, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.arc(-5, -18, 2, 0, Math.PI * 2);
      ctx.arc(5, -18, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'kuaikuai_god': {
      const haloY = -33 + Math.sin(tick * 0.12) * 2;
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.ellipse(0, haloY, 11, 3.5, 0, 0, Math.PI * 2);
      ctx.stroke();

      const kkGrad = ctx.createLinearGradient(-15, -26, 15, 12);
      kkGrad.addColorStop(0, '#10b981');
      kkGrad.addColorStop(1, '#047857');
      ctx.fillStyle = kkGrad;
      fillRoundRect(ctx, -15, -26, 30, 36, 4);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(-15, -26, 30, 3.5);
      ctx.fillRect(-15, 6.5, 30, 3.5);

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, -8, 10.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(-3.5, -9, 1.6, 0, Math.PI * 2);
      ctx.arc(3.5, -9, 1.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'code_wizard': {
      const robeGrad = ctx.createLinearGradient(0, -10, 0, 14);
      robeGrad.addColorStop(0, '#6d28d9');
      robeGrad.addColorStop(1, '#4c1d95');
      ctx.fillStyle = robeGrad;
      fillRoundRect(ctx, -12, -5, 24, 18, 6);

      ctx.fillStyle = '#fed7aa';
      fillRoundRect(ctx, -10, -22, 20, 14, 5);
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(-9, -12);
      ctx.quadraticCurveTo(0, 10, 0, 12);
      ctx.quadraticCurveTo(0, 10, 9, -12);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(-4, -16, 2, 0, Math.PI * 2);
      ctx.arc(4, -16, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#5b21b6';
      ctx.beginPath();
      ctx.ellipse(0, -21, 17, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-11, -21);
      ctx.lineTo(2, -42);
      ctx.lineTo(11, -21);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'shark_slacker': {
      const sharkGrad = ctx.createLinearGradient(0, -28, 0, 12);
      sharkGrad.addColorStop(0, '#0284c7');
      sharkGrad.addColorStop(1, '#0369a1');
      ctx.fillStyle = sharkGrad;
      fillRoundRect(ctx, -13, -25, 26, 37, 11);

      ctx.fillStyle = '#f0f9ff';
      fillRoundRect(ctx, -8, -4, 16, 15, 7);
      ctx.fillStyle = '#991b1b';
      fillRoundRect(ctx, -9, -18, 18, 11, 5);
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(-5, -12);
      ctx.lineTo(6, -12);
      ctx.lineTo(1, -2);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'alien_debug': {
      ctx.fillStyle = '#e2e8f0';
      fillRoundRect(ctx, -11, -4, 22, 16, 5);
      const spark = Math.sin(tick * 0.25) * 2;
      ctx.strokeStyle = '#65a30d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-6, -26);
      ctx.lineTo(-10, -35 + spark);
      ctx.moveTo(6, -26);
      ctx.lineTo(10, -35 - spark);
      ctx.stroke();

      const alienGrad = ctx.createRadialGradient(0, -18, 2, 0, -16, 16);
      alienGrad.addColorStop(0, '#bef264');
      alienGrad.addColorStop(1, '#65a30d');
      ctx.fillStyle = alienGrad;
      ctx.beginPath();
      ctx.ellipse(0, -17, 14, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(-5.5, -16, 4.2, 2.5, 0.35, 0, Math.PI * 2);
      ctx.ellipse(5.5, -16, 4.2, 2.5, -0.35, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'npc_vp_uncle': {
      // 👑 VP 大老闆專屬形象：白髮微胖大叔，身穿深海藍高定雙排扣西裝、打金色領帶、戴金框眼鏡
      // 1. 微胖圓潤深海藍高定西裝外套與福氣小肚腩
      const vpSuitGrad = ctx.createLinearGradient(0, -6, 0, 14);
      vpSuitGrad.addColorStop(0, '#1e3a8a');
      vpSuitGrad.addColorStop(1, '#172554');
      ctx.fillStyle = vpSuitGrad;
      fillRoundRect(ctx, -16, -5, 32, 18, 9);

      // 白色高級襯衫 V 領與金色斜紋領帶
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(-6, -5);
      ctx.lineTo(6, -5);
      ctx.lineTo(0, 8);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(-2, -4);
      ctx.lineTo(2, -4);
      ctx.lineTo(3, 7);
      ctx.lineTo(0, 10);
      ctx.lineTo(-3, 7);
      ctx.closePath();
      ctx.fill();

      // 深藍西裝雙排金釦與左胸金色袋巾
      ctx.fillStyle = '#fde047';
      ctx.fillRect(6, -1, 4, 2);
      ctx.beginPath();
      ctx.arc(-6, 4, 1.3, 0, Math.PI * 2);
      ctx.arc(6, 4, 1.3, 0, Math.PI * 2);
      ctx.arc(-6, 9, 1.3, 0, Math.PI * 2);
      ctx.arc(6, 9, 1.3, 0, Math.PI * 2);
      ctx.fill();

      // 2. 微胖圓潤大叔臉龐與雙下巴紅潤臉頰
      ctx.fillStyle = '#fed7aa';
      fillRoundRect(ctx, -13, -25, 26, 20, 9);
      ctx.fillStyle = 'rgba(248, 113, 113, 0.35)';
      ctx.beginPath();
      ctx.arc(-8.5, -12, 3, 0, Math.PI * 2);
      ctx.arc(8.5, -12, 3, 0, Math.PI * 2);
      ctx.fill();

      // 3. 蓬鬆銀白大背頭與白髮鬢角、白濃眉、小八字白鬍
      const whiteHairGrad = ctx.createLinearGradient(0, -32, 0, -18);
      whiteHairGrad.addColorStop(0, '#ffffff');
      whiteHairGrad.addColorStop(1, '#cbd5e1');
      ctx.fillStyle = whiteHairGrad;
      fillRoundRect(ctx, -14, -30, 28, 9, 5);
      // 兩側白髮鬢角
      fillRoundRect(ctx, -14, -24, 3.5, 8, 1.5);
      fillRoundRect(ctx, 10.5, -24, 3.5, 8, 1.5);
      // 白濃眉
      ctx.fillRect(-9, -20, 6, 2);
      ctx.fillRect(3, -20, 6, 2);
      // 慈祥白八字小鬍子
      ctx.beginPath();
      ctx.moveTo(0, -9.5);
      ctx.lineTo(-5, -7.5);
      ctx.lineTo(-2, -7);
      ctx.lineTo(0, -8.2);
      ctx.lineTo(2, -7);
      ctx.lineTo(5, -7.5);
      ctx.closePath();
      ctx.fill();

      // 4. 招牌金框眼鏡與鏡片反光
      ctx.fillStyle = 'rgba(224, 242, 254, 0.65)';
      fillRoundRect(ctx, -9.5, -17.5, 7.5, 5.5, 1.5);
      fillRoundRect(ctx, 2, -17.5, 7.5, 5.5, 1.5);
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 1.6;
      strokeRoundRect(ctx, -9.5, -17.5, 7.5, 5.5, 1.5);
      strokeRoundRect(ctx, 2, -17.5, 7.5, 5.5, 1.5);
      ctx.beginPath();
      ctx.moveTo(-2, -15);
      ctx.lineTo(2, -15);
      ctx.stroke();

      // 鏡片後的銳利雙眼
      ctx.fillStyle = isBerserk ? '#ef4444' : '#0f172a';
      ctx.beginPath();
      ctx.arc(-5.5, -14.8, 1.4, 0, Math.PI * 2);
      ctx.arc(5.5, -14.8, 1.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'npc_dir_pp00_slim': {
      // 🎖️ PP00 處長專屬形象：身材纖瘦、灰髮中年大叔，身穿與 VP 截然不同的「鐵灰修身三件式西裝 + 酒紅背心與酒紅領帶」
      // 1. 纖瘦窄版鐵灰西裝外套 (-8.5..8.5，比微胖 VP 窄了近一半！)
      const slimSuitGrad = ctx.createLinearGradient(0, -5, 0, 13);
      slimSuitGrad.addColorStop(0, '#475569');
      slimSuitGrad.addColorStop(1, '#334155');
      ctx.fillStyle = slimSuitGrad;
      fillRoundRect(ctx, -8.5, -4, 17, 16, 3.5);

      // 內搭酒紅色修身西裝背心與淺藍襯衫領口
      ctx.fillStyle = '#881337';
      fillRoundRect(ctx, -4.5, -3, 9, 13, 2);
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.moveTo(-4, -4);
      ctx.lineTo(4, -4);
      ctx.lineTo(0, 3);
      ctx.closePath();
      ctx.fill();

      // 酒紅窄版領帶 + 銀色領帶夾 + 處長識別證
      ctx.fillStyle = '#e11d48';
      ctx.fillRect(-1.2, -3, 2.4, 10);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-1.8, 2, 3.6, 1.2);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(3.5, 1, 3.5, 4.5);

      // 2. 纖瘦稜角分明的中年大叔臉型（窄長臉 + 淡法令紋）
      ctx.fillStyle = '#fdba74';
      fillRoundRect(ctx, -8, -25, 16, 19, 5);
      ctx.strokeStyle = 'rgba(154, 52, 18, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-4.5, -12);
      ctx.lineTo(-5.5, -9);
      ctx.moveTo(4.5, -12);
      ctx.lineTo(5.5, -9);
      ctx.stroke();

      // 3. 俐落三七分線鐵灰短髮與灰眉
      ctx.fillStyle = '#64748b';
      fillRoundRect(ctx, -8.8, -29, 17.6, 7.5, 3.5);
      // 髮絲灰白挑染線條與旁分瀏海
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-6, -28, 4, 2);
      ctx.fillRect(2, -27, 4, 2);
      ctx.fillStyle = '#475569';
      ctx.fillRect(-6.5, -19.5, 4.5, 1.5);
      ctx.fillRect(2, -19.5, 4.5, 1.5);

      // 專注嚴謹的雙眼與抿嘴神情
      ctx.fillStyle = isBerserk ? '#ef4444' : '#0f172a';
      ctx.beginPath();
      ctx.arc(-4, -16, 1.5, 0, Math.PI * 2);
      ctx.arc(4, -16, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7c2d12';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-3, -10);
      ctx.lineTo(3, -10);
      ctx.stroke();
      break;
    }

    case 'npc_auntie_meifeng': {
      // 🧹 打掃阿姨・美鳳姐專屬獨立形象：捲髮桃紅碎花頭巾 + 玫瑰粉保潔圍裙
      ctx.fillStyle = '#9d174d';
      fillRoundRect(ctx, -11, -3, 22, 15, 5);
      ctx.fillStyle = '#f472b6';
      fillRoundRect(ctx, -8.5, -2, 17, 13, 3);
      ctx.fillStyle = '#ffffff';
      fillRoundRect(ctx, -5, 4, 10, 5, 2);

      // 親切阿姨臉龐
      ctx.fillStyle = '#fed7aa';
      fillRoundRect(ctx, -10, -23, 20, 17, 6);
      // 蓬鬆深褐捲髮與桃紅花頭巾
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.arc(-10, -17, 4, 0, Math.PI * 2);
      ctx.arc(10, -17, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#db2777';
      fillRoundRect(ctx, -11, -28, 22, 8, 4);
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(-5, -24, 1.5, 0, Math.PI * 2);
      ctx.arc(0, -25, 1.5, 0, Math.PI * 2);
      ctx.arc(5, -24, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // 笑咪咪雙眼與笑容
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(-4, -15, 1.6, 0, Math.PI * 2);
      ctx.arc(4, -15, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#be123c';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, -11.5, 3, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
      break;
    }

    case 'npc_auntie_shufen': {
      // 🧽 打掃阿姨・淑芬姐專屬獨立形象：丸子頭天藍格紋頭巾 + 青色防水圍裙 + 黃色橡膠手套
      ctx.fillStyle = '#155e75';
      fillRoundRect(ctx, -11, -3, 22, 15, 5);
      ctx.fillStyle = '#22d3ee';
      fillRoundRect(ctx, -8.5, -2, 17, 13, 3);
      // 兩側亮黃橡膠家事手套
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(-12, 4, 3.5, 0, Math.PI * 2);
      ctx.arc(12, 4, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // 淑芬姐臉龐與頂部包頭丸子
      ctx.fillStyle = '#27272a';
      ctx.beginPath();
      ctx.arc(0, -30, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fed7aa';
      fillRoundRect(ctx, -10, -23, 20, 17, 6);
      // 天藍格紋頭巾髮帶
      ctx.fillStyle = '#0284c7';
      fillRoundRect(ctx, -11, -26, 22, 6, 3);
      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(-7, -25, 3, 4);
      ctx.fillRect(0, -25, 3, 4);
      ctx.fillRect(6, -25, 3, 4);

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(-4, -15, 1.6, 0, Math.PI * 2);
      ctx.arc(4, -15, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(0, -11.5, 2.8, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
      break;
    }

    case 'npc_flamingo_cmd':
    case 'flamingo_cmd': {
      // 🦩 鳥人指揮官 (NPC 專屬)：深藍指揮官制服 + 拍動粉紅羽翼 + 超誇張立體紅鶴長頸頭套
      const wingFlap = Math.sin(tick * 0.42) * 6;
      // 兩側粉紅紅鶴翅膀
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.ellipse(-15, -2 + wingFlap * 0.5, 7, 11, -0.35, 0, Math.PI * 2);
      ctx.ellipse(15, -2 - wingFlap * 0.5, 7, 11, 0.35, 0, Math.PI * 2);
      ctx.fill();

      // 指揮官筆挺制服與金色肩章
      ctx.fillStyle = '#1e293b';
      fillRoundRect(ctx, -11, -4, 22, 16, 5);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-12, -4, 5, 3);
      ctx.fillRect(7, -4, 5, 3);
      ctx.fillRect(-2, -1, 4, 10);

      // 角色臉部與紅鶴大頭套基底
      const flamGrad = ctx.createLinearGradient(0, -32, 0, -4);
      flamGrad.addColorStop(0, '#ec4899');
      flamGrad.addColorStop(1, '#db2777');
      ctx.fillStyle = flamGrad;
      fillRoundRect(ctx, -13, -25, 26, 21, 9);

      // 頭套內露出的指揮官墨鏡臉
      ctx.fillStyle = '#fed7aa';
      fillRoundRect(ctx, -8, -17, 16, 10, 4);
      ctx.fillStyle = '#0f172a';
      fillRoundRect(ctx, -7, -16, 6, 4, 1);
      fillRoundRect(ctx, 1, -16, 6, 4, 1);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-1, -14);
      ctx.lineTo(1, -14);
      ctx.stroke();

      // 高聳彎曲的紅鶴長脖子與紅鶴頭頂
      const neckSway = Math.sin(tick * 0.22) * 2.5;
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -23);
      ctx.quadraticCurveTo(-6 + neckSway, -34, 2 + neckSway, -43);
      ctx.stroke();

      // 紅鶴頭部圓球
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.arc(3 + neckSway, -44, 6.5, 0, Math.PI * 2);
      ctx.fill();

      // 紅鶴黑白彎曲尖喙
      ctx.fillStyle = '#fef2f2';
      ctx.beginPath();
      ctx.moveTo(8 + neckSway, -46);
      ctx.quadraticCurveTo(17 + neckSway, -45, 16 + neckSway, -38);
      ctx.lineTo(8 + neckSway, -41);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(13 + neckSway, -43);
      ctx.lineTo(16 + neckSway, -38);
      ctx.lineTo(11 + neckSway, -40);
      ctx.closePath();
      ctx.fill();

      // 紅鶴金黃色眼睛
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(4.5 + neckSway, -45, 1.8, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

        case 'npc_security_guard': {
      // 🏏 夜間巡邏警衛・老李：深藍防暴安保制服 + 金徽大盤帽 + 黑色警棍
      const batonSwing = Math.sin(tick * 0.35) * 6;

      // 1. 軀幹：深藍色制服與黑色戰術防暴背心
      ctx.fillStyle = '#1e3a8a';
      fillRoundRect(ctx, -11, -4, 22, 16, 4);
      ctx.fillStyle = '#0f172a';
      fillRoundRect(ctx, -8, -2, 16, 12, 3);

      // 金色肩章與警衛標籤
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(-12, -4, 4, 3);
      ctx.fillRect(8, -4, 4, 3);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-6, 0, 5, 2.5);
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(3, 1, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // 戰術腰帶與對講機
      ctx.fillStyle = '#020617';
      ctx.fillRect(-11, 8, 22, 4);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-2, 8, 4, 4);
      ctx.fillStyle = '#334155';
      ctx.fillRect(-10, 6, 3, 6);

      // 2. 右手手持黑色防暴警棍
      ctx.save();
      ctx.translate(13, 2 + batonSwing * 0.3);
      ctx.rotate(((25 + batonSwing * 3) * Math.PI) / 180);
      ctx.fillStyle = '#334155';
      ctx.fillRect(-2, -2, 4, 6);
      ctx.fillStyle = '#020617';
      fillRoundRect(ctx, -2.5, -20, 5, 19, 2);
      ctx.fillStyle = '#475569';
      ctx.fillRect(-3, -16, 6, 2);
      ctx.restore();

      // 3. 臉部與大盤帽
      ctx.fillStyle = '#fed7aa';
      fillRoundRect(ctx, -9, -21, 18, 17, 5);

      // 俐落鬢角
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-10, -20, 3, 6);
      ctx.fillRect(7, -20, 3, 6);

      // 威嚴濃眉與雙眼
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-6, -17, 4, 1.5);
      ctx.fillRect(2, -17, 4, 1.5);
      ctx.beginPath();
      ctx.arc(-4, -13.5, 1.6, 0, Math.PI * 2);
      ctx.arc(4, -13.5, 1.6, 0, Math.PI * 2);
      ctx.fill();

      // 微閉沉穩嘴唇
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-2, -9);
      ctx.lineTo(2, -9);
      ctx.stroke();

      // 4. 金徽深藍大盤帽
      ctx.fillStyle = '#1e3a8a';
      fillRoundRect(ctx, -13, -31, 26, 12, 5);
      ctx.fillStyle = '#020617';
      fillRoundRect(ctx, -14, -22, 28, 4, 2);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(-11, -22, 22, 2);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(0, -28);
      ctx.lineTo(4, -25);
      ctx.lineTo(3, -21);
      ctx.lineTo(-3, -21);
      ctx.lineTo(-4, -25);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, -24.5, 1.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    default: {
      const a = officePerson || window.AVATAR_CATALOG[0];
      // Pixel-cut clothing, side shading, and individual hair silhouettes.
      ctx.fillStyle = a.primary; ctx.fillRect(-11, -5, 22, 18);
      ctx.fillStyle = 'rgba(0,0,0,.17)'; ctx.fillRect(7, -4, 4, 17);
      ctx.fillStyle = a.skin; ctx.fillRect(-14, 3 + walkCycle * 2, 4, 8); ctx.fillRect(10, 3 - walkCycle * 2, 4, 8);
      ctx.fillStyle = a.secondary;
      if (a.style === 'suit' || a.style === 'jacket') {
        ctx.beginPath();ctx.moveTo(-6,-5);ctx.lineTo(0,9);ctx.lineTo(6,-5);ctx.fill();
        ctx.fillStyle='#b45309';ctx.fillRect(-1,-2,2,9);
      } else if(a.style === 'sport') {
        ctx.fillRect(-10,-3,3,14);ctx.fillRect(7,-3,3,14);ctx.fillRect(-1,-5,2,18);
      } else {
        ctx.fillRect(-1,-5,2,17);
        ctx.fillStyle='#ffffff';for(let y=0;y<11;y+=4)ctx.fillRect(0,y,1,1);
      }
      // Small employee badge; shoulders and face remain readable at game scale.
      ctx.fillStyle='#e2e8f0';ctx.fillRect(4,2,4,5);ctx.fillStyle='#38bdf8';ctx.fillRect(5,3,2,2);
      if(a.gender==='female'){ctx.fillStyle=a.hair;ctx.fillRect(-12,-25,24,25);}
      ctx.fillStyle=a.skin;ctx.fillRect(-9,-24,18,19);ctx.fillRect(-3,-6,6,3);
      ctx.fillStyle=a.hair;ctx.fillRect(-10,-27,20,7);ctx.fillRect(-11,-22,4,9);
      if(a.gender==='female')ctx.fillRect(8,-23,5,23);
      if(dir !== 'up') {
        ctx.fillStyle='#27272a';ctx.fillRect(-5,-15,2,2);ctx.fillRect(4,-15,2,2);
        ctx.fillStyle='#a16252';ctx.fillRect(-2,-9,4,1);
        if(a.glasses){ctx.strokeStyle='#334155';ctx.lineWidth=1;ctx.strokeRect(-7,-17,7,5);ctx.strokeRect(1,-17,7,5);ctx.fillStyle='#334155';ctx.fillRect(0,-15,1,1);}
        if(a.age>=45){ctx.fillStyle='#bd927e';ctx.fillRect(-7,-10,3,1);ctx.fillRect(5,-10,3,1);}
      } else {ctx.fillStyle=a.hair;ctx.fillRect(-9,-23,18,16);}
      break;
    }
  }

  if(officePerson)drawWearableLayer(ctx,appearance.costume,tick);

  // 4. 若是打掃阿姨或啟動「🧹 揮汗大掃除」動作，在手上畫出動態揮舞的黃金長柄掃把
  if ((isSweeper && !actionState) || actionState === 'sweep_floor') {
    ctx.save();
    const sweepAng = Math.sin(tick * 0.28) * 0.45;
    ctx.translate(14, -2);
    ctx.rotate(sweepAng);
    // 掃把木柄
    ctx.fillStyle = '#b45309';
    ctx.fillRect(-2, -18, 4, 28);
    // 金黃掃把刷毛
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(-8, 10);
    ctx.lineTo(8, 10);
    ctx.lineTo(12, 20);
    ctx.lineTo(-12, 20);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  if (opts.heldItem && !isInjured && (!weaponSwing || weaponSwing.progress>=1)) {
    ctx.save();
    const left=dir==='left', sway=isMoving?Math.sin(tick*.25)*.18:Math.sin(tick*.06)*.07;
    ctx.translate(left?-20:20,-7+(isMoving?Math.sin(tick*.25)*2:Math.sin(tick*.06)));
    ctx.rotate((left?-.25:.25)+sway);
    ctx.fillStyle='#f5cfaa';ctx.fillRect(-4,-1,8,8);
    ctx.font='22px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(opts.heldItem,0,-7);
    ctx.restore();
  }
  // 4.5 若正在揮舞武器攻擊 (板凳、鍵盤、WAFER晶圓、板手、IC Package、客退報告)，繪製炫酷斬擊刀光與旋轉武器
  if (weaponSwing && weaponSwing.progress < 1) {
    ctx.save();
    const p = weaponSwing.progress;
    const swingAngle = (dir==='left'?Math.PI:dir==='up'?-Math.PI/2:dir==='down'?Math.PI/2:0) -1.3+p*2.7;
    // 半月形金色/青色揮擊刀光
    ctx.strokeStyle = `rgba(250, 204, 21, ${1 - p * 0.6})`;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(4, -6, 32, -1.2, swingAngle, false);
    ctx.stroke();

    ctx.translate(4, -6);
    ctx.rotate(swingAngle);
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(weaponSwing.emoji || '🪑', 24, 0);
    ctx.restore();
  }

  ctx.restore();

  // =========================================================================
  // 5. 繪製被暴走 NPC 擊飛時的空中殘影與衝擊波星芒
  // =========================================================================
  if (isKnockedBack) {
    ctx.save();
    ctx.translate(x, y - jumpOffset);
    ctx.textAlign = 'center';
    ctx.font = '20px sans-serif';
    ctx.fillText('💥', -18 + Math.sin(tick * 0.6) * 8, -28);
    ctx.fillText('💫', 18 + Math.cos(tick * 0.6) * 8, -34);
    ctx.font = 'bold 11px "Microsoft JhengHei", sans-serif';
    ctx.fillStyle = '#facc15';
    ctx.fillText('🚀 啊～被打飛啦！', 0, -46);
    ctx.restore();
  }

  // =========================================================================
  // 6. 繪製 11 種情境動作的浮空特效粒子與專屬道具動畫 (不隨左右翻轉鏡像)
  // =========================================================================
  if (actionState) {
    ctx.save();
    ctx.translate(x + poseOffsetX, y - jumpOffset + poseOffsetY);
    ctx.scale(scale, scale);
    drawContextAction(ctx, actionState, tick);
    ctx.restore();
  }

  // =========================================================================
  // 7. 🚑 重傷休養與包紮動畫 (Bandage Wrap & Medical Animation)
  // =========================================================================
  if (isInjured) {
    ctx.save();
    ctx.translate(x + poseOffsetX, y - jumpOffset + poseOffsetY);
    ctx.scale(scale, scale);

    // 1. 睡墊周圍的急救微光監護光圈
    const glowAlpha = 0.22 + Math.sin(tick * 0.12) * 0.12;
    ctx.fillStyle = 'rgba(16, 185, 129, ' + glowAlpha + ')';
    ctx.beginPath();
    ctx.ellipse(0, 5, 34, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. 身軀與頭部的白色立體包紮繃帶
    ctx.save();
    ctx.rotate(poseRotate);

    // 頭部繃帶斜纏 (3 條交錯白色立體繃帶)
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-12, -42, 24, 4);
    ctx.fillRect(-11, -36, 22, 3);
    ctx.fillStyle = '#cbd5e1'; // 繃帶接縫立體陰影
    ctx.fillRect(-12, -39, 24, 1.5);
    ctx.fillRect(-11, -34, 22, 1);

    // 頭部可愛繃帶蝴蝶結（打結效果，隨呼吸微幅擺動）
    const knotWiggle = Math.sin(tick * 0.16) * 1.8;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-16, -46, 6, 4);
    ctx.fillRect(-8, -46, 6, 4);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-11, -45, 4, 3);
    // 飄動的繃帶尾巴
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(-13 + knotWiggle, -41, 3, 7);
    ctx.fillRect(-9 - knotWiggle, -41, 3, 5);

    // 臉頰創口貼 (帶打孔質感)
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(4, -38, 9, 5);
    ctx.fillStyle = '#92400e';
    ctx.fillRect(7, -37, 3, 3);

    // 身體/手臂包紮十字繃帶
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-14, -18, 28, 4);
    ctx.fillRect(-12, -12, 24, 3);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-14, -15, 28, 1.5);
    ctx.restore();

    // 3. 向上緩緩漂浮升起的包紮休養粒子 (🩹 創口貼、✨ 治癒微星、❤️‍🩹)
    const phase = (tick * 0.04) % 1;
    for (let i = 0; i < 3; i++) {
      const p = (phase + i / 3) % 1;
      const py = -20 - p * 35;
      const px = Math.sin((tick * 0.08) + i * 2) * 16;
      ctx.save();
      ctx.globalAlpha = Math.sin(p * Math.PI) * 0.9;
      ctx.font = i === 0 ? '13px sans-serif' : '10px sans-serif';
      ctx.textAlign = 'center';
      const icon = i === 0 ? '🩹' : (i === 1 ? '✨' : '❤️‍🩹');
      ctx.fillText(icon, px, py);
      ctx.restore();
    }

    // 4. 若正由其他同仁醫療中 (beingHealed)：繪製濃烈翡翠綠聖光光環與急救愛心
    if (beingHealed) {
      const healPulse = 1 + Math.sin(tick * 0.3) * 0.2;
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 28 * healPulse, 0, Math.PI * 2);
      ctx.stroke();

      for (let j = 0; j < 4; j++) {
        const hp = ((tick * 0.06) + j / 4) % 1;
        ctx.save();
        ctx.globalAlpha = Math.sin(hp * Math.PI);
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💚', Math.cos(j * 1.5) * 18, -15 - hp * 45);
        ctx.restore();
      }
    }

    ctx.restore();
  }

  // 8. 😱 慌張逃跑與冷汗直流特效 (💦)
  if (isFleeing) {
    ctx.save();
    ctx.translate(x + poseOffsetX, y - jumpOffset + poseOffsetY);
    ctx.scale(scale, scale);
    ctx.font = '13px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    const sweatL = -22 + Math.sin(tick * 0.45) * 3;
    const sweatR = -20 + Math.cos(tick * 0.45) * 3;
    ctx.fillText('💦', -16, sweatL);
    ctx.fillText('💦', 16, sweatR);
    ctx.restore();
  }
};

/**
 * 繪製 3D 像素方塊怪物 (Low Yield, 客退, Qual Delay, MO, QIT)
 * 支援 1% 暴走紅蓮破壞氣場與被武器擊飛旋轉特效
 */

window.drawMinecraftMob = function (ctx, mob, tick) {
  ctx.save();
  const reaction=window.OfficeCombat?.reactionPose(mob);
  if(reaction)ctx.translate(reaction.x,reaction.y-reaction.jump);
  const jumpY = mob.jumpOffset || 0;
  const isKnocked = !!(mob.knockback && mob.knockback.ticksLeft > 0);
  const hop = isKnocked ? 0 : Math.abs(Math.sin(tick * 0.24 + (mob.seed || 0))) * 5;

  ctx.translate(mob.x, mob.y - jumpY - hop);
  if (isKnocked) {
    ctx.rotate(tick * 0.55);
  }

  // 底部方塊陰影
  ctx.fillStyle = 'rgba(15, 23, 42, 0.38)';
  ctx.fillRect(-16, 14 + hop, 32, 9);

  // 若處於 1% 暴走拆機狀態，繪製赤紅狂暴光環
  if (mob.isBerserk) {
    const pulse = 1 + Math.sin(tick * 0.45) * 0.22;
    ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.fillRect(-24 * pulse, -34 * pulse, 48 * pulse, 50 * pulse);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-22 * pulse, -32 * pulse, 44 * pulse, 46 * pulse);
  }

  // 繪製像素方塊腳
  const legSwing = Math.sin(tick * 0.32) * 3.5;
  ctx.fillStyle = mob.secondary || '#14532d';
  ctx.fillRect(-13, 6 + legSwing, 8, 10);
  ctx.fillRect(-3, 6 - legSwing, 6, 10);
  ctx.fillRect(5, 6 + legSwing, 8, 10);
  ctx.strokeStyle = '#090d16';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-13, 6 + legSwing, 8, 10);
  ctx.strokeRect(5, 6 + legSwing, 8, 10);

  // 繪製立方體軀幹與方塊頭 (帶頂部立體切面與像素馬賽克斑塊)
  // 頂部 3D 亮面
  ctx.fillStyle = mob.primary || '#22c55e';
  ctx.fillRect(-15, -28, 30, 6);
  // 正面方塊頭與身體
  ctx.fillStyle = mob.primary || '#22c55e';
  ctx.fillRect(-15, -22, 30, 30);
  // 像素馬賽克紋理斑塊
  ctx.fillStyle = mob.secondary || '#14532d';
  ctx.fillRect(-13, -20, 6, 6);
  ctx.fillRect(7, -18, 6, 6);
  ctx.fillRect(-11, -2, 7, 7);
  ctx.fillRect(5, 0, 7, 6);

  // 黑色像素外框
  ctx.strokeStyle = '#090d16';
  ctx.lineWidth = 2;
  ctx.strokeRect(-15, -28, 30, 36);

  // 繪製像素方塊怪五官
  ctx.fillStyle = mob.eyeColor || '#090d16';
  // 左右方塊眼
  ctx.fillRect(-10, -14, 6, 6);
  ctx.fillRect(4, -14, 6, 6);
  // 像素方塊嘴
  ctx.fillRect(-4, -7, 8, 4);
  ctx.fillRect(-7, -4, 4, 6);
  ctx.fillRect(3, -4, 4, 6);

  ctx.restore();

  // 繪製怪物頭頂像素方塊血條與名稱牌
  ctx.save();
  ctx.translate(mob.x, mob.y - jumpY - hop - 42);
  ctx.font = '800 11px "Outfit", "Microsoft JhengHei", monospace';
  const label = mob.isBerserk ? `💢 [暴走拆機] ${mob.name}` : `👾 ${mob.name}`;
  const tw = ctx.measureText(label).width + 18;
  ctx.fillStyle = mob.isBerserk ? 'rgba(185, 28, 28, 0.95)' : 'rgba(15, 23, 42, 0.9)';
  ctx.fillRect(-tw / 2, -14, tw, 19);
  ctx.strokeStyle = mob.isBerserk ? '#fde047' : mob.primary;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-tw / 2, -14, tw, 19);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, -4.5);

  // 繪製怪物被各類武器/道具打擊後的即時擊退進度血條
  if (typeof mob.currentRepelProgress === 'number' && mob.currentRepelProgress > 0) {
    const barW = Math.max(tw, 44);
    const prog = Math.min(1, Math.max(0, mob.currentRepelProgress));
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(-barW / 2, 7, barW, 6);
    ctx.fillStyle = prog >= 0.75 ? '#ef4444' : prog >= 0.4 ? '#facc15' : '#22c55e';
    ctx.fillRect(-barW / 2 + 1, 8, Math.max(0, (barW - 2) * (1 - prog)), 4);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(-barW / 2, 7, barW, 6);
  }
  ctx.restore();
};

// Pixel props use local coordinates, so previews and remote players scale together.
function drawContextAction(ctx, action, tick) {
  const wave = Math.sin(tick * 0.18);
  const phase = (tick % 120) / 120;
  const px = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  const hand = (x, y) => px(x - 3, y - 2, 6, 5, '#f5cba7');
  const arm = (x, y, xx, yy) => {
    ctx.strokeStyle = '#526a88'; ctx.lineWidth = 5; ctx.lineCap = 'square';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(xx, yy); ctx.stroke(); hand(xx, yy);
  };
  const paper = (x, y) => {
    px(x, y, 24, 18, '#e8eef1'); px(x + 11, y + 1, 1, 16, '#94a3b8');
    for (let i = 0; i < 3; i++) { px(x + 3, y + 4 + i * 4, 6, 1, '#64748b'); px(x + 14, y + 4 + i * 4, 7, 1, '#64748b'); }
  };
  const zzz = () => {
    ctx.font = 'bold 11px monospace'; ctx.fillStyle = '#c4d8f1';
    for (let i = 0; i < 3; i++) { const t = (phase + i / 3) % 1; ctx.globalAlpha = 1 - t; ctx.fillText('z', 15 + t * 10, -28 - t * 24); }
    ctx.globalAlpha = 1;
  };
  switch (action) {
    case 'sit_code': {
      px(-23, 5, 46, 5, '#a88463'); px(-20, 10, 4, 13, '#655b56'); px(16, 10, 4, 13, '#655b56');
      px(-18, -2, 36, 8, '#334155');
      for (let row = 0; row < 2; row++) for (let k = 0; k < 8; k++) px(-15 + k * 4, row * 3, 2, 1, '#cbd5e1');
      arm(-12, -1, -8, -3 + Math.sin(tick * .7) * 2); arm(12, -1, 9, -3 + Math.cos(tick * .7) * 2);
      break;
    }
    case 'toilet': {
      // A tiny cartoon drop falls into the bowl, splashes, then disappears each cycle.
      px(-12, 24, 24, 6, '#e2e8f0'); px(-8, 30, 16, 7, '#94a3b8'); px(-9, 24, 18, 3, '#7dd3fc');
      paper(-12, -5); hand(-14, 2); hand(14, 2);
      if (phase < .65) {
        const dropY = 16 + (phase / .65) ** 2 * 9;
        px(-2, dropY - 4, 4, 3, '#a66a3c'); px(-4, dropY - 1, 8, 3, '#80502f'); px(-5, dropY + 2, 10, 3, '#68432d');
      } else {
        const splash = (phase - .65) / .35;
        ctx.globalAlpha = 1 - splash;
        px(-8 - splash * 8, 24 - Math.sin(splash * Math.PI) * 8, 3, 3, '#7dd3fc');
        px(6 + splash * 8, 24 - Math.sin(splash * Math.PI) * 8, 3, 3, '#7dd3fc');
        ctx.globalAlpha = 1;
      }
      px(22, 2, 8, 11, '#f1f5f9'); px(24, 4, 4, 3, '#94a3b8');
      break;
    }
    case 'wash_hands': {
      const rub = Math.sin(tick * .5) * 3;
      arm(-12, 0, -3 + rub, 2); arm(12, 0, 3 - rub, 3);
      px(-9, 7, 18, 3, '#94c9db');
      for (let i = 0; i < 5; i++) { const t = (phase + i / 5) % 1; px(-10 + i * 5, 3 - t * 17, 3, 3, '#e0f7ff'); }
      break;
    }
    case 'drink_coffee': {
      const lift = Math.max(0, wave) * 13;
      arm(12, 0, 16, 2 - lift);
      px(12, -3 - lift, 11, 10, '#f1e2c6'); px(23, -1 - lift, 4, 5, '#c6a783');
      px(14, -3 - lift, 7, 2, '#664536');
      for (let i = 0; i < 2; i++) px(15 + i * 5, -8 - lift - ((tick + i * 14) % 25) / 3, 2, 4, '#d9e2e5');
      break;
    }
    case 'slack_nap': arm(12, 0, 15, -14); zzz(); break;
    case 'sleep_bed':
      px(-6, -1 + Math.sin(tick * .07), 33, 15, '#446ea8'); px(-4, 1, 29, 3, '#92b7e3'); zzz(); break;
    case 'daydream': {
      arm(-12, 0, -6, -10);
      px(15, -33, 3, 3, '#dce6f5'); px(21, -40, 5, 4, '#dce6f5');
      px(22, -57, 28, 14, '#e2e8f0');
      for (let i = 0; i < 3; i++) px(27 + i * 7, -51 + (Math.floor(tick / 20) % 3 === i ? -2 : 0), 3, 3, '#64748b');
      break;
    }
    case 'pray_kuaikuai': {
      const bow = Math.max(0, wave) * 4;
      px(-12, 15, 24, 4, '#b59160'); px(-8, 8, 16, 7, '#23865e'); px(-4, 10, 8, 3, '#f2e9b3');
      arm(-12, 0, -2, -7 + bow); arm(12, 0, 2, -7 + bow); break;
    }
    case 'watch_stock': {
      px(-18, 0, 36, 20, '#203346'); px(-15, 3, 30, 14, '#0e202d');
      for (let i = 0; i < 5; i++) px(-12 + i * 5, 6 + (i % 2) * 3, 3, 7 - i % 3, i % 2 ? '#ed8585' : '#6ad9b4');
      hand(-19, 7); hand(19, 7); break;
    }
    case 'sweep_floor': {
      arm(12, 0, 17 + wave * 7, 8);
      for (let i = 0; i < 4; i++) { const t = (phase + i / 4) % 1; ctx.globalAlpha = 1 - t; px(20 + t * 18, 18 - Math.sin(t * Math.PI) * 7, 3, 2, '#c4b69d'); }
      ctx.globalAlpha = 1; break;
    }
    case 'victory_dance': case 'cheer_stock': {
      arm(-12, 0, -20, -12 + wave * 7); arm(12, 0, 20, -12 - wave * 7);
      const colors = ['#f4d285', '#7dd3fc', '#e7a5cd'];
      for (let i = 0; i < 6; i++) { const t = (phase + i / 6) % 1; px(-30 + i * 11, -44 + t * 40, 3, 4, colors[i % 3]); }
      break;
    }
    case 'zen_debug': {
      px(-15, 10, 30, 5, '#526388'); px(-11, 15, 22, 3, '#26364a');
      hand(-17, 5); hand(17, 5);
      ctx.strokeStyle = '#d4bf7f'; ctx.lineWidth = 1; ctx.strokeRect(-25, 22 + wave, 50, 3);
      ctx.font = '10px monospace'; ctx.fillStyle = '#95dec5'; ctx.fillText('{ }', -8, -43); break;
    }
    case 'meeting_discuss': paper(-20, 5); arm(12, 0, 20, -12 + wave * 4); px(20, -33, 22, 12, '#d9e5ef'); px(22, -21, 4, 4, '#d9e5ef'); break;
    case 'cry': arm(-12, 0, -8, -15); arm(12, 0, 8, -15); for (let i = 0; i < 2; i++) px(i ? 10 : -12, -8 + ((tick + i * 9) % 24), 2, 5, '#7dd3fc'); break;
    case 'golf_putt': {
      const p = phase < .3 ? 0 : Math.min(1, (phase - .3) / .6);
      ctx.save(); ctx.translate(15, 0); ctx.rotate(phase < .3 ? -.5 + phase * 2 : .12);
      px(0, -8, 2, 30, '#b5c6d2'); px(-2, 20, 10, 4, '#cbd5e1'); ctx.restore();
      arm(12, 0, 16, 2); px(18 + p * 27, 19 - p * 12, 4, 4, '#ffffff'); px(45, 8, 9, 3, '#23372f'); break;
    }
  }
}
