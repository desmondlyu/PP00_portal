import React, { useState, useEffect, useRef } from 'react';
import { SerialManager } from './utils/serialManager';
import { LocalFileWriter } from './utils/fileWriter';
import './App.css';

const BACKEND_URL = 'https://auto-dongle.onrender.com';

function App() {
    const [ports, setPorts] = useState({}); // portName -> status
    const [portNames, setPortNames] = useState({}); // portName -> 自訂 COM 名稱 (例如 COM8)
    const [logs, setLogs] = useState([]);
    const [dirSelected, setDirSelected] = useState(false);
    const [dirName, setDirName] = useState('');
    const [isCapturing, setIsCapturing] = useState(false);
    const [cycType, setCycType] = useState(0);
    const [autoScroll, setAutoScroll] = useState(true);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [isOfflineSummarizing, setIsOfflineSummarizing] = useState(false);

    const fileWriterRef = useRef(new LocalFileWriter());
    const serialManagerRef = useRef(null);
    const logEndRef = useRef(null);
    
    // 使用 ref 防止 React 異步回呼閉包，確保寫檔隨時拿到最新的 COM 名稱
    const portNamesRef = useRef({});

    const handleRenamePort = (port, newName) => {
        setPortNames(prev => {
            const updated = { ...prev, [port]: newName };
            portNamesRef.current = updated;
            return updated;
        });
    };

    // 自動捲動日誌視窗
    useEffect(() => {
        if (autoScroll && logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, autoScroll]);

    useEffect(() => {
        serialManagerRef.current = new SerialManager(
            async (port, data) => {
                const displayName = portNamesRef.current[port] || port;
                const timestamp = new Date().toLocaleTimeString();
                setLogs(prev => [...prev.slice(-199), `[${timestamp}] ${displayName}: ${data}`]);
                
                // 寫檔
                if (fileWriterRef.current.directoryHandle) {
                    await fileWriterRef.current.writeLog(displayName, data);
                    setPorts(prev => ({ ...prev, [port]: 'saved' }));
                }
            },
            (port, status) => {
                setPorts(prev => ({ ...prev, [port]: status }));
                // 當新埠連線時，自動分派未被佔用的預設編號 (預設從 COM8 開始)
                if (status === 'ready' && !portNamesRef.current[port]) {
                    setPortNames(prev => {
                        let comNum = 8;
                        const existingNames = Object.values(prev);
                        while (existingNames.includes(`COM${comNum}`)) {
                            comNum++;
                        }
                        const updated = { ...prev, [port]: `COM${comNum}` };
                        portNamesRef.current = updated;
                        return updated;
                    });
                }

                // 新增系統日誌輸出，讓使用者掌握連線狀態變化
                let displayName = portNamesRef.current[port];
                if (!displayName && status === 'ready') {
                    let comNum = 8;
                    const existingNames = Object.values(portNamesRef.current);
                    while (existingNames.includes(`COM${comNum}`)) {
                        comNum++;
                    }
                    displayName = `COM${comNum}`;
                }
                displayName = displayName || port;

                const statusText = status === 'ready' ? 'Ready (已開啟)' : 
                                   status === 'saved' ? 'Writing (寫入中)' : 'Offline (斷線)';
                const timestamp = new Date().toLocaleTimeString();
                setLogs(prev => [...prev.slice(-199), `[${timestamp}] 系統: 連線埠 ${displayName} 狀態更新為 ${statusText}`]);
            }
        );

        return () => {
            if (serialManagerRef.current) {
                serialManagerRef.current.disconnectAll();
            }
        };
    }, []);

    // 當選取存檔目錄後，自動偵測並連接已授權的 CH340 裝置
    useEffect(() => {
        if (dirSelected && serialManagerRef.current) {
            serialManagerRef.current.autoConnect().then(connected => {
                if (connected && connected.length > 0) {
                    setIsCapturing(true);
                    const timestamp = new Date().toLocaleTimeString();
                    setLogs(prev => [...prev, `[${timestamp}] 系統: 已自動連接並偵測已授權的 CH340 裝置`]);
                }
            });
        }
    }, [dirSelected]);

    const handleSelectDirectory = async () => {
        const success = await fileWriterRef.current.selectDirectory();
        setDirSelected(success);
        if (success && fileWriterRef.current.directoryHandle) {
            setDirName(fileWriterRef.current.directoryHandle.name);
        } else {
            setDirName('');
        }
    };

    const handleStartCapture = async () => {
        if (!dirSelected) {
            alert('請先選取 Logs 存檔資料夾！');
            return;
        }
        try {
            const portName = await serialManagerRef.current.connectPort();
            if (portName !== null) {
                // 成功連線新 Port，才更新捕獲狀態
                setIsCapturing(true);
            }
            // 若 portName === null 表示使用者選取了已監控的 Port，靜默處理
        } catch (e) {
            alert('連線失敗：' + e.message);
        }
    };

    const handleStopCapture = async () => {
        await serialManagerRef.current.disconnectAll();
        fileWriterRef.current.clearHandles();
        setIsCapturing(false);
        // 停止偵測後保留 ports 狀態與自定義名稱，讓它們在介面上顯示為 Offline 狀態，
        // 這樣使用者再次按下「連接並監控」時，即可原位重新開啟/刷新連線狀態。
    };

    const handleClearLogs = () => {
        setLogs([]);
    };

    const handleRunSummary = async () => {
        if (!dirSelected) {
            alert('請先選取包含 Logs 的資料夾');
            return;
        }
        
        const dirHandle = fileWriterRef.current.directoryHandle;
        const formData = new FormData();
        formData.append('cyc_type', cycType);

        let fileCount = 0;
        try {
            for await (const entry of dirHandle.values()) {
                if (entry.kind === 'file' && entry.name.endsWith('_log.txt')) {
                    const file = await entry.getFile();
                    formData.append('files', file);
                    fileCount++;
                }
            }
        } catch (err) {
            alert('讀取本機 Logs 發生錯誤，請確保您已授權存檔資料夾的讀取權限！');
            return;
        }

        if (fileCount === 0) {
            alert('在此資料夾內找不到任何符合 *_log.txt 格式的日誌檔案！');
            return;
        }

        setIsSummarizing(true);
        
        try {
            const response = await fetch(`${BACKEND_URL}/api/summary`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || '伺服器處理失敗');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `auto_summary_${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (error) {
            alert('整理失敗：' + error.message);
        } finally {
            setIsSummarizing(false);
        }
    };

    // 離線整理：獨立選擇任意資料夾，不需先開啟監控
    const handleOfflineSummary = async () => {
        let offlineDirHandle;
        try {
            offlineDirHandle = await window.showDirectoryPicker({ mode: 'read' });
        } catch (e) {
            // 使用者取消選取，不做任何動作
            return;
        }

        const formData = new FormData();
        formData.append('cyc_type', cycType);

        let fileCount = 0;
        try {
            for await (const entry of offlineDirHandle.values()) {
                if (entry.kind === 'file' && entry.name.endsWith('_log.txt')) {
                    const file = await entry.getFile();
                    formData.append('files', file);
                    fileCount++;
                }
            }
        } catch (err) {
            alert('讀取資料夾發生錯誤：' + err.message);
            return;
        }

        if (fileCount === 0) {
            alert(`在「${offlineDirHandle.name}」資料夾內找不到任何 *_log.txt 日誌檔案！`);
            return;
        }

        setIsOfflineSummarizing(true);
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, `[${timestamp}] 系統: 開始離線整理「${offlineDirHandle.name}」，共 ${fileCount} 個檔案...`]);

        try {
            const response = await fetch(`${BACKEND_URL}/api/summary`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || '伺服器處理失敗');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `auto_summary_${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            const doneTime = new Date().toLocaleTimeString();
            setLogs(prev => [...prev, `[${doneTime}] 系統: ✅ 離線整理完成，Excel 已下載`]);
        } catch (error) {
            alert('整理失敗：' + error.message);
        } finally {
            setIsOfflineSummarizing(false);
        }
    };

    return (
        <div className="app-container">
            <header className="app-header">
                <div className="logo-section">
                    <span className="logo-icon">⚙️</span>
                    <div>
                        <h1>Dongle Autolog Loader</h1>
                        <p className="subtitle">Dongle Auto loader 自動化平台</p>
                    </div>
                </div>
                <span className="badge">Web Console v2.0</span>
            </header>

            <main className="app-main">
                <div className="control-panel">
                    {/* 儲存設定 */}
                    <div className="card shadow-hover">
                        <div className="card-header">
                            <span className="step-num">1</span>
                            <h3>儲存設定</h3>
                        </div>
                        <p className="card-desc">指定本機資料夾，系統將日誌自動即時寫入該目錄下。</p>
                        <button 
                            onClick={handleSelectDirectory} 
                            className={`btn ${dirSelected ? 'btn-success' : 'btn-primary'}`}
                        >
                            {dirSelected ? '✅ 已授權目錄' : '📁 選擇 Logs 存檔目錄'}
                        </button>
                        {dirSelected && (
                            <div className="dir-indicator">
                                <span className="dir-label">當前目錄：</span>
                                <span className="dir-value" title={dirName}>{dirName}</span>
                            </div>
                        )}
                    </div>

                    {/* 裝置控制 */}
                    <div className="card shadow-hover">
                        <div className="card-header">
                            <span className="step-num">2</span>
                            <h3>裝置控制</h3>
                        </div>
                        <p className="card-desc">透過 Web Serial 建立連線並開始監控硬體埠。</p>
                        <div className="btn-group">
                            <button onClick={handleStartCapture} className="btn btn-start">
                                🔌 連接並監控
                            </button>
                            <button 
                                onClick={handleStopCapture} 
                                className="btn btn-stop" 
                                disabled={!isCapturing}
                            >
                                🛑 停止偵測
                            </button>
                        </div>
                    </div>

                    {/* 數據整理 */}
                    <div className="card shadow-hover">
                        <div className="card-header">
                            <span className="step-num">3</span>
                            <h3>數據整理服務</h3>
                        </div>
                        <p className="card-desc">將本機日誌批次上傳至 Python 雲端服務，自動分析並生成 Excel 報表。</p>
                        
                        <div className="form-group">
                            <label htmlFor="cyc-type-select">Cycling 類型：</label>
                            <select 
                                id="cyc-type-select"
                                value={cycType} 
                                onChange={e => setCycType(Number(e.target.value))}
                                className="select-input"
                            >
                                <option value={0}>1 block 100K</option>
                                <option value={3}>1 sector 100K</option>
                                <option value={1}>16 sectors 100K</option>
                                <option value={2}>7 to 1 Blocks 100K</option>
                                <option value={4}>15 to 1 sectors 100K</option>
                            </select>
                        </div>
                        
                        <button 
                            onClick={handleRunSummary} 
                            className="btn btn-summary"
                            disabled={isSummarizing || isOfflineSummarizing}
                        >
                            {isSummarizing ? '⏳ 整理中...' : '📊 整理當前監控資料'}
                        </button>

                        <div className="offline-divider">
                            <span>或</span>
                        </div>

                        <button
                            onClick={handleOfflineSummary}
                            className="btn btn-offline"
                            disabled={isSummarizing || isOfflineSummarizing}
                        >
                            {isOfflineSummarizing ? '⏳ 整理中...' : '📁 選擇資料夾整理現有 Logs'}
                        </button>
                    </div>
                </div>

                <div className="display-panel">
                    {/* 連線埠狀態 */}
                    <div className="card status-card">
                        <div className="panel-header">
                            <h3>🔌 COM 連接埠狀態</h3>
                            <span className="count-badge">{Object.keys(ports).length} 個埠</span>
                        </div>
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Port 名稱</th>
                                        <th>目前狀態</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.keys(ports).length === 0 ? (
                                        <tr>
                                            <td colSpan="2" className="empty-row">
                                                無已連接之 Serial 裝置，請點選上方連線按鈕。
                                            </td>
                                        </tr>
                                    ) : (
                                        Object.entries(ports).map(([port, status]) => (
                                            <tr key={port}>
                                                <td className="port-name">
                                                    <input 
                                                        type="text" 
                                                        value={portNames[port] || ''} 
                                                        onChange={e => handleRenamePort(port, e.target.value)}
                                                        className="port-name-edit-input"
                                                        title="點擊修改匯出 Log 的檔名"
                                                    />
                                                </td>
                                                <td>
                                                    <span className={`status-badge ${status}`}>
                                                        {status === 'ready' && 'Ready (已開啟)'}
                                                        {status === 'saved' && 'Writing (寫入中)'}
                                                        {status === 'offline' && 'Offline (斷線)'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 即時日誌 */}
                    <div className="card terminal-card">
                        <div className="panel-header">
                            <h3>📺 即時日誌輸出</h3>
                            <div className="terminal-actions">
                                <label className="checkbox-container">
                                    <input 
                                        type="checkbox" 
                                        checked={autoScroll} 
                                        onChange={e => setAutoScroll(e.target.checked)} 
                                    />
                                    <span className="checkmark"></span>
                                    自動捲動
                                </label>
                                <button onClick={handleClearLogs} className="btn-text">
                                    🗑️ 清除日誌
                                </button>
                            </div>
                        </div>
                        <div className="log-window">
                            {logs.length === 0 ? (
                                <div className="log-placeholder">等待連接埠資料傳入...</div>
                            ) : (
                                logs.map((log, idx) => (
                                    <div key={idx} className="log-line">
                                        {log}
                                    </div>
                                ))
                            )}
                            <div ref={logEndRef} />
                        </div>
                    </div>
                </div>
            </main>
            
            {/* Footer 作者與版權資訊 */}
            <footer className="app-footer">
                <div className="footer-content">
                    <p className="footer-title">Auto Dongle Loader by PP32 YPLu (Desmond)</p>
                    <p className="footer-details">
                        Contact: <a href="mailto:yplu@winbond.com">yplu@winbond.com</a> ｜ Copyright © 2026 PP32 YPLu (Desmond) ｜ MIT License
                    </p>
                </div>
            </footer>
            
            {/* 全螢幕 Loading 遮罩 */}
            {(isSummarizing || isOfflineSummarizing) && (
                <div className="loading-overlay">
                    <div className="loading-spinner-container">
                        <div className="loading-spinner"></div>
                        <p className="loading-text">
                            {isOfflineSummarizing ? '📁 離線資料整理中，請稍候...' : '📊 Python 數據整理中，請稍候...'}
                        </p>
                        <span className="loading-subtext">(首次載入或檔案較大時可能需要 30-50 秒)</span>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
