import React, { useState, useEffect } from 'react';
import { supabase } from './utils/supabaseClient';
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
  RotateCw,
  MessageSquare
} from 'lucide-react';
// 自適應動態路徑解析器
const getToolUrl = (tool) => {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isPortalDevServer = isLocalhost && window.location.port === '3100';
  if (isPortalDevServer) {
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
  
  // 1. 卡片離線狀態：優先抓 localStorage 作為預設與 Fallback 基礎
  const [offlineTools, setOfflineTools] = useState(() => {
    const defaultOffline = {
      'tto-analysis': false,
      'jb-booking': false,
      'dl-to-excel': false,
      'cz-dataset': false,
      'dl-analysis': false,
      'yield-summary': false,
      'cp-mss-converter': false,
      'dongle-summary': true,
      'writer': true,
      'eng_report': true,
      'pp00-knowledge-agent': false
    };
    try {
      const saved = localStorage.getItem('pp00_offline_tools');
      if (saved) {
        return { ...defaultOffline, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('讀取 localStorage 失敗：', e);
    }
    return defaultOffline;
  });

  // 從 Supabase 載入最新狀態與監聽 Auth (若 supabase 啟用)
  useEffect(() => {
    if (!supabase) {
      console.log('Supabase 未設定，網站將以本地唯讀狀態運行，無法登入管理後台。');
      return;
    }

    const fetchStatuses = async () => {
      try {
        const { data, error } = await supabase.from('tool_statuses').select('id, is_offline');
        if (!error && data) {
          const statusMap = {};
          data.forEach(row => {
            statusMap[row.id] = row.is_offline;
          });
          setOfflineTools(prev => ({ ...prev, ...statusMap }));
          // 同步到本地作為 fallback
          localStorage.setItem('pp00_offline_tools', JSON.stringify({ ...offlineTools, ...statusMap }));
        }
      } catch (err) {
        console.error('從 Supabase 讀取卡片狀態失敗，將採用本地狀態：', err);
      }
    };
    fetchStatuses();

    // 檢查目前 Session 狀態以保持管理員登入
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAdminError('');
    
    // 如果沒有配置 Supabase，直接拒絕登入，不再保留任何本地雜湊後門
    if (!supabase) {
      setAdminError('未設定 Supabase 雲端資料庫，無法使用管理員登入功能！');
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: adminUsername,
        password: adminPassword,
      });

      if (error) {
        setAdminError('管理員登入失敗：' + error.message);
      } else {
        setIsLoggedIn(true);
        setAdminPassword('');
      }
    } catch (err) {
      setAdminError('連線 Supabase 錯誤，請稍後再試。');
    }
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setIsLoggedIn(false);
    setAdminUsername('');
    setAdminPassword('');
    setAdminError('');
  };

  const toggleToolStatus = async (toolId) => {
    const nextStatus = !offlineTools[toolId];
    
    // 1. 更新前端 UI 與本地 localStorage
    setOfflineTools(prev => {
      const updated = { ...prev, [toolId]: nextStatus };
      localStorage.setItem('pp00_offline_tools', JSON.stringify(updated));
      return updated;
    });

    // 2. 如果有 Supabase，同步寫入雲端資料表
    if (supabase) {
      try {
        const { error } = await supabase
          .from('tool_statuses')
          .update({ is_offline: nextStatus })
          .eq('id', toolId);
        
        if (error) {
          alert('同步至 Supabase 失敗（可能是權限不足）：' + error.message);
          // 復原本地狀態
          setOfflineTools(prev => {
            const restored = { ...prev, [toolId]: !nextStatus };
            localStorage.setItem('pp00_offline_tools', JSON.stringify(restored));
            return restored;
          });
        }
      } catch (err) {
        console.error('寫入 Supabase 失敗，使用本地存儲：', err);
      }
    }
  };

  const closeAdminModal = () => {
    setShowAdminModal(false);
    if (isLoggedIn && supabase) {
      supabase.auth.signOut();
    }
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
      title: 'NOR Flash Rawdata/TTO 分析平台',
      badge: 'Active',
      desc: '支援多個產品 CP Rawdata 分析、測試時間以及測試關鍵字分析，支援匯出報表可回倒系統，減省重新分析 Rawdata 動作。',
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
      title: 'PP00 竹北借機系統',
      badge: 'Active',
      desc: '竹北 4F 實驗室預約平台。',
      icon: Calendar,
      gradient: 'var(--grad-purple-pink)',
      gridClass: 'col-4',
      devUrl: 'http://localhost:3003',
      localPath: './tool/JB_booking/index.html',
      ghPagesUrl: './tool/JB_booking/index.html',
      status: 'active',
      details: [
        '卡片模式/實驗室平面圖模式',
        '同機台同時間預約防重疊限制與本機身份識別'
      ]
    },
    {
      id: 'dl-to-excel',
      title: 'NOR Flash CP Datalog-to-Excel 轉換器',
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
        '支援多個 Datalog 合併/單獨轉換成Excel',
        '使用者可選擇要指定的匯出項目，加速匯出動作'
      ]
    },
    {
      id: 'cz-dataset',
      title: 'NOR Flash FT 特性系統分析工具',
      badge: 'Active',
      desc: '自動解析各測試項目 Pass/Fail 結果，支援線上修改項目的SPEC，並即時更新測試結果。平台提供產品分析總結報表（Pass, Fail 以及 <15% 邊界條件的危險項目）。',
      icon: BarChart3,
      gradient: 'var(--grad-emerald-cyan)',
      gridClass: 'col-4',
      devUrl: 'http://localhost:3000',
      localPath: './tool/CZ_dataset/index.html',
      ghPagesUrl: './tool/CZ_dataset/index.html',
      status: 'active',
      details: [
        '除了判斷 Pass and Fail，支援 Pass Marginal 判斷',
        '支援即時編輯 SPEC，會聯動計算結果',
        '支援圖表功能，以及分群功能(READ, TIMING, DC, 4BYTE, NON 4BYTE等)'
      ]
    },
    {
      id: 'dl-analysis',
      title: 'NOR Flash CP DL log 分析工具',
      badge: 'Active',
      desc: 'NOR Flash CP DL 分析工具。',
      icon: LineChart,
      gradient: 'var(--grad-amber-pink)',
      gridClass: 'col-4',
      devUrl: 'http://localhost:5173',
      localPath: './tool/CP_DL_Analysis/index.html',
      ghPagesUrl: './tool/CP_DL_Analysis/index.html',
      status: 'active',
      details: [
        '支援 wafer map/correlation/distribution/box plot圖表顯示',
        '雙向框選聯動：任意框選圖表即可顯示對應區塊數據，且 wafer map 同步highlight框選位置',
        '多維度統計圖表（相關性 Pearson R 與線性趨勢線、分佈箱形圖、直方圖）'
      ]
    },
    {
      id: 'yield-summary',
      title: 'VSC CP/FT Yield Auto Summary',
      badge: 'Active',
      desc: 'CP/FT VSC 良率自動彙總報表工具',
      icon: BarChart3,
      gradient: 'var(--grad-purple-pink)',
      gridClass: 'col-4',
      devUrl: 'http://localhost:3006',
      localPath: './tool/Yield_Summary/index.html',
      ghPagesUrl: './tool/Yield_Summary/index.html',
      status: 'active',
      details: [
        '#注意：需下載 PROXY.bat/PROXY.py 透過自己主機當跳板，才可連線公司API',
        '支援 CP/FT 數據',
        '一鍵生成自動報表'
      ]
    },
    {
      id: 'cp-mss-converter',
      title: 'NOR Flash CP MSS 轉換工具',
      badge: 'Active',
      desc: '將原始 Testing Team CP MSS 轉換為 Product Team 格式。支援自動解合併儲存格、Comment 解析、迴圈偵測與格式防呆驗證。',
      icon: Layers,
      gradient: 'var(--grad-cyan-blue)',
      gridClass: 'col-4',
      devUrl: 'http://localhost:5174',
      localPath: './tool/CP_MSS/index.html',
      ghPagesUrl: './tool/CP_MSS/index.html',
      status: 'active',
      details: [
        '使用者可自訂 DATASHEET SPEC 條件後，同步匯入各站點測試項目',
        '自動偵測並高亮顯示 Excel 檔案中是否有 For 迴圈項目'
      ]
    },
    {
      id: 'dongle-summary',
      title: 'Dongle Auto loader 自動化平台',
      badge: 'Active',
      desc: '透過Hub快速收集所有Dongle測試資料，並自動彙整測試報告。',
      icon: LineChart,
      gradient: 'var(--grad-purple-pink)',
      gridClass: 'col-4',
      devUrl: 'http://localhost:5173',
      localPath: './tool/AutoDongle/index.html',
      ghPagesUrl: './tool/AutoDongle/index.html',
      status: 'active',
      details: [
        '支援多個USB Device匯出資料，並依據Cycling類型一次性整理產生報表',
        '支援直接整理個人電腦上的Dongle log檔案，請留意 log 檔案名稱需要是 COM*_log.txt (*為數字)'
      ]
    },
    {
      id: 'writer',
      title: 'WRITER 按鍵錄製精靈',
      badge: 'Active',
      desc: '專為 LP56 燒錄控制設計，支援 CH340 自動連線、按鍵操作錄製與回放功能。',
      icon: GitBranch,
      gradient: 'var(--grad-emerald-cyan)',
      gridClass: 'col-4',
      devUrl: './tool/web_terminal/index.html',
      localPath: './tool/web_terminal/index.html',
      ghPagesUrl: './tool/web_terminal/index.html',
      status: 'active',
      details: [
        '使用 Web Serial API，免裝終端機，直接網頁化連線',
        '支援「測試流程錄製」與「回放」，可匯出/匯入 JSON 格式',
        '支援 Big5 編碼防亂碼、終端機輸出 Log 錄製功能'
      ]
    },
    {
      id: 'eng_report',
      title: '工程實驗報告產生器',
      badge: '',
      desc: '自動將CP yield，CZ summary，datasheet，整理成工程實驗報告',
      icon: Layers,
      gradient: 'var(--grad-emerald-cyan)',
      gridClass: 'col-4',
      devUrl: '#',
      localPath: '#',
      ghPagesUrl: '#',
      status: 'active',
      details: [
        '開發中'
      ]
    },
    {
      id: 'pp00-knowledge-agent',
      title: 'PP00 Knownledge Agent',
      badge: 'Active',
      desc: 'PP00 內部知識型 Agent',
      icon: MessageSquare,
      gradient: 'var(--grad-cyan-blue)',
      gridClass: 'col-4',
      devUrl: 'https://m365.cloud.microsoft/chat/?titleId=T_6f1ea993-be1e-5380-6352-a5300c2839e6&source=copilot-studio&redirfrom=CsrToSSR&auth=2',
      localPath: 'https://m365.cloud.microsoft/chat/?titleId=T_6f1ea993-be1e-5380-6352-a5300c2839e6&source=copilot-studio&redirfrom=CsrToSSR&auth=2',
      ghPagesUrl: 'https://m365.cloud.microsoft/chat/?titleId=T_6f1ea993-be1e-5380-6352-a5300c2839e6&source=copilot-studio&redirfrom=CsrToSSR&auth=2',
      status: 'active',
      openExternal: true,
      details: [
        '提供PP00內部知識搜尋，包含測試、產品以及製程相關知識檢索',
        '提供新人訓練必須了解的課程，技能訓練',
        '僅限PP00使用'
      ]
    }
  ];

  // 更新日誌
  const changelog = [
    { version: 'v1.6.0', date: '2026-06-29', text: '整合 WRITER 按鍵錄製精靈（Web Terminal），支援 LP56 燒錄控制、CH340 自動連線、時序錄製與回放功能。', isNew: true },
    { version: 'v1.5.0', date: '2026-06-22', text: '新增 PP00 Knownledge Agent 內部知識型 Agent（因安全性限制改為外部網址新分頁啟動）。', isNew: false },
    { version: 'v1.4.0', date: '2026-06-15', text: '新增 CP MSS 轉換工具、Dongle Auto Summary、WRITER按鍵錄製精靈 等待開發離線入口卡片。', isNew: false },
    { version: 'v1.3.0', date: '2026-06-15', text: '新增 CP Datalog-to-Excel 轉換器入口卡片。', isNew: false },
    { version: 'v1.2.0', date: '2026-06-09', text: '依據實際工具需求重構排版。整合 TTO 分析、JB Lab 借機系統、CZ 特性分析與待開發 DL 工具入口。', isNew: false },
    { version: 'v1.1.0', date: '2026-05-20', text: '完成 JB Lab 借機系統之平面圖大框架模式與機台校準優化。', isNew: false },
    { version: 'v1.0.0', date: '2026-04-17', text: 'PP00 Tool Portal 基礎架構部署，套用 MIT 授權與版權聲明。', isNew: false }
  ];

  // 偵測網址參數，支援特定工具直接全螢幕加載並抹除網址參數，維持網址乾淨（包含安全防護）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const toolId = params.get('tool');
    if (toolId) {
      const tool = tools.find(t => t.id === toolId);
      if (tool) {
        const isOffline = offlineTools[tool.id];
        const isPending = tool.status === 'pending';
        
        if (isOffline) {
          alert('該平台已暫時關閉，無法載入！');
        } else if (isPending) {
          alert('該平台仍在開發中，尚未開放！');
        } else {
          setActiveTool(tool);
        }
        
        // 清除 query 參數，將網址列重寫回乾淨的 Portal 主網域 (相容 file:// 與 http://)
        const cleanUrl = window.location.pathname;
        window.history.replaceState(null, '', cleanUrl);
      }
    }
  }, [tools, offlineTools]);

  // 雙重防呆：當前開啟的工具一旦被設為 offline 或是 pending，立刻強制關閉
  useEffect(() => {
    if (activeTool) {
      const isOffline = offlineTools[activeTool.id];
      const isPending = activeTool.status === 'pending';
      if (isOffline || isPending) {
        setActiveTool(null);
        alert('該平台已被管理員關閉或尚未開放！');
      }
    }
  }, [offlineTools, activeTool]);

  return (
    <div className="app-container">
      {/* 標頭 Header */}
      <header className="portal-header">
        <div className="brand-section">
          <img src="./logo.png" alt="PP00 Tool Portal Logo" className="brand-logo" />
          <div className="brand-info">
            <h1>PP00 Tool Portal</h1>
            <p>PP00 NOR FLASH 應用程式入口網站系統</p>
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
                    fontSize: '0.95rem', 
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
                      const url = getToolUrl(tool);
                      if (tool.openExternal) {
                        window.open(url, '_blank');
                      } else {
                        setActiveTool(tool);
                        setIframeKey(prev => prev + 1);
                      }
                    }}
                    className="tool-action-btn"
                    style={{ border: 'none', width: '100%', background: 'rgba(255, 255, 255, 0.03)', cursor: 'pointer' }}
                  >
                    <span>{tool.openExternal ? '在新分頁啟動' : '啟動應用程式'}</span>
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
                <div className="profile-avatar">YP</div>
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
          <span style={{ color: 'var(--text-muted)' }}>Version 1.5.0</span>
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
                href={`./?tool=${activeTool.id}`} 
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
              allow="serial *; clipboard-write *"
            />
          </div>
        </div>
      )}
    </div>
  );
}
