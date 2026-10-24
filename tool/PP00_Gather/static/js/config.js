// PP00 Gather Office — 設定檔 (含 10 種情境動作、4 大技能各 5 種隨機敘述、NPC 專屬 36+ 句台詞庫)

window.GATHER_CONFIG = {
  appName: 'PP00 Gather Office',
  version: 'v2.0.0-3dpixel',
  supabaseUrl: 'https://fvfekakjjzhocpprcbgi.supabase.co',
  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2ZmVrYWtqanpob2NwcHJjYmdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMjIzMDEsImV4cCI6MjA5Nzc5ODMwMX0.mdj4AEaK8lunyDTf7aYMFMCUW7BQXimel7TRi4B5o-4',
  defaultRoomCode: 'PP00',
  units: ['PP00', 'PP10', 'PP20', 'PP30', 'PP40', 'PP50', 'PP11', 'PP12', 'PP21', 'PP22', 'PP31', 'PP32', 'PP41', 'PP42', 'PT12', 'PT22'],
  statuses: [
    { id: 'active', label: '上線', dot: '#22c55e', icon: '🟢' },
    { id: 'idle', label: '閒置', dot: '#facc15', icon: '🟡' },
    { id: 'away', label: '離開', dot: '#f97316', icon: '🟠' },
    { id: 'busy', label: '忙碌', dot: '#ef4444', icon: '🔴' },
  ],
  // 6 種隨機戰鬥武器 + 5 種辦公室補給道具（依照強度由強到弱，生成機率 5%~20%，擊退次數能力 1~10次，命中滿 3 次固定損毀）
  weapons: [
    { id: 'rma_report', category: 'weapon', name: '客退報告', emoji: '📋', power: 35, expBonusPct: 35, knockbackExp: 48, hitsToRepel: 1, maxDurability: 3, spawnRate: 0.05, desc: '經驗+35%｜1次擊退｜耐久3次｜生成率5%' },
    { id: 'bench', category: 'weapon', name: '折疊板凳', emoji: '🪑', power: 32, expBonusPct: 25, knockbackExp: 38, hitsToRepel: 2, maxDurability: 3, spawnRate: 0.06, desc: '經驗+25%｜2次擊退｜耐久3次｜生成率6%' },
    { id: 'wrench', category: 'weapon', name: '機台板手', emoji: '🔧', power: 29, expBonusPct: 22, knockbackExp: 34, hitsToRepel: 3, maxDurability: 3, spawnRate: 0.075, desc: '經驗+22%｜3次擊退｜耐久3次｜生成率7.5%' },
    { id: 'wafer_blade', category: 'weapon', name: 'WAFER晶圓', emoji: '💿', power: 28, expBonusPct: 30, knockbackExp: 42, hitsToRepel: 4, maxDurability: 3, spawnRate: 0.09, desc: '經驗+30%｜4次擊退｜耐久3次｜生成率9%' },
    { id: 'keyboard', category: 'weapon', name: '機械鍵盤', emoji: '⌨️', power: 26, expBonusPct: 18, knockbackExp: 28, hitsToRepel: 5, maxDurability: 3, spawnRate: 0.105, desc: '經驗+18%｜5次擊退｜耐久3次｜生成率10.5%' },
    { id: 'ic_pkg', category: 'weapon', name: 'IC Package', emoji: '🔲', power: 24, expBonusPct: 20, knockbackExp: 30, hitsToRepel: 6, maxDurability: 3, spawnRate: 0.12, desc: '經驗+20%｜6次擊退｜耐久3次｜生成率12%' },
  ],
  items: [
    { id: 'rma_report', category: 'weapon', name: '客退報告', emoji: '📋', power: 35, expBonusPct: 35, knockbackExp: 48, hitsToRepel: 1, maxDurability: 3, spawnRate: 0.05, desc: '經驗+35%｜1次擊退｜耐久3次｜生成率5%' },
    { id: 'bench', category: 'weapon', name: '折疊板凳', emoji: '🪑', power: 32, expBonusPct: 25, knockbackExp: 38, hitsToRepel: 2, maxDurability: 3, spawnRate: 0.06, desc: '經驗+25%｜2次擊退｜耐久3次｜生成率6%' },
    { id: 'wrench', category: 'weapon', name: '機台板手', emoji: '🔧', power: 29, expBonusPct: 22, knockbackExp: 34, hitsToRepel: 3, maxDurability: 3, spawnRate: 0.075, desc: '經驗+22%｜3次擊退｜耐久3次｜生成率7.5%' },
    { id: 'wafer_blade', category: 'weapon', name: 'WAFER晶圓', emoji: '💿', power: 28, expBonusPct: 30, knockbackExp: 42, hitsToRepel: 4, maxDurability: 3, spawnRate: 0.09, desc: '經驗+30%｜4次擊退｜耐久3次｜生成率9%' },
    { id: 'keyboard', category: 'weapon', name: '機械鍵盤', emoji: '⌨️', power: 26, expBonusPct: 18, knockbackExp: 28, hitsToRepel: 5, maxDurability: 3, spawnRate: 0.105, desc: '經驗+18%｜5次擊退｜耐久3次｜生成率10.5%' },
    { id: 'ic_pkg', category: 'weapon', name: 'IC Package', emoji: '🔲', power: 24, expBonusPct: 20, knockbackExp: 30, hitsToRepel: 6, maxDurability: 3, spawnRate: 0.12, desc: '經驗+20%｜6次擊退｜耐久3次｜生成率12%' },
    { id: 'duck', category: 'item', name: 'Debug小黃鴨', emoji: '🦆', power: 19, expBonusPct: 20, knockbackExp: 24, hitsToRepel: 7, maxDurability: 3, spawnRate: 0.14, desc: '經驗+20%｜7次擊退｜耐久3次｜生成率14%' },
    { id: 'coffee', category: 'item', name: '特濃冰美式', emoji: '☕', power: 18, expBonusPct: 16, knockbackExp: 22, hitsToRepel: 8, maxDurability: 3, spawnRate: 0.16, desc: '經驗+16%｜8次擊退｜耐久3次｜生成率16%' },
    { id: 'boba', category: 'item', name: '波霸珍奶', emoji: '🧋', power: 17, expBonusPct: 15, knockbackExp: 20, hitsToRepel: 9, maxDurability: 3, spawnRate: 0.18, desc: '經驗+15%｜9次擊退｜耐久3次｜生成率18%' },
    { id: 'pizza', category: 'item', name: '熱騰騰披薩', emoji: '🍕', power: 16, expBonusPct: 12, knockbackExp: 18, hitsToRepel: 10, maxDurability: 3, spawnRate: 0.20, desc: '經驗+12%｜10次擊退｜耐久3次｜生成率20%' },
    { id: 'kuaikuai', category: 'item', name: '神聖綠乖乖', emoji: '🟢', power: 20, expBonusPct: 28, knockbackExp: 26, hitsToRepel: 10, maxDurability: 3, spawnRate: 0.20, desc: '經驗+28%｜10次擊退｜耐久3次｜生成率20%' },
  ],

  // 5 種像素方塊怪 (生成機率 0.5%，場上最多 3 隻，1% 機率暴走破壞設備)
  minecraftMobs: [
    { id: 'mob_low_yield', name: 'Low Yield', title: '良率綠方塊怪', primary: '#22c55e', secondary: '#14532d', eyeColor: '#090d16', hp: 2, maxHp: 2 },
    { id: 'mob_rma', name: '客退', title: 'RMA赤焰方塊怪', primary: '#ef4444', secondary: '#7f1d1d', eyeColor: '#fde047', hp: 2, maxHp: 2 },
    { id: 'mob_qual_delay', name: 'Qual Delay', title: '延遲紫晶方塊怪', primary: '#a855f7', secondary: '#4c1d95', eyeColor: '#f43f5e', hp: 2, maxHp: 2 },
    { id: 'mob_mo', name: 'MO', title: '催命工單白骨怪', primary: '#e2e8f0', secondary: '#475569', eyeColor: '#0f172a', hp: 2, maxHp: 2 },
    { id: 'mob_qit', name: 'QIT', title: '品質暗影方塊怪', primary: '#1e1b4b', secondary: '#7e22ce', eyeColor: '#e879f9', hp: 2, maxHp: 2 },
  ],

  // 12 種情境動作與專屬快捷鍵 (含新增「🛌 睡覺」與 Alt+快捷鍵)
  contextualActions: [
    { id: 'sit_code', label: '💻 坐下寫Code', hotkey: 'Alt+1', altKey: '1', icon: '💻', zoneHint: '辦公桌 [E]', desc: '坐下敲鍵盤寫Code' },
    { id: 'toilet', label: '🚽 上廁所', hotkey: 'Alt+2', altKey: '2', icon: '🚽', zoneHint: '馬桶間 [E]', desc: '關門蹲馬桶解放' },
    { id: 'wash_hands', label: '🧼 洗手搓泡', hotkey: 'Alt+3', altKey: '3', icon: '🧼', zoneHint: '洗手台 [E]', desc: '開水搓泡泡洗手' },
    { id: 'drink_coffee', label: '☕ 喝咖啡', hotkey: 'Alt+4', altKey: '4', icon: '☕', zoneHint: '茶水間 [E]', desc: '暢飲濃縮咖啡提神' },
    { id: 'slack_nap', label: '🐟 摸魚瞌睡', hotkey: 'Alt+5', altKey: '5', icon: '🐟', zoneHint: '沙發區 [E]', desc: '歪頭打瞌睡摸魚' },
    { id: 'sleep_bed', label: '🛌 睡覺', hotkey: 'Alt+6', altKey: '6', icon: '🛌', zoneHint: '任意位置', desc: '躺平蓋被深層熟睡' },
    { id: 'daydream', label: '🤦 發呆放空', hotkey: 'Alt+7', altKey: '7', icon: '🤦', zoneHint: '任意位置', desc: '眼神放空靈魂出竅' },
    { id: 'pray_kuaikuai', label: '🟢 拜綠乖乖', hotkey: 'Alt+8', altKey: '8', icon: '🟢', zoneHint: '機台前 [E]', desc: '高舉綠乖乖鎮機台' },
    { id: 'watch_stock', label: '📈 看盤盯股', hotkey: 'Alt+9', altKey: '9', icon: '📈', zoneHint: '會議室A [E]', desc: '拿放大鏡緊盯台股' },
    { id: 'sweep_floor', label: '🧹 大掃除', hotkey: 'Alt+0', altKey: '0', icon: '🧹', zoneHint: '走廊/廁所', desc: '揮掃把清掃地板' },
    { id: 'victory_dance', label: '🕺 慶功熱舞', hotkey: 'Alt+-', altKey: '-', icon: '🕺', zoneHint: '任意位置', desc: '良率100%動感熱舞' },
    { id: 'zen_debug', label: '🧘 通靈Debug', hotkey: 'Alt+=', altKey: '=', icon: '🧘', zoneHint: '任意位置', desc: '盤腿漂浮通靈除錯' },
  ],

  // 廁所大便時門外走過的角色/NPC隨機催促台詞
  toiletKickMurmurs: [
    '拉完了沒換我了！',
    '不要再屎遁啦！',
    '好了沒？老闆在找你！',
    '裡面的人好了沒？外面在排隊了！',
  ],

  // 攻擊 VP 或 PP00 處長時被抓進主管室關緊閉 10 秒的 5 句專屬訓話 MURMUR
  bossScoldDialogues: {
    vp: [
      '💢 膽子不小敢打VP！關緊閉10秒反省良率！',
      '💢 竟敢偷襲大老闆！罰你在VP室聽我訓話10秒！',
      '💢 反了反了！這季KPI加倍，先關緊閉10秒！',
      '💢 拿武器敲老闆？給我站在VP桌前反省10秒！',
      '💢 體力這麼好？鎖門訓話10秒，順便交出改善報告！',
    ],
    director_pp00: [
      '💢 敢攻擊PP00處長！抓進處長室關緊閉訓話10秒！',
      '💢 造反啦？鎖門10秒，把CP/FT報表背一遍！',
      '💢 竟敢對處長動手！關緊閉10秒好好反省！',
      '💢 拿道具敲主管？進處長室罰站聽訓10秒鐘！',
      '💢 精力太旺盛是吧？關門訓話10秒不准跑！',
    ],
    cleaner_auntie: [
      '🧹 地板剛拖好踩得都是腳印還敢動手！給我站在這反省十秒！',
      '🧹 連打掃阿姨你都敢惹？垃圾桶跟茶水間抹布罰你洗十次！',
      '🧹 沒大沒小！阿姨掃地看過幾千個工程師，就你最皮！面壁十秒！',
      '🧹 咖啡屑跟餅乾屑都阿姨在清，你還敢揮武器？乖乖被我訓話！',
      '🧹 手上的武器給我放下！阿姨手上的黃金拖把可比你的板凳硬多啦！',
    ],
  },

  // 濃縮精簡版互動狀態敘述（單行不換行，保持聊天室整潔）
  skillNarratives: {
    exchange: [
      '🎁 與 {target} 交換了 {myItem} ⇄ {theirItem}',
      '🎁 空投 {myItem} 給 {target}，換回 {theirItem}',
      '🎁 與 {target} 完成秘密道具交接 {theirItem}',
      '🎁 贈送 {myItem} 給 {target}，收到回禮 {theirItem}',
      '🎁 與 {target} 驚喜盲盒交換獲得 {theirItem}',
    ],
    wave: [
      '👋 向 {target} 熱情揮手打招呼',
      '👋 對 {target} 微笑致意揮手',
      '👋 向 {target} 揮手呼叫支援看波形',
      '👋 朝 {target} 招手示意原地開聊',
      '👋 向 {target} 優雅揮手致意',
    ],
    zap: [
      '⚡ 對 {target} 發動無塵室靜電突襲',
      '⚡ 釋放十萬伏特電醒了 {target}',
      '⚡ 用防摸魚靜電戳了 {target} 一下',
      '⚡ 指尖閃電擊中 {target} 瞬間提神',
      '⚡ 物理靜電喚醒正在放空的 {target}',
    ],
    cheer: [
      '🍻 與 {target} 舉杯慶祝 Yield 100%',
      '🍻 與 {target} 擊掌乾杯慶祝 All Pass',
      '🍻 與 {target} 碰杯致敬戰勝高低溫測試',
      '🍻 與 {target} 狂歡碰杯灑下慶功彩帶',
      '🍻 與 {target} 舉杯祈禱機台一路綠燈',
    ],
    weaponHit: [
      '⚔️ 揮動 {weapon} 擊退了 {target}',
      '⚔️ 用 {weapon} 將 {target} 拍飛出去',
      '⚔️ 精準揮擊 {weapon} 打飛 {target}',
      '⚔️ 高舉 {weapon} 震飛了 {target}',
      '⚔️ 轉身重擊用 {weapon} 擊退 {target}',
    ],
  },

  // 濃縮精簡版 NPC 隨機 Murmur 與對談句子（簡潔有力、不佔行）
  npcDialogues: {
    vp: [
      '👑 今年車規與工規出貨量目標翻倍！',
      '👑 CP良率提升最多的人，季獎金加碼！',
      '👑 剛看完財報，PP00這季表現很棒！',
      '👑 下午兩點到會議室A看台股與簡報！',
      '👑 茶水間換了精品咖啡豆，大家多喝！',
      '👑 Lab那幾台T5830稼動率要盯緊喔！',
      '👑 多善用自動化工具減少填表時間！',
      '👑 大家很有活力，今年尾牙頭獎加碼！',
      '👑 機台上的綠色乖乖絕對不能過期！',
      '👑 在VP室思考下一代產品Roadmap！',
    ],
    director_pp00: [
      '🎖️ FT高低溫特性報告中午前要匯總喔！',
      '🎖️ CZ分析有兩項Marginal請PE確認。',
      '🎖️ TE這週把T5830測試時間縮減18%，讚！',
      '🎖️ 借機請先上網預約，別現場搶機台！',
      '🎖️ CP規格轉譯記得開16進位防呆檢查！',
      '🎖️ 實驗室電腦上的Dongle紀錄記得收好！',
      '🎖️ 各組同仁有問題隨時來處長室討論！',
      '🎖️ 多善用良率自動彙總報表省時間！',
      '🎖️ 剛巡完Lab，Wafer Loader運作順暢！',
      '🎖️ 開會前先把Wafer Map圖表準備好！',
    ],
    auntie_meifeng: [
      '🧹 走廊剛拖好地還濕濕的，小心慢走！',
      '🧹 冰箱放三天的珍奶阿姨要清掉囉！',
      '🧹 垃圾桶全是美式空罐，工程師辛苦啦！',
      '🧹 誰把披薩屑掉地毯？阿姨拿掃把追喔！',
      '🧹 廁所剛刷得亮晶晶，上完記得沖水！',
      '🧹 機台上的綠乖乖阿姨有幫你們擦乾淨！',
      '🧹 坐電腦太久腰會痠，起來走一走啦！',
      '🧹 會議室A大螢幕紅通通，股票又漲啦？',
      '🧹 實驗室地板擦得超乾淨，別弄髒餒！',
      '🧹 黃金掃把掃過，Bug跟灰塵通通退散！',
    ],
    auntie_shufen: [
      '🧽 茶水間咖啡機剛洗好，現在泡最香！',
      '🧽 在廁所鏡子前發呆？程式卡關了吼？',
      '🧽 主管室地毯吸過兩遍，乾淨溜溜！',
      '🧽 那個彩色晶圓圖看起來真像藝術品！',
      '🧽 今天茶水間有補全新的綠色乖乖喔！',
      '🧽 誰上完廁所沒洗手？淑芬姐都有在看！',
      '🧽 實驗室高溫爐旁暖呼呼的真好打掃～',
      '🧽 飲水機剛換好水，年輕人多喝溫水！',
      '🧽 VP大老闆今天心情不錯，報告穩過啦！',
      '🧽 淑芬姐打掃三十年，地板亮到能照鏡子！',
    ],
    bird_commander: [
      '🦩 嘎！全園區都在本紅鶴雷達監控中！',
      '🦩 百米衝刺巡視各部門跟會議室！',
      '🦩 我就在你背後盯著你螢幕看喔！',
      '🦩 你做什麼動作，本指揮官就跟著做！',
      '🦩 走！進會議室關門討論10秒Action Item！',
      '🦩 快拿板凳跟鍵盤把方塊怪敲飛！',
      '🦩 看到同仁發呆就貼在旁邊一直碎念！',
      '🦩 從茶水間衝刺到Lab只要三秒鐘！',
      '🦩 別拿手上的晶圓跟報告拍我紅鶴頭套！',
      '🦩 Qual Delay解了沒？MO簽了沒？嘎嘎！',
    ],
  },

  // 閱後即焚、防洗版冷卻與遊戲平衡設定
  security: {
    murmurTtlMs: 8000,
    chatMessageTtlMs: 30000,
    proximityRadiusPx: 165,
    chatCooldownMs: 900,
    skillCooldownMs: 1200,
    interactCooldownMs: 1200, // 按鍵 E / F / 情境動作防連點洗版冷卻 (1.2 秒)
    idleTimeoutMs: 30000, // 30 秒無動作自動切換為「🟡 閒置」狀態
    randomDropIntervalMs: 10 * 60 * 1000, // 每 10 分鐘自動隨機生成 5 種掉落物
    randomDropBatchCount: 5,
    berserkChance: 0.001, // NPC 隨機暴走機率 0.1% (0.001)
    berserkKnockbackPower: 24,
    berserkKnockbackTicks: 28,
    mobSpawnChance: 0.005, // 小怪物每秒生成機率 0.5% (0.005)
    maxMobCount: 3, // 場上小怪物同時不超過 3 隻
    mobBerserkChance: 0.01, // 像素方塊怪 1% 機率暴走破壞電腦與實驗室機台
    birdSpawnRate: 1.0, // 鳥人指揮官 100% 常駐於辦公室巡視（全時段在場）
    birdFollowChance: 0.10, // 鳥人指揮官 10% 機率跟隨線上使用者並持續 Murmur
    birdMeetingPullChance: 0.10, // 鳥人指揮官視線內 10% 機率拉進會議室 10 秒（觸發後機率遞減）
    birdDropChance: 0.20, // 鳥人指揮官被武器擊退後 20% 機率獲得道具與經驗
    birdExileChance: 0.10, // 攻擊鳥人指揮官 10% 機率暫時擊飛退場（60 秒後自動返場）
    userCritInjuryChance: 0.05, // 攻擊線上使用者 5% 機率造成重傷
    userInjuryLockMs: 5 * 60 * 1000, // 重傷休養 5 分鐘無法動彈 (300 秒)
    npcContextualActionChance: 0.30, // VP / PP00處長 / 打掃阿姨 隨機情境動作機率 30%
    meetingLockMs: 10000, // 會議室或主管室關緊閉 10 秒
    weaponMaxDurability: 3, // 裝備擊退 3 次損毀消失
    maxUserChatLines: 20, // 真實使用者對談訊息紀錄上限 20 行
    maxStatusLogLines: 10, // NPC 與互動狀態動作紀錄上限 10 行
  },
};
