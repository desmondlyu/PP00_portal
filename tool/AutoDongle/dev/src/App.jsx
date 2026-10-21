import { useEffect, useState } from 'react';
import AutoLoaderPanel from './autoloader/AutoLoaderPanel';
import GeneratorPanel from './generator/GeneratorPanel';
import './App.css';

const TABS = [
    { id: 'loader', icon: '📡', label: 'Auto Loader', hint: 'Serial Log 收集與報表整理' },
    { id: 'generator', icon: '🧩', label: 'Program Generator', hint: '測試參數 .bin 產生器' },
];

const readHashTab = () => {
    const id = window.location.hash.replace('#', '');
    return TABS.some(t => t.id === id) ? id : 'loader';
};

function BrandIcon() {
    return (
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="3" y="3" width="34" height="34" rx="8" stroke="url(#brandGrad1)" strokeWidth="2.5" />
            <path d="M12 14H28M12 20H24M12 26H20" stroke="url(#brandGrad1)" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="28" cy="25" r="4" fill="url(#brandGrad2)" />
            <defs>
                <linearGradient id="brandGrad1" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#00F5D4" />
                    <stop offset="50%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#A855F7" />
                </linearGradient>
                <linearGradient id="brandGrad2" x1="24" y1="21" x2="32" y2="29" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#F97316" />
                    <stop offset="100%" stopColor="#EC4899" />
                </linearGradient>
            </defs>
        </svg>
    );
}

function App() {
    const [activeTab, setActiveTab] = useState(readHashTab);

    useEffect(() => {
        const onHash = () => setActiveTab(readHashTab());
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash);
    }, []);

    const selectTab = (id) => {
        setActiveTab(id);
        if (window.location.hash !== `#${id}`) {
            window.history.replaceState(null, '', `#${id}`);
        }
    };

    const onTabKeyDown = (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const idx = TABS.findIndex(t => t.id === activeTab);
        const next = TABS[(idx + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length];
        selectTab(next.id);
        document.getElementById(`app-tab-${next.id}`)?.focus();
    };

    return (
        <>
            <div className="bg-grid"></div>
            <div className="bg-glow bg-glow-1"></div>
            <div className="bg-glow bg-glow-2"></div>

            <header className="top-header">
                <div className="brand">
                    <div className="brand-icon"><BrandIcon /></div>
                    <div>
                        <div className="brand-title">
                            Dongle Web Console
                            <span className="version-badge">v2.0 Web</span>
                        </div>
                        <div className="brand-subtitle">Auto Loader &amp; Program Generator</div>
                    </div>
                </div>

                <nav className="app-tabs" role="tablist" aria-label="功能切換" onKeyDown={onTabKeyDown}>
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            id={`app-tab-${tab.id}`}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === tab.id}
                            aria-controls={`app-panel-${tab.id}`}
                            tabIndex={activeTab === tab.id ? 0 : -1}
                            className={`app-tab ${activeTab === tab.id ? 'active' : ''}`}
                            title={tab.hint}
                            onClick={() => selectTab(tab.id)}
                        >
                            <span aria-hidden="true">{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </nav>
            </header>

            {/* Both panels stay mounted so serial connections and generator state survive tab switches */}
            <main className="container">
                {TABS.map(tab => (
                    <section
                        key={tab.id}
                        id={`app-panel-${tab.id}`}
                        role="tabpanel"
                        aria-labelledby={`app-tab-${tab.id}`}
                        hidden={activeTab !== tab.id}
                    >
                        {tab.id === 'loader' ? <AutoLoaderPanel /> : <GeneratorPanel />}
                    </section>
                ))}
            </main>

            <footer className="app-footer">
                <p className="footer-title">Web Design by PP32 YPLu (Desmond) ｜ Dongle Program Generator by PE12 YACHEN1</p>
                <p className="footer-details">
                    Contact: <a href="mailto:yplu@winbond.com">yplu@winbond.com</a> ｜ Copyright © 2026 PP32 YPLu (Desmond) ｜ MIT License
                </p>
            </footer>
        </>
    );
}

export default App;
