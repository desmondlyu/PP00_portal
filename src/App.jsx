import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  BarChart3, 
  LineChart, 
  GitBranch, 
  Shield, 
  ExternalLink,
  Lock,
  Layers,
  Mail,
  Github,
  Settings,
  X,
  AlertCircle,
  RotateCw
} from 'lucide-react';
// 自適應動態路徑解析器
const getToolUrl = (tool) => {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isLocalhost) {
    return tool.devUrl;
  }
  // 判斷是否為 Web 伺服器 (如 Github Pages)
  if (window.location.protocol.startsWith('http')) {
    return tool.ghPagesUrl;
  }
  // 本地雙擊運行 (file://)
  return tool.localPath;
};

export default function App() {
  const [activeTool, setActiveTool] = useState(null);
  const [iframeKey, setIframeKey] = useState(0);

  // 後台管理狀態與驗證邏輯
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  
  // 記錄哪些平台處於離線狀態
  const [offlineTools, setOfflineTools] = useState(() => {
    const defaultOffline = {
      'cp-mss-converter': true,
      'dongle-summary': true,
      'writer': true
    };
    try {
      const saved = localStorage.getItem('pp00_offline_tools');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...defaultOffline, ...parsed };
      }
      return defaultOffline;
    } catch {
      return defaultOffline;
    }
  });

  // 輔助雜湊計算 (SHA-256，含 file:// 環境 fallback)
  const sha256 = async (message) => {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const msgBuffer = new TextEncoder().encode(message);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Fallback: 純 JS SHA-256（供 file:// 等非 Secure Context 使用）
    const utf8 = new TextEncoder().encode(message);
    const K = [
      0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
      0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
      0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
      0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
      0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
      0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
      0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
      0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
    ];
    const rotr = (n, x) => (x >>> n) | (x << (32 - n));
    const ch = (x, y, z) => (x & y) ^ (~x & z);
    const maj = (x, y, z) => (x & y) ^ (x & z) ^ (y & z);
    const sigma0 = x => rotr(2, x) ^ rotr(13, x) ^ rotr(22, x);
    const sigma1 = x => rotr(6, x) ^ rotr(11, x) ^ rotr(25, x);
    const gamma0 = x => rotr(7, x) ^ rotr(18, x) ^ (x >>> 3);
    const gamma1 = x => rotr(17, x) ^ rotr(19, x) ^ (x >>> 10);
    const bitLen = utf8.length * 8;
    const padded = [];
    for (let i = 0; i < utf8.length; i++) padded.push(utf8[i]);
    padded.push(0x80);
    while ((padded.length % 64) !== 56) padded.push(0);
    for (let i = 7; i >= 0; i--) padded.push((bitLen / Math.pow(2, 8 * i)) & 0xff);
    let [h0,h1,h2,h3,h4,h5,h6,h7] = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    for (let off = 0; off < padded.length; off += 64) {
      const W = new Array(64);
      for (let t = 0; t < 16; t++) W[t] = (padded[off+t*4]<<24)|(padded[off+t*4+1]<<16)|(padded[off+t*4+2]<<8)|padded[off+t*4+3];
      for (let t = 16; t < 64; t++) W[t] = (gamma1(W[t-2]) + W[t-7] + gamma0(W[t-15]) + W[t-16]) | 0;
      let [a,b,c,d,e,f,g,h] = [h0,h1,h2,h3,h4,h5,h6,h7];
      for (let t = 0; t < 64; t++) {
        const T1 = (h + sigma1(e) + ch(e,f,g) + K[t] + W[t]) | 0;
        const T2 = (sigma0(a) + maj(a,b,c)) | 0;
        h=g; g=f; f=e; e=(d+T1)|0; d=c; c=b; b=a; a=(T1+T2)|0;
      }
      h0=(h0+a)|0; h1=(h1+b)|0; h2=(h2+c)|0; h3=(h3+d)|0; h4=(h4+e)|0; h5=(h5+f)|0; h6=(h6+g)|0; h7=(h7+h)|0;
    }
    return [h0,h1,h2,h3,h4,h5,h6,h7].map(v => (v>>>0).toString(16).padStart(8,'0')).join('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAdminError('');
    
    const userHash = await sha256(adminUsername);
    const passHash = await sha256(adminPassword);
    
    const targetUserHash = '89dedc754b651d12483ba5e1341a9ece0699f674f817388c1c0e1717214bd2a9';
    const targetPassHash = '844d53219189c49b8ad507c264979947a171006b7763a9ca201378cbfa41b5d1';
    
    if (userHash === targetUserHash && passHash === targetPassHash) {
      setIsLoggedIn(true);
      setAdminPassword('');
    } else {
      setAdminError('管理員帳號或密碼錯誤！');
    }
  };

  const toggleToolStatus = (toolId) => {
    setOfflineTools(prev => {
      const updated = { ...prev, [toolId]: !prev[toolId] };
      localStorage.setItem('pp00_offline_tools', JSON.stringify(updated));
      return updated;
    });
  };

  const closeAdminModal = () => {
    setShowAdminModal(false);
    setIsLoggedIn(false);
    setAdminUsername('');
    setAdminPassword('');
    setAdminError('');
  };

  // 動態滑鼠發光特效
  useEffect(() => {
    const handleMouseMove = (e) => {
      const cards = document.querySelectorAll('.bento-card');
      cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const glow = card.querySelector('.card-glow');
        if (glow) {
          glow.style.left = `${x}px`;
          glow.style.top = `${y}px`;
        }
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Escape 鍵關閉 iframe overlay 與管理後台 modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (activeTool) {
          setActiveTool(null);
        } else if (showAdminModal) {
          closeAdminModal();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool, showAdminModal]);

  // 實際工具配置資料
  const tools = [
    {
      id: 'tto-analysis',
      title: 'CP Rawdata/TTO 分析工具',
      badge: 'Active',
      desc: 'NOR Flash CP 測試資料 analysis 系統。提供站點與產品維度的統計比較、單一統計報表中的 Group 分層展開（Group → Test Item）、模擬欄位調整後的即時圖表變化，並提供關鍵字分析輔助。',
      icon: TrendingUp,
      gradient: 'var(--grad-cyan-blue)',
      gridClass: 'col-4',
      devUrl: 'http://localhost:3002',
      localPath: './tool/TTO_Agent/rawdata_analysis/index.html',
      ghPagesUrl: './tool/TTO_Agent/rawdata_analysis/index.html',
      status: 'active',
      details: [
        '統計圖表、統計報表與 Site / Touch Down 熱圖',
        'Group 分層展開與 Test Item 模擬數值聯動計算',
        '關鍵字分析定位異常（快速對應站點、Site、UTL_DUT、BIN）'
      ]
    },
    {
      id: 'jb-booking',
      title: 'PP00 JB Lab 借機系統',
      badge: 'Active',
      desc: 'PP00 測試機台預約管理系統。支援卡片日曆預約與現場平面圖大框架模式切換，提供現場 21 台機台（含 Ms*）的預約管理與即時防重疊檢驗。',
      icon: Calendar,
      gradient: 'var(--grad-purple-pink)',
      gridClass: 'col-4',
      devUrl: 'http://localhost:3003',
      localPath: './tool/JB_booking/index.html',
      ghPagesUrl: './tool/JB_booking/index.html',
      status: 'active',
      details: [
        '卡片模式 / 大框架平面圖模式雙視圖切換',
        '現場 21 台機台 CRUD 預約管理',
        '同機台同時間預約防重疊限制與本機身份識別'
      ]
    },
    {
      id: 'dl-to-excel',
      title: 'CP Datalog-to-Excel 轉換器',
      badge: 'Active',
      desc: 'CP Datalog 轉換為 Excel 報表工具',
      icon: Layers,
      gradient: 'var(--grad-emerald-cyan)',
      gridClass: 'col-4',
      devUrl: 'http://localhost:3005',
      localPath: './tool/DL_to_Excel/index.html',
      ghPagesUrl: './tool/DL_to_Excel/index.html',
      status: 'active',
      details: [
        '支援 Datalog 解析',
        '自動排版',
        '一鍵導出 Excel'
      ]
    },
    {
      id: 'cz-dataset',
      title: 'FT 特性分析工具',
      badge: 'Active',
      desc: 'FT 特性驗證測試報告本地端 React 互動式分析儀表板。支援 Excel 報告拖曳解析、良率邊際裕度檢核，提供適合 JMP 作圖的資料結構。',
      icon: BarChart3,
      gradient: 'var(--grad-emerald-cyan)',
      gridClass: 'col-4',
      devUrl: 'http://localhost:3000',
      localPath: './tool/CZ_dataset/index.html',
      ghPagesUrl: './tool/CZ_dataset/index.html',
      status: 'active',
      details: [
        '批次 Excel 上傳解析與 Out of Spec (Fail) / Pass Marginal 良率檢核',
        '高密度表格即時編輯、Verdict/Ratio 聯動計算與修改高亮標記',
        '自動分群頁籤、雙層巢狀水平降序圖表與無損公式 Excel 導出'
      ]
    },
    {
      id: 'dl-analysis',
      title: 'CP DL 分析工具',
      badge: 'Active',
      desc: '100% 本地端離線執行的半導體測試數據與 CP 晶圓失效分析工具，無須連網或安裝伺服器。支援 Wafer Map 失效地圖、缺陷空間分佈識別與多維度統計圖表。',
      icon: LineChart,
      gradient: 'var(--grad-amber-pink)',
      gridClass: 'col-4',
      devUrl: 'http://localhost:5173',
      localPath: './tool/CP_DL_Analysis/index.html',
      ghPagesUrl: './tool/CP_DL_Analysis/index.html',
      status: 'active',
      details: [
        '100% 本地端離線運作，確保晶圓數據安全無虞',
        '雙向框選聯動：晶圓空間框選 (Spatial Filter) 與圖表高亮同步 (Highlight Sync)',
        '多維度統計圖表（相關性 Pearson R 與線性趨勢線、分佈箱形圖、直方圖）'
      ]
    },
    {
      id: 'yield-summary',
      title: 'CP/FT Yield Auto Summary',
      badge: 'Active',
      desc: 'CP/FT 良率自動彙總報表工具',
      icon: BarChart3,
      gradient: 'var(--grad-purple-pink)',
      gridClass: 'col-4',
      devUrl: 'http://localhost:3006',
      localPath: './tool/Yield_Summary/index.html',
      ghPagesUrl: './tool/Yield_Summary/index.html',
      status: 'active',
      details: [
        '支援 CP/FT 數據',
        '多維度良率彙總',
        '一鍵生成自動報表'
      ]
    },
    {
      id: 'cp-mss-converter',
      title: 'CP MSS 轉換工具',
      badge: 'Active',
      desc: 'CP MSS 測試數據轉換與格式標準化工具。功能待開發。',
      icon: Layers,
      gradient: 'var(--grad-cyan-blue)',
      gridClass: 'col-4',
      devUrl: '#',
      localPath: '#',
      ghPagesUrl: '#',
      status: 'active',
      details: [
        '功能待開發'
      ]
    },
    {
      id: 'dongle-summary',
      title: 'Dongle Auto Summary',
      badge: 'Active',
      desc: 'Dongle 數據彙總與自動分析報告生成系統。功能待開發。',
      icon: LineChart,
      gradient: 'var(--grad-purple-pink)',
      gridClass: 'col-4',
      devUrl: '#',
      localPath: '#',
      ghPagesUrl: '#',
      status: 'active',
      details: [
        '功能待開發'
      ]
    },
    {
      id: 'writer',
      title: 'WRITER按鍵錄製精靈',
      badge: 'Active',
      desc: '專為TeraTerm終端機設計,錄製操控WRITER時的按鍵記憶巨集',
      icon: GitBranch,
      gradient: 'var(--grad-emerald-cyan)',
      gridClass: 'col-4',
      devUrl: '#',
      localPath: '#',
      ghPagesUrl: '#',
      status: 'active',
      details: [
        '功能待開發'
      ]
    }
  ];

  // 更新日誌
  const changelog = [
    { version: 'v1.4.0', date: '2026-06-15', text: '新增 CP MSS 轉換工具、Dongle Auto Summary、WRITER按鍵錄製精靈 等待開發離線入口卡片。', isNew: true },
    { version: 'v1.3.0', date: '2026-06-15', text: '新增 CP Datalog-to-Excel 轉換器入口卡片。', isNew: false },
    { version: 'v1.2.0', date: '2026-06-09', text: '依據實際工具需求重構排版。整合 TTO 分析、JB Lab 借機系統、CZ 特性分析與待開發 DL 工具入口。', isNew: false },
    { version: 'v1.1.0', date: '2026-05-20', text: '完成 JB Lab 借機系統之平面圖大框架模式與機台校準優化。', isNew: false },
    { version: 'v1.0.0', date: '2026-04-17', text: 'PP00 Tool Portal 基礎架構部署，套用 MIT 授權與版權聲明。', isNew: false }
  ];

  return (
    <div className="app-container">
      {/* 標頭 Header */}
      <header className="portal-header">
        <div className="brand-section">
          <img src="./logo.png" alt="PP00 Tool Portal Logo" className="brand-logo" />
          <div className="brand-info">
            <h1>PP00 Tool Portal</h1>
            <p>記憶體研發與量化科技・入口網站系統</p>
          </div>
        </div>
        {(() => {
          const offlineCount = Object.values(offlineTools).filter(Boolean).length;
          const isAllOnline = offlineCount === 0;
          return (
            <div className="system-status" style={!isAllOnline ? { 
              background: 'rgba(245, 158, 11, 0.1)', 
              borderColor: 'rgba(245, 158, 11, 0.2)', 
              color: 'var(--accent-amber)' 
            } : undefined}>
              <span className="status-dot" style={!isAllOnline ? { 
                backgroundColor: 'var(--accent-amber)', 
                boxShadow: '0 0 8px var(--accent-amber)' 
              } : undefined}></span>
              <span>{isAllOnline ? 'SYSTEM ACTIVE - ALL PORTALS ONLINE' : `SYSTEM ACTIVE - ${offlineCount} PORTAL(S) OFFLINE`}</span>
            </div>
          );
        })()}
      </header>

      {/* Bento Grid 內容區 */}
      <main className="bento-grid">
        
        {/* 英雄展示區 (Col-8) */}
        <section className="bento-card col-8 hero-card">
          <div className="card-glow"></div>
          <div className="hero-content">
            <span className="hero-tag">Tech & SaaS Portal</span>
            <h2 className="hero-title">PP00 數位化分析工具入口網站</h2>
            <p className="hero-desc">
              歡迎使用 PP00 Tool Portal。此平台收納了晶片特性驗證、NOR Flash 測試資料分析、測試機台預約管理等專用工具，為研發與專案控制提供直覺且安全的交互界面。
            </p>
          </div>
          <div className="hero-visual">
            <svg className="hero-visual-svg" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" />
              <circle cx="50" cy="50" r="30" />
              <circle cx="50" cy="50" r="20" />
              <line x1="50" y1="10" x2="50" y2="90" />
              <line x1="10" y1="50" x2="90" y2="50" />
            </svg>
          </div>
        </section>

        {/* 更新日誌 (Col-4) */}
        <section className="bento-card col-4">
          <div className="card-glow"></div>
          <div>
            <div className="changelog-header">
              <h3 className="changelog-title">
                <GitBranch size={20} color="var(--accent-blue)" />
                更新日誌
              </h3>
              <span className="tool-badge">Changelog</span>
            </div>
            <div className="changelog-list">
              {changelog.map((item, idx) => (
                <div key={idx} className={`changelog-item ${item.isNew ? 'new' : ''}`}>
                  <div className="changelog-meta">
                    <span className="changelog-version">{item.version}</span>
                    <span className="changelog-date">{item.date}</span>
                  </div>
                  <p className="changelog-text">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 動態渲染工具卡片 */}
        {tools.map((tool) => {
          const IconComp = tool.icon;
          const isPending = tool.status === 'pending';
          const isOffline = offlineTools[tool.id];
          
          return (
            <section key={tool.id} className={`bento-card ${tool.gridClass} ${isOffline ? 'tool-offline' : ''}`}>
              <div className="card-glow"></div>
              <div>
                <div className="tool-icon-wrapper" style={{ background: tool.gradient }}>
                  <IconComp size={24} />
                </div>
                <div className="tool-info">
                  <h3 className="tool-title">
                    {tool.title}
                    <span className="tool-badge" style={{ 
                      background: isOffline ? 'rgba(236, 72, 153, 0.1)' : (isPending ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)'),
                      color: isOffline ? 'var(--accent-pink)' : (isPending ? 'var(--accent-amber)' : 'var(--accent-emerald)')
                    }}>{isOffline ? 'Offline' : tool.badge}</span>
                  </h3>
                  <p className="tool-desc" style={{ marginBottom: '14px' }}>{tool.desc}</p>
                  
                  {/* 功能特點列表 */}
                  <ul style={{ 
                    listStyle: 'none', 
                    fontSize: '0.8rem', 
                    color: 'var(--text-secondary)',
                    paddingLeft: '0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    {tool.details.map((detail, dIdx) => (
                      <li key={dIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <span style={{ color: isOffline ? 'var(--accent-pink)' : (isPending ? 'var(--accent-amber)' : 'var(--accent-blue)'), marginTop: '2px' }}>•</span>
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div style={{ marginTop: '20px' }}>
                {isOffline ? (
                  <div className="tool-action-btn offline-disabled" style={{ cursor: 'not-allowed' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Lock size={14} />
                      平台已暫時關閉
                    </span>
                  </div>
                ) : isPending ? (
                  <div className="tool-action-btn" style={{ cursor: 'not-allowed', opacity: 0.6 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Lock size={14} />
                      待開發規劃中
                    </span>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      setActiveTool(tool);
                      setIframeKey(prev => prev + 1);
                    }}
                    className="tool-action-btn"
                    style={{ border: 'none', width: '100%', background: 'rgba(255, 255, 255, 0.03)', cursor: 'pointer' }}
                  >
                    <span>啟動應用程式</span>
                    <ExternalLink size={14} />
                  </button>
                )}
              </div>
            </section>
          );
        })}

        {/* 作者卡片 (Col-12 - 獨立橫幅) */}
        <section className="bento-card col-12 profile-card-horizontal">
          <div className="card-glow"></div>
          <div className="profile-horizontal-layout">
            {/* 左側：個人資訊 */}
            <div className="profile-left-panel">
              <div className="profile-header">
                <div className="profile-avatar">DL</div>
                <div className="profile-info">
                  <h3>Desmond Lyu</h3>
                  <p>PP32 YPLu</p>
                </div>
              </div>
              <p className="profile-bio" style={{ margin: '12px 0 0 0' }}>
                A guy who got into vibe coding just out of pure interest.
              </p>
            </div>
            
            {/* 右側：聯絡、標籤與後台 */}
            <div className="profile-right-panel">
              <div className="profile-links-badges">
                <div className="profile-links-container">
                  <a href="mailto:yplu@winbond.com" className="footer-link" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', textDecoration: 'none', fontSize: '0.8rem' }}>
                    <Mail size={14} />
                    <span>yplu@winbond.com</span>
                  </a>
                  <a href="https://github.com/desmondlyu" target="_blank" rel="noopener noreferrer" className="footer-link" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.8rem' }}>
                    <Github size={14} />
                    <span>github.com/desmondlyu</span>
                  </a>
                </div>
                <div className="profile-badges" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <span className="profile-badge" style={{ fontSize: '0.7rem', padding: '4px 8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--panel-border)', borderRadius: '6px', color: 'var(--text-secondary)' }}>Semiconductor PM</span>
                  <span className="profile-badge" style={{ fontSize: '0.7rem', padding: '4px 8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--panel-border)', borderRadius: '6px', color: 'var(--text-secondary)' }}>CP Data Architect</span>
                  <span className="profile-badge" style={{ fontSize: '0.7rem', padding: '4px 8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--panel-border)', borderRadius: '6px', color: 'var(--text-secondary)' }}>Vibe Coder</span>
                </div>
              </div>
              <div className="profile-admin-action" style={{ display: 'flex', alignItems: 'center' }}>
                <button className="admin-trigger-btn" onClick={() => setShowAdminModal(true)} style={{ margin: '0' }}>
                  <Settings size={14} />
                  <span>系統管理後台</span>
                </button>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* 頁尾 Footer 與版權宣告 */}
      <footer className="portal-footer">
        <div className="footer-left">
          <p>© 2026 <span className="footer-author">PP32 YPLu (Desmond Lyu)</span>. All rights reserved.</p>
        </div>
        <div className="footer-right">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={14} />
            <span>Licence: MIT</span>
          </div>
          <span>|</span>
          <span style={{ color: 'var(--text-muted)' }}>Version 1.4.0</span>
        </div>
      </footer>

      {/* 系統管理後台 Modal */}
      {showAdminModal && (
        <div className="admin-modal-overlay" onClick={closeAdminModal}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>
                <Lock size={18} color="var(--accent-cyan)" />
                <span>系統管理後台</span>
              </h3>
              <button className="admin-close-btn" onClick={closeAdminModal}>
                <X size={18} />
              </button>
            </div>

            {!isLoggedIn ? (
              <form onSubmit={handleLogin}>
                <div className="admin-form-group">
                  <label>管理員帳號</label>
                  <input 
                    type="text" 
                    className="admin-input" 
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    required 
                    placeholder="請輸入帳號"
                  />
                </div>
                <div className="admin-form-group">
                  <label>管理員密碼</label>
                  <input 
                    type="password" 
                    className="admin-input" 
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    required 
                    placeholder="請輸入密碼"
                  />
                </div>
                {adminError && (
                  <div className="admin-error-msg">
                    <AlertCircle size={14} />
                    <span>{adminError}</span>
                  </div>
                )}
                <button type="submit" className="admin-submit-btn">驗證登入</button>
              </form>
            ) : (
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--accent-emerald)', marginBottom: '20px', fontWeight: '500' }}>
                  ✓ 管理權限已授權 (yplu)
                </div>
                <div className="admin-tool-list">
                  {tools.map(tool => (
                    <div key={tool.id} className="admin-tool-item">
                      <div>
                        <span className="admin-tool-name">{tool.title}</span>
                        <div className="admin-tool-status-label">
                          狀態：{offlineTools[tool.id] ? (
                            <span style={{ color: 'var(--accent-pink)' }}>Offline (已關閉)</span>
                          ) : (
                            <span style={{ color: 'var(--accent-emerald)' }}>Active (正常)</span>
                          )}
                        </div>
                      </div>
                      <label className="switch">
                        <input 
                          type="checkbox" 
                          checked={!offlineTools[tool.id]} 
                          onChange={() => toggleToolStatus(tool.id)}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  ))}
                </div>
                <button 
                  className="admin-logout-btn" 
                  onClick={() => {
                    setIsLoggedIn(false);
                    setAdminUsername('');
                    setAdminPassword('');
                  }}
                >
                  安全登出後台
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen Iframe Overlay */}
      {activeTool && (
        <div className="portal-iframe-overlay">
          <div className="portal-iframe-header">
            <div className="portal-iframe-title">
              {React.createElement(activeTool.icon, { size: 18, style: { color: 'var(--accent-cyan)' } })}
              <span>{activeTool.title}</span>
            </div>
            <div className="portal-iframe-actions">
              <button 
                className="portal-iframe-btn" 
                onClick={() => setIframeKey(prev => prev + 1)} 
                title="重新整理"
              >
                <RotateCw size={16} />
              </button>
              <a 
                className="portal-iframe-btn" 
                href={getToolUrl(activeTool)} 
                target="_blank" 
                rel="noopener noreferrer"
                title="在新視窗開啟"
              >
                <ExternalLink size={16} />
              </a>
              <button 
                className="portal-iframe-btn portal-iframe-close" 
                onClick={() => setActiveTool(null)} 
                title="返回首頁"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="portal-iframe-container">
            <iframe 
              key={iframeKey}
              src={getToolUrl(activeTool)} 
              className="portal-iframe" 
              title={activeTool.title}
              allow="clipboard-write"
            />
          </div>
        </div>
      )}
    </div>
  );
}

