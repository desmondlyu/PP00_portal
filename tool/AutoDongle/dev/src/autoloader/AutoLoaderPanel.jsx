import { useState, useEffect, useRef } from 'react';
import { SerialManager, DONGLE_DUMP_LOG_CMD } from '../utils/serialManager';
import { LocalFileWriter } from '../utils/fileWriter';
import './autoloader.css';

const BACKEND_URL = 'https://auto-dongle.onrender.com';

function AutoLoaderPanel() {
    const [ports, setPorts] = useState({}); // portName -> status (ready | triggered | saved | done | offline)
    const [portNames, setPortNames] = useState({}); // portName -> 自訂 COM 名稱 (例如 COM8)
    const [logs, setLogs] = useState([]);
    const [dirSelected, setDirSelected] = useState(false);
    const [dirName, setDirName] = useState('');
    const [isCapturing, setIsCapturing] = useState(false);
    const [isTriggering, setIsTriggering] = useState(false);
    const [autoTriggerOnConnect, setAutoTriggerOnConnect] = useState(false);
    const [cycType, setCycType] = useState(0);
    const [autoScroll, setAutoScroll] = useState(true);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [isOfflineSummarizing, setIsOfflineSummarizing] = useState(false);

    const fileWriterRef = useRef(new LocalFileWriter());
    const serialManagerRef = useRef(null);
    const logEndRef = useRef(null);
    
    // 使用 ref 防止 React 異步回呼閉包，確保寫檔與自動觸發隨時拿到最新設定
    const portNamesRef = useRef({});
    const autoTriggerRef = useRef(false);

    const handleToggleAutoTrigger = (checked) => {
        setAutoTriggerOnConnect(checked);
        autoTriggerRef.current = checked;
    };

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
                
                const isLogEnd = data.includes('= = = = = = = = LOG END = = = = = = = =');
                // 寫檔
                if (fileWriterRef.current.directoryHandle) {
                    await fileWriterRef.current.writeLog(displayName, data);
                    setPorts(prev => ({ ...prev, [port]: isLogEnd ? 'done' : 'saved' }));
                } else if (isLogEnd) {
                    setPorts(prev => ({ ...prev, [port]: 'done' }));
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
                                   status === 'triggered' ? 'Triggered (已送出指令)' :
                                   status === 'saved' ? 'Writing (寫入中)' :
                                   status === 'done' ? 'Completed (LOG END)' : 'Offline (斷線)';
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

    const triggerSinglePortDump = async (portKey) => {
        if (!serialManagerRef.current) return;
        const displayName = portNamesRef.current[portKey] || portKey;
        const result = await serialManagerRef.current.sendCommand(portKey, DONGLE_DUMP_LOG_CMD);
        const timestamp = new Date().toLocaleTimeString();
        if (result.ok) {
            setPorts(prev => ({ ...prev, [portKey]: 'triggered' }));
            setLogs(prev => [...prev.slice(-199), `[${timestamp}] 系統: 🚀 已對 ${displayName} 送出 DUMP_LOG 指令`]);
        } else {
            setLogs(prev => [...prev.slice(-199), `[${timestamp}] 系統: ⚠️ ${displayName} 指令送出失敗（${result.error}）`]);
        }
    };

    const handleBroadcastDumpLog = async () => {
        if (!serialManagerRef.current) return;
        setIsTriggering(true);
        try {
            const results = await serialManagerRef.current.broadcastCommand(DONGLE_DUMP_LOG_CMD);
            const timestamp = new Date().toLocaleTimeString();
            if (results.length === 0) {
                setLogs(prev => [...prev.slice(-199), `[${timestamp}] 系統: 目前沒有已連線的 Dongle COM 埠可觸發`]);
                return;
            }
            const okList = results.filter(r => r.ok);
            const failList = results.filter(r => !r.ok);
            if (okList.length > 0) {
                setPorts(prev => {
                    const next = { ...prev };
                    okList.forEach(r => { next[r.portName] = 'triggered'; });
                    return next;
                });
            }
            const okNames = okList.map(r => portNamesRef.current[r.portName] || r.portName).join(', ');
            if (failList.length === 0) {
                setLogs(prev => [...prev.slice(-199), `[${timestamp}] 系統: 🚀 已群發 DUMP_LOG 至全部 ${okList.length} 個埠（${okNames}）`]);
            } else {
                const failText = failList.map(r => `${portNamesRef.current[r.portName] || r.portName}:${r.error}`).join(', ');
                setLogs(prev => [...prev.slice(-199), `[${timestamp}] 系統: ⚠️ 群發完成：成功 ${okList.length}、失敗 ${failList.length}（${failText}）`]);
            }
        } finally {
            setIsTriggering(false);
        }
    };

    // 當選取存檔目錄後，自動偵測並連接已授權的裝置
    useEffect(() => {
        if (dirSelected && serialManagerRef.current) {
            serialManagerRef.current.autoConnect().then(async (connected) => {
                if (connected && connected.length > 0) {
                    setIsCapturing(true);
                    const timestamp = new Date().toLocaleTimeString();
                    setLogs(prev => [...prev.slice(-199), `[${timestamp}] 系統: 已自動連接 ${connected.length} 個已授權的 Dongle 裝置`]);
                    if (autoTriggerRef.current) {
                        await new Promise(r => setTimeout(r, 300));
                        await handleBroadcastDumpLog();
                    }
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
                if (autoTriggerRef.current) {
                    await new Promise(r => setTimeout(r, 300));
                    await triggerSinglePortDump(portName);
                }
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
        } catch {
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
        } catch {
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

    const activePortCount = Object.values(ports).filter(s => s !== 'offline').length;
    const donePortCount = Object.values(ports).filter(s => s === 'done').length;

    return (
        <div className="loader-root">
            <div className="panel-toolbar">
                <div>
                    <h2 className="panel-title">Auto Loader</h2>
                    <p className="panel-subtitle">透過 Hub 收集多個 Dongle 的 Serial log，即時寫入本機並彙整 Excel 報表</p>
                </div>
            </div>

            <div className="loader-grid">
                <div className="side-stack">
                    {/* 儲存設定 */}
                    <section className="card">
                        <div className="card-header">
                            <h2><span className="step-num">1</span>儲存設定</h2>
                        </div>
                        <div className="card-body">
                            <p className="card-desc">指定本機資料夾，系統將日誌自動即時寫入該目錄下。</p>
                            <button
                                type="button"
                                onClick={handleSelectDirectory}
                                className={`btn btn-block ${dirSelected ? 'btn-success' : 'btn-primary'}`}
                            >
                                {dirSelected ? '✅ 已授權目錄' : '📁 選擇 Logs 存檔目錄'}
                            </button>
                            {dirSelected && (
                                <div className="dir-indicator">
                                    <span className="dir-label">當前目錄：</span>
                                    <span className="dir-value font-mono" title={dirName}>{dirName}</span>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* 裝置控制 */}
                    <section className="card">
                        <div className="card-header">
                            <h2><span className="step-num">2</span>裝置控制</h2>
                        </div>
                        <div className="card-body">
                            <p className="card-desc">透過 Web Serial 連接 Hub 上所有 Dongle，連線後可免按板子 B2，一鍵群發指令自動輸出 Log。</p>
                            <div className="btn-row">
                                <button type="button" onClick={handleStartCapture} className="btn btn-block btn-primary">
                                    🔌 連接並監控
                                </button>
                                <button
                                    type="button"
                                    onClick={handleStopCapture}
                                    className="btn btn-block btn-danger"
                                    disabled={!isCapturing}
                                >
                                    🛑 停止偵測
                                </button>
                            </div>

                            <div className="trigger-controls">
                                <button
                                    type="button"
                                    id="btnBroadcastDumpLog"
                                    onClick={handleBroadcastDumpLog}
                                    className="btn btn-block btn-trigger-all"
                                    disabled={activePortCount === 0 || isTriggering}
                                    title="對所有已連線的 Dongle COM 埠送出 DUMP_LOG 指令"
                                >
                                    {isTriggering
                                        ? '⏳ 指令群發中...'
                                        : `🚀 一鍵全部輸出 Log（${activePortCount} 個埠）`}
                                </button>
                                <div className="auto-trigger-row">
                                    <label className="check-pill">
                                        <input
                                            type="checkbox"
                                            id="chkAutoTriggerDump"
                                            checked={autoTriggerOnConnect}
                                            onChange={e => handleToggleAutoTrigger(e.target.checked)}
                                        />
                                        <span>連線後自動送出 DUMP_LOG</span>
                                    </label>
                                    <span className="cmd-hint font-mono">TX: DUMP_LOG\n</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 數據整理 */}
                    <section className="card">
                        <div className="card-header">
                            <h2><span className="step-num">3</span>數據整理服務</h2>
                        </div>
                        <div className="card-body">
                            <p className="card-desc">將本機日誌批次上傳至 Python 雲端服務，自動分析並生成 Excel 報表。</p>

                            <div className="field">
                                <label className="form-label" htmlFor="cyc-type-select">Cycling 類型：</label>
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
                                type="button"
                                onClick={handleRunSummary}
                                className="btn btn-block btn-primary"
                                disabled={isSummarizing || isOfflineSummarizing}
                            >
                                {isSummarizing ? '⏳ 整理中...' : '📊 整理當前監控資料'}
                            </button>

                            <div className="offline-divider">
                                <span>或</span>
                            </div>

                            <button
                                type="button"
                                onClick={handleOfflineSummary}
                                className="btn btn-block btn-secondary"
                                disabled={isSummarizing || isOfflineSummarizing}
                            >
                                {isOfflineSummarizing ? '⏳ 整理中...' : '📁 選擇資料夾整理現有 Logs'}
                            </button>
                        </div>
                    </section>
                </div>

                <div className="side-stack">
                    {/* 連線埠狀態 */}
                    <section className="card">
                        <div className="card-header">
                            <h2>🔌 COM 連接埠狀態</h2>
                            <div className="header-badges">
                                {donePortCount > 0 && (
                                    <span className="count-badge done-badge">{donePortCount} / {Object.keys(ports).length} 完成</span>
                                )}
                                <span className="count-badge">{Object.keys(ports).length} 個埠</span>
                            </div>
                        </div>
                        <div className="table-wrapper">
                            <table className="port-table">
                                <thead>
                                    <tr>
                                        <th>Port 名稱</th>
                                        <th>目前狀態</th>
                                        <th style={{ width: '92px' }}>遠端觸發</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.keys(ports).length === 0 ? (
                                        <tr>
                                            <td colSpan="3" className="empty-row">
                                                無已連接之 Serial 裝置，請點選左側「連接並監控」按鈕。
                                            </td>
                                        </tr>
                                    ) : (
                                        Object.entries(ports).map(([port, status]) => (
                                            <tr key={port}>
                                                <td>
                                                    <input
                                                        type="text"
                                                        value={portNames[port] || ''}
                                                        onChange={e => handleRenamePort(port, e.target.value)}
                                                        className="port-name-edit-input font-mono"
                                                        title="點擊修改匯出 Log 的檔名"
                                                    />
                                                </td>
                                                <td>
                                                    <span className={`status-badge ${status}`}>
                                                        {status === 'ready' && 'Ready (已開啟)'}
                                                        {status === 'triggered' && 'Triggered (已送出指令)'}
                                                        {status === 'saved' && 'Writing (寫入中)'}
                                                        {status === 'done' && 'Completed (LOG END)'}
                                                        {status === 'offline' && 'Offline (斷線)'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="btn btn-xs btn-secondary port-action-btn"
                                                        disabled={status === 'offline' || isTriggering}
                                                        onClick={() => triggerSinglePortDump(port)}
                                                        title={`單獨對 ${portNames[port] || port} 送出 DUMP_LOG 指令`}
                                                    >
                                                        📤 輸出
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* 即時日誌 */}
                    <section className="card terminal-card">
                        <div className="card-header">
                            <h2>📺 即時日誌輸出</h2>
                            <div className="terminal-actions">
                                <label className="check-pill">
                                    <input
                                        type="checkbox"
                                        checked={autoScroll}
                                        onChange={e => setAutoScroll(e.target.checked)}
                                    />
                                    <span>自動捲動</span>
                                </label>
                                <button type="button" onClick={handleClearLogs} className="btn btn-sm btn-ghost">
                                    🗑️ 清除日誌
                                </button>
                            </div>
                        </div>
                        <div className="log-window font-mono">
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
                    </section>
                </div>
            </div>

            {/* 全螢幕 Loading 遮罩 */}
            {(isSummarizing || isOfflineSummarizing) && (
                <div className="modal-backdrop loading-overlay">
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

export default AutoLoaderPanel;
