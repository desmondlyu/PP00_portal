// PP00 Gather Office — 十種誇張花俏人物造型 + 10 種情境動作骨骼動畫 + NPC 暴走紅蓮氣場引擎

window.AVATAR_CATALOG = [
  {
    id: 'minotaur',
    name: '牛頭套狂戰士',
    tag: '鼻孔噴氣・霸氣鎮場',
    badge: '🐮',
    primary: '#b45309',
    secondary: '#fde68a',
    desc: '頂著超巨大立體牛頭套與純金鼻環，走路自帶氣場與白煙！',
  },
  {
    id: 'frog_eng',
    name: '青蛙裝工程師',
    tag: '充氣偶裝・肝帝代表',
    badge: '🐸',
    primary: '#22c55e',
    secondary: '#bbf7d0',
    desc: '全身綠油油充氣青蛙裝，胸前還掛著 PP00 工程師識別證。',
  },
  {
    id: 'wafer_mecha',
    name: '晶圓盒鋼彈',
    tag: '12吋FOUP・雷射護目鏡',
    badge: '🤖',
    primary: '#3b82f6',
    secondary: '#93c5fd',
    desc: '把 12 吋晶圓傳送盒當成機甲頭盔，雙眼掃描良率異常！',
  },
  {
    id: 'trex_intern',
    name: '充氣暴龍實習生',
    tag: '小短手・甩尾狂奔',
    badge: '🦖',
    primary: '#f97316',
    secondary: '#fed7aa',
    desc: '橘色巨型充氣暴龍裝，短短小手拿著探針卡，走路尾巴狂甩。',
  },
  {
    id: 'boba_head',
    name: '波霸珍奶頭怪客',
    tag: '全糖少冰・珍珠滾動',
    badge: '🧋',
    primary: '#d97706',
    secondary: '#fef3c7',
    desc: '整顆頭是一杯透明波霸珍奶，裡面的黑糖珍珠會隨步伐滾動！',
  },
  {
    id: 'kuaikuai_god',
    name: '神聖綠乖乖本尊',
    tag: '機台守護神・綠燈保證',
    badge: '🟢',
    primary: '#10b981',
    secondary: '#a7f3d0',
    desc: '化身巨型綠色奶油椰子乖乖包裝本體，頭頂懸浮神聖金光環！',
  },
  {
    id: 'code_wizard',
    name: '鍵盤大法師',
    tag: 'RGB法杖・零Bug咒語',
    badge: '🧙‍♂️',
    primary: '#8b5cf6',
    secondary: '#ddd6fe',
    desc: '高聳星芒巫師帽配拖地白鬍子，手拿發光 RGB 機械鍵盤當法杖。',
  },
  {
    id: 'shark_slacker',
    name: '鯊魚布偶摸魚王',
    tag: '嘴叼披薩・茶水間霸主',
    badge: '🦈',
    primary: '#0284c7',
    secondary: '#bae6fd',
    desc: '藍白鯊魚連身布偶裝，嘴裡還咬著一片起司披薩，走路冒水泡。',
  },
  {
    id: 'alien_debug',
    name: '外星天線 Debug 客',
    tag: '雙球天線・腦波通靈',
    badge: '👽',
    primary: '#84cc16',
    secondary: '#ecfccb',
    desc: '螢光綠外星人身穿銀色無塵衣，頭頂雙天線會隨時閃爍青色電弧。',
  },
  {
    id: 'crt_bot',
    name: '復古 CRT 電視頭',
    tag: '映像管顏文字・波形臉',
    badge: '📺',
    primary: '#64748b',
    secondary: '#e2e8f0',
    desc: '頭是一台復古映像管電腦螢幕，臉部表情會在顏文字與波形間跳動。',
  },
];

// 🔒 NPC 專屬獨立人物造型目錄（嚴格與使用者 10 種造型完全區隔、絕不重複，且不開放給使用者登入選用）
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
];

window.getAvatarMetaById = function (avatarId) {
  return (
    window.AVATAR_CATALOG.find((a) => a.id === avatarId) ||
    window.NPC_AVATAR_CATALOG.find((a) => a.id === avatarId) ||
    window.AVATAR_CATALOG[0]
  );
};

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
    avatarId = 'frog_eng',
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
  } = opts;

  ctx.save();

  // 依據情境動作調整角色姿態高度、傾斜度與懸浮效果
  let poseOffsetY = 0;
  let poseOffsetX = 0;
  let poseRotate = 0;

  if (isKnockedBack) {
    poseRotate = tick * 0.48; // 被打飛時空中高速旋轉特效
  } else if (actionState === 'sit_code') {
    poseOffsetY = 5;
    poseOffsetX = Math.sin(tick * 0.7) * 0.8; // 高速打字微震動
  } else if (actionState === 'toilet') {
    poseOffsetY = 6 + Math.sin(tick * 0.35) * 1.2; // 蹲坐馬桶微幅用力晃動
  } else if (actionState === 'wash_hands') {
    poseOffsetY = 1;
    poseRotate = Math.sin(tick * 0.35) * 0.08; // 前傾搓手律動
  } else if (actionState === 'drink_coffee') {
    poseRotate = -Math.abs(Math.sin(tick * 0.12)) * 0.16; // 仰頭暢飲咖啡
  } else if (actionState === 'slack_nap') {
    poseOffsetY = 4;
    poseRotate = 0.24 * Math.sin(tick * 0.06); // 打瞌睡歪頭搖晃
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

  const walkCycle = isMoving ? Math.sin(tick * 0.28) : 0;
  const bobY = isMoving ? Math.abs(Math.sin(tick * 0.28)) * -4 : Math.sin(tick * 0.07) * 1.5;
  const flipX = dir === 'left' ? -1 : 1;

  // 1. 底部角色立體陰影
  ctx.fillStyle = 'rgba(15, 23, 42, 0.32)';
  ctx.beginPath();
  ctx.ellipse(0, 18 + jumpOffset * 0.5 - poseOffsetY * 0.6, 15, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, bobY);
  ctx.rotate(poseRotate);
  ctx.scale(flipX, 1);

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
  switch (avatarId) {
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

    case 'crt_bot':
    default: {
      ctx.fillStyle = '#475569';
      fillRoundRect(ctx, -11, -3, 22, 15, 4);
      ctx.fillStyle = '#cbd5e1';
      fillRoundRect(ctx, -15, -28, 30, 24, 5);
      ctx.fillStyle = '#064e3b';
      fillRoundRect(ctx, -12, -25, 24, 17, 3);
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PASS!', 0, -14);
      break;
    }
  }

  // 4. 若是打掃阿姨或啟動「🧹 揮汗大掃除」動作，在手上畫出動態揮舞的黃金長柄掃把
  if (isSweeper || actionState === 'sweep_floor') {
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

  // 4.5 若正在揮舞武器攻擊 (板凳、鍵盤、WAFER晶圓、板手、IC Package、客退報告)，繪製炫酷斬擊刀光與旋轉武器
  if (weaponSwing && weaponSwing.progress < 1) {
    ctx.save();
    const p = weaponSwing.progress;
    const swingAngle = -1.3 + p * 2.7;
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
    ctx.translate(x, y - jumpOffset);
    ctx.textAlign = 'center';

    switch (actionState) {
      case 'sit_code': {
        // 💻 坐下寫 Code：懸浮發光全息鍵盤 + 左右雙手高速敲擊殘影 + 往上飄的程式碼粒子
        const keyBounceL = Math.sin(tick * 0.85) * 3;
        const keyBounceR = Math.cos(tick * 0.85) * 3;
        // 全息鍵盤底座
        ctx.fillStyle = 'rgba(14, 165, 233, 0.88)';
        fillRoundRect(ctx, -16, -3, 32, 6, 2);
        ctx.fillStyle = '#bae6fd';
        ctx.fillRect(-13, -2, 26, 2);
        // 左右雙手高速敲鍵盤小圓手
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(-8, -5 + keyBounceL, 3.2, 0, Math.PI * 2);
        ctx.arc(8, -5 + keyBounceR, 3.2, 0, Math.PI * 2);
        ctx.fill();
        // 雙層程式碼粒子往上飄
        ctx.font = 'bold 10.5px monospace';
        ctx.fillStyle = '#38bdf8';
        const codeY1 = -38 - ((tick * 0.75) % 24);
        const codeY2 = -38 - (((tick + 15) * 0.75) % 24);
        ctx.fillText(tick % 24 < 12 ? '{ YIELD: 99.9% }' : '</> PASS!', -8, codeY1);
        ctx.fillStyle = '#4ade80';
        ctx.fillText('0101', 14, codeY2);
        break;
      }
      case 'toilet': {
        // 🚽 關門上廁所：雙手攤開看報紙 📰 (隨呼吸上下動) + 臉紅用力冒汗珠 💦 + 潔淨閃光
        const paperBob = Math.sin(tick * 0.22) * 2.2;
        ctx.fillStyle = '#f8fafc';
        fillRoundRect(ctx, -11, -7 + paperBob, 22, 13, 2);
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1;
        strokeRoundRect(ctx, -11, -7 + paperBob, 22, 13, 2);
        ctx.fillStyle = '#334155';
        ctx.fillRect(-8, -4 + paperBob, 16, 2);
        ctx.fillRect(-8, 0 + paperBob, 12, 2);
        ctx.font = '16px sans-serif';
        ctx.fillText('💦', -17, -30 + ((tick * 0.45) % 12));
        ctx.fillText('🧻', 18, 4);
        ctx.font = 'bold 10px "Microsoft JhengHei", sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('🚽 解放思考中...', 0, -44);
        break;
      }
      case 'wash_hands': {
        // 🧼 洗手搓泡泡：雙手在胸前快速左右搓揉 + 豐富白色泡沫圈 + 飛濺水珠 💧 與泡泡 🫧
        const rubX = Math.sin(tick * 0.75) * 5.5;
        // 雙手搓揉與肥皂泡沫團
        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.beginPath();
        ctx.arc(-5 + rubX, -3, 5.5, 0, Math.PI * 2);
        ctx.arc(5 - rubX, -3, 5.5, 0, Math.PI * 2);
        ctx.arc(0, -6 + Math.cos(tick * 0.6) * 2, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // 往上飄的潔淨泡泡與水珠
        const b1Y = -28 - ((tick * 0.65) % 24);
        const b2Y = -26 - (((tick + 12) * 0.65) % 24);
        ctx.font = '15px sans-serif';
        ctx.fillText('🫧', -14 + Math.sin(tick * 0.25) * 4, b1Y);
        ctx.fillText('💧', 14 - Math.sin(tick * 0.25) * 4, b2Y);
        ctx.fillText('🧼', 0, -14);
        ctx.font = 'bold 10.5px "Microsoft JhengHei", sans-serif';
        ctx.fillStyle = '#67e8f9';
        ctx.fillText('✨ 洗手搓泡泡・清潔溜溜 ✨', 0, -48);
        break;
      }
      case 'drink_coffee': {
        // ☕ 喝咖啡提神：腳下金色能量充能光環 + 手舉馬克杯暢飲 + 裊裊上升白色蒸氣
        const sipY = -15 + Math.sin(tick * 0.18) * 4;
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.65)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 14, 18 + (tick % 10), 6 + (tick % 10) * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.font = '21px sans-serif';
        ctx.fillText('☕', 14, sipY);
        // 咖啡熱蒸氣曲線
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const steamOffset = (tick * 0.4) % 10;
        ctx.moveTo(14, sipY - 10 - steamOffset);
        ctx.quadraticCurveTo(18, sipY - 15 - steamOffset, 13, sipY - 20 - steamOffset);
        ctx.stroke();

        ctx.font = 'bold 10.5px "Microsoft JhengHei", sans-serif';
        ctx.fillStyle = '#fde047';
        ctx.fillText('⚡ 咖啡因充能 100%!', 0, -45 - ((tick * 0.4) % 10));
        break;
      }
      case 'slack_nap': {
        // 🐟 摸魚打瞌睡：鼻子呼吸睡眠泡泡 + 漸大飄升的 Zzz 符號
        const bubbleR = 3.5 + Math.abs(Math.sin(tick * 0.08)) * 4.5;
        ctx.fillStyle = 'rgba(186, 230, 253, 0.65)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(9, -13, bubbleR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 13px monospace';
        ctx.fillStyle = '#c084fc';
        const zOffset = (tick * 0.45) % 24;
        ctx.fillText('Zzz..🐟', 16, -30 - zOffset);
        break;
      }
      case 'sleep_bed': {
        // 🛌 睡覺：蓋在身上的暖被 + 呼吸睡眠泡泡 + 月亮與雙層 Zzz 飄升特效
        ctx.fillStyle = 'rgba(59, 130, 246, 0.85)';
        fillRoundRect(ctx, -10, 0 + Math.sin(tick * 0.08) * 1.2, 28, 15, 5);
        ctx.strokeStyle = '#93c5fd';
        ctx.lineWidth = 1.2;
        strokeRoundRect(ctx, -10, 0 + Math.sin(tick * 0.08) * 1.2, 28, 15, 5);

        const sleepBubble = 4 + Math.abs(Math.sin(tick * 0.07)) * 5;
        ctx.fillStyle = 'rgba(191, 219, 254, 0.72)';
        ctx.beginPath();
        ctx.arc(-14, -4, sleepBubble, 0, Math.PI * 2);
        ctx.fill();

        const zShift = (tick * 0.4) % 26;
        ctx.font = 'bold 12px monospace';
        ctx.fillStyle = '#fde047';
        ctx.fillText('🌙 Zzz...🛌', 0, -26 - zShift);
        break;
      }
      case 'daydream': {
        // 發呆放空：蚊香圈與靈魂出竅半透明小幽靈
        const ghostY = -44 + Math.sin(tick * 0.12) * 7;
        ctx.font = '20px sans-serif';
        ctx.globalAlpha = 0.72;
        ctx.fillText('👻', 0, ghostY);
        ctx.globalAlpha = 1;
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('@_@ 放空中...', 0, -28);
        break;
      }
      case 'pray_kuaikuai': {
        // 高舉綠乖乖虔誠膜拜 + 萬丈神聖綠光
        const prayY = -42 + Math.sin(tick * 0.25) * 5;
        ctx.fillStyle = 'rgba(16, 185, 129, 0.28)';
        ctx.beginPath();
        ctx.arc(0, prayY, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = '24px sans-serif';
        ctx.fillText('🟢', 0, prayY);
        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = '#10b981';
        ctx.fillText('✨機台乖乖✨', 0, prayY - 18);
        break;
      }
      case 'watch_stock': {
        // 拿放大鏡盯台股 + K線噴發
        ctx.font = '19px sans-serif';
        ctx.fillText('🔍', 14, -18);
        ctx.fillText('📈', -16, -38 + Math.sin(tick * 0.25) * 4);
        break;
      }
      case 'golf_putt': {
        // 🏌️ VP 獨立室高爾夫推桿練習：桿頭擺動、小白球滾動進洞
        const swingAngle = Math.sin(tick * 0.18) * 0.45;
        ctx.save();
        ctx.translate(12, -4);
        ctx.rotate(swingAngle);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(0, 14);
        ctx.stroke();
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-3, 14, 8, 4);
        ctx.restore();

        const ballProgress = (Math.sin(tick * 0.08) + 1) / 2;
        const ballX = 14 + ballProgress * 18;
        const ballY = 12 - ballProgress * 24;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ballX, ballY, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '16px sans-serif';
        ctx.fillText('⛳', 36, -16);
        break;
      }
      case 'meeting_discuss': {
        // 📑 圍桌開會/專案審查：討論筆記與討論氣泡
        ctx.font = '16px sans-serif';
        ctx.fillText('📑', -14, -22 + Math.sin(tick * 0.2) * 3);
        ctx.fillText('💬', 14, -32 + Math.cos(tick * 0.2) * 3);
        break;
      }
      case 'cry': {
        // 😭 股市下跌大哭：眼淚噴湧與向下紅箭頭
        const tearY = (tick * 1.5) % 18;
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-10, -12 + tearY, 3, 6);
        ctx.fillRect(8, -12 + tearY, 3, 6);
        ctx.font = '20px sans-serif';
        ctx.fillText('😭', 0, -32);
        ctx.font = '16px sans-serif';
        ctx.fillText('📉', -20, -18);
        break;
      }
      case 'cheer_stock': {
        // 🚀 股市上漲慶祝：跳躍噴射、彩帶與金幣火箭
        ctx.font = '20px sans-serif';
        ctx.fillText('🎉', -20, -38 + Math.sin(tick * 0.3) * 6);
        ctx.fillText('🚀', 20, -38 + Math.cos(tick * 0.3) * 6);
        ctx.fillText('💰', 0, -48);
        break;
      }
      case 'sweep_floor': {
        // 掃地揚起潔淨閃亮星星
        ctx.font = '15px sans-serif';
        ctx.fillText('✨', -18 + Math.sin(tick * 0.3) * 12, 14);
        ctx.fillText('🫧', 18 - Math.sin(tick * 0.3) * 12, 16);
        break;
      }
      case 'victory_dance': {
        // 狂歡熱舞霓虹音符
        ctx.font = '18px sans-serif';
        ctx.fillText('🎵', -22, -32 + Math.sin(tick * 0.3) * 6);
        ctx.fillText('🎶', 22, -32 + Math.cos(tick * 0.3) * 6);
        break;
      }
      case 'zen_debug': {
        // 盤腿通靈光環
        ctx.font = '16px sans-serif';
        ctx.fillText('🪷', 0, 12);
        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = '#facc15';
        ctx.fillText('✨通靈Debug中✨', 0, -46);
        break;
      }
    }

    ctx.restore();
  }
};

/**
 * 繪製 3D 像素方塊怪物 (Low Yield, 客退, Qual Delay, MO, QIT)
 * 支援 1% 暴走紅蓮破壞氣場與被武器擊飛旋轉特效
 */
window.drawMinecraftMob = function (ctx, mob, tick) {
  ctx.save();
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
