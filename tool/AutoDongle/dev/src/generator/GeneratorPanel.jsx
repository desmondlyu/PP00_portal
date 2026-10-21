import { memo, useEffect, useRef } from 'react';
import { initGenerator } from './generatorCore';
import './generator.css';

const SCALE_OPTIONS = [
    { value: '2', label: 'Block(64KB)' },
    { value: '1', label: 'Half-Block(32KB)' },
    { value: '0', label: 'Sector(4KB)' },
];

function ScaleRow({ label, name }) {
    return (
        <div className="form-row">
            <label className="form-label">{label}</label>
            <div className="radio-pill-group">
                {SCALE_OPTIONS.map(opt => (
                    <label key={opt.value} className="radio-pill">
                        <input type="radio" name={name} value={opt.value} defaultChecked={opt.value === '2'} />
                        <span>{opt.label}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}

// DOM is owned by generatorCore.js after mount, so this component must never re-render.
function GeneratorPanel() {
    const rootRef = useRef(null);

    useEffect(() => {
        initGenerator(rootRef.current);
    }, []);

    return (
        <div className="generator-root" ref={rootRef}>
            <div className="panel-toolbar">
                <div>
                    <h2 className="panel-title">Program Generator</h2>
                    <p className="panel-subtitle">Flash Cycling &amp; Disturb Test 參數產生器（相容 Dongle_UserSetting_V2 · 0x3000 .bin）</p>
                </div>
                <div className="toolbar-actions">
                    <input type="file" id="loadSettingInput" accept=".bin,*/*" hidden />
                    <button type="button" className="btn btn-secondary" id="btnLoadSetting" title="讀取先前產生的設定檔 (.bin)">
                        <span>📂 讀取設定檔</span>
                    </button>
                    <button type="button" className="btn btn-pattern-sel" id="btnOpenSelectPattern">
                        <span>🟦 Select Pattern</span>
                        <span className="pattern-badge" id="badgeSelPattern">All 0x00</span>
                    </button>
                    <button type="button" className="btn btn-pattern-unsel" id="btnOpenUnselectPattern">
                        <span>🟪 Unselect Pattern</span>
                        <span className="pattern-badge" id="badgeUnselPattern">All 0x00</span>
                    </button>
                    <button type="button" className="btn btn-primary" id="btnSaveBin">
                        <span>💾 輸出設定檔 (.bin)</span>
                    </button>
                </div>
            </div>

            <div className="panel-stack">
                {/* Area Summary Banner */}
                <section className="kpi-card">
                    <div className="kpi-header">
                        <span className="kpi-label">選擇區域統計 (0x00 ~ 0x7F · 共 128 單位)</span>
                        <span className="kpi-foot" id="kpiAddressFoot">起始位址: 0x00000000</span>
                    </div>
                    <div className="kpi-area-pills">
                        <span className="area-pill sel">Select 區域: <strong id="statSelCount">0</strong></span>
                        <span className="area-pill unsel">Unselect 區域: <strong id="statUnselCount">0</strong></span>
                        <span className="area-pill pre">Initial 區域: <strong id="statPreCount">0</strong></span>
                        <span className="area-pill time">記錄 Tpp/Terase 區域: <strong id="statTimeCount">0</strong></span>
                    </div>
                </section>

                <div className="config-grid">
                    {/* 初始設定 (Initial_lf) */}
                    <section className="card">
                        <div className="card-header">
                            <h2>⚡ 初始設定 (Initial Settings)</h2>
                        </div>
                        <div className="card-body form-stack">
                            <div className="form-row">
                                <label className="form-label" htmlFor="inputDate">日期 (YYYYMMDD):</label>
                                <div className="form-control-group">
                                    <input type="text" id="inputDate" className="input-text font-mono" maxLength={8} placeholder="20261021" />
                                    <button type="button" className="btn btn-xs btn-ghost" id="btnTodayDate">帶入今日</button>
                                </div>
                            </div>

                            <div className="form-row">
                                <label className="form-label">Flash 電壓 (Vcc):</label>
                                <div className="radio-pill-group" id="groupVcc">
                                    {[['36', '3v6'], ['33', '3v3'], ['27', '2v7'], ['20', '2v0'], ['18', '1v8']].map(([v, l]) => (
                                        <label key={v} className="radio-pill"><input type="radio" name="vcc" value={v} defaultChecked={v === '33'} /><span>{l}</span></label>
                                    ))}
                                </div>
                            </div>

                            <div className="form-row">
                                <label className="form-label">CLK 頻率:</label>
                                <div className="radio-pill-group" id="groupFreq">
                                    {[['1', '80M'], ['2', '55M'], ['3', '45M'], ['4', '33M'], ['5', '26M'], ['8', '18M']].map(([v, l]) => (
                                        <label key={v} className="radio-pill"><input type="radio" name="freq" value={v} defaultChecked={v === '2'} /><span>{l}</span></label>
                                    ))}
                                </div>
                            </div>

                            <div className="form-row">
                                <label className="form-label">模式與驗證項目:</label>
                                <div className="checkbox-pill-group">
                                    {[['chkPGMBAR', 'PGM_BAR', false], ['chkQE', 'Quad-mode', false], ['chkEraseVerify', 'Erase_Verify', true], ['chkPGMVerify', 'PGM_Verify', true], ['chkUnSelVerify', 'UnSel_Verify', true]].map(([id, l, c]) => (
                                        <label key={id} className="check-pill"><input type="checkbox" id={id} defaultChecked={c} /><span>{l}</span></label>
                                    ))}
                                </div>
                            </div>

                            <div className="form-row">
                                <label className="form-label">Erase 等待方式:</label>
                                <div className="delay-control-row">
                                    <div className="radio-pill-group">
                                        <label className="radio-pill"><input type="radio" name="eraseDelayMode" value="0" defaultChecked /><span>Check Busy bit</span></label>
                                        <label className="radio-pill"><input type="radio" name="eraseDelayMode" value="1" /><span>固定Delay(ms)</span></label>
                                    </div>
                                    <div className="delay-time-box">
                                        <label htmlFor="inputEraseDelayTime">時間(ms):</label>
                                        <input type="number" id="inputEraseDelayTime" className="input-text input-sm font-mono" defaultValue="0" min="0" disabled />
                                    </div>
                                </div>
                            </div>

                            <div className="form-row">
                                <label className="form-label">PGM 等待方式:</label>
                                <div className="delay-control-row">
                                    <div className="radio-pill-group">
                                        <label className="radio-pill"><input type="radio" name="pgmDelayMode" value="0" defaultChecked /><span>Check Busy bit</span></label>
                                        <label className="radio-pill"><input type="radio" name="pgmDelayMode" value="1" /><span>固定Delay(us)</span></label>
                                    </div>
                                    <div className="delay-time-box">
                                        <label htmlFor="inputPGMDelayTime">時間(us):</label>
                                        <input type="number" id="inputPGMDelayTime" className="input-text input-sm font-mono" defaultValue="0" min="0" disabled />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="side-stack">
                        {/* 次數 (Times_lf) */}
                        <section className="card">
                            <div className="card-header">
                                <h2>🔄 次數設定 (Loop &amp; Interval Counts)</h2>
                            </div>
                            <div className="card-body form-stack">
                                <div className="form-row-split">
                                    <label htmlFor="inputCytimes">Cycling次數?</label>
                                    <input type="number" id="inputCytimes" className="input-text font-mono" defaultValue="100000" min="1" />
                                </div>
                                <div className="form-row-split">
                                    <label htmlFor="inputSaveTimes">多少次記錄一次Tpp/Terase?</label>
                                    <div className="input-with-btn">
                                        <input type="number" id="inputSaveTimes" className="input-text font-mono" defaultValue="1000" min="1" />
                                        <button type="button" className="btn btn-xs btn-secondary" id="btnAutoSuggestSave" hidden>套用建議值</button>
                                    </div>
                                </div>
                                <div className="form-row-split">
                                    <label htmlFor="inputVerTimes">多少次verify一次unselect Area?</label>
                                    <input type="number" id="inputVerTimes" className="input-text font-mono" defaultValue="1" min="1" />
                                </div>
                            </div>
                        </section>

                        {/* 範圍設定 (Scale_lf) */}
                        <section className="card">
                            <div className="card-header">
                                <h2>📐 範圍設定 (Start Address &amp; Unit Scale)</h2>
                            </div>
                            <div className="card-body form-stack">
                                <div className="form-row">
                                    <label className="form-label" htmlFor="inputAddrStart">起始位置(HEX):</label>
                                    <div className="form-control-group">
                                        <span className="hex-prefix">0x</span>
                                        <input type="text" id="inputAddrStart" className="input-text font-mono" defaultValue="00000000" maxLength={8} placeholder="00000000" />
                                    </div>
                                </div>
                                <ScaleRow label="Select 區域的單位:" name="selScale" />
                                <ScaleRow label="Unselect 區域的單位:" name="verScale" />
                                <ScaleRow label="Initial 區域的單位:" name="preScale" />
                            </div>
                        </section>
                    </div>
                </div>

                {/* 範圍選擇矩陣 (Range_lf) */}
                <section className="card range-card">
                    <div className="range-header">
                        <div>
                            <h2>🎛️ 範圍 (Range Matrix 0x0 ~ 0x7f)</h2>
                            <p className="range-desc">以起始位置為基準，勾選往後多少單位的區域。（Time_Save 的單位與 Select 區域相同，請勿勾選非 Select 區域）</p>
                        </div>
                        <div className="range-actions">
                            <div className="quick-range-box">
                                <span>區間快選:</span>
                                <input type="text" id="inputRangeFrom" className="input-text input-xs font-mono" placeholder="0x0" defaultValue="0x0" />
                                <span>~</span>
                                <input type="text" id="inputRangeTo" className="input-text input-xs font-mono" placeholder="0xf" defaultValue="0xf" />
                                <button type="button" className="btn btn-xs btn-secondary" id="btnRangeSelect">勾選區間</button>
                            </div>
                            <div className="current-area-actions">
                                <span className="action-label">目前區域:</span>
                                <button type="button" className="btn btn-sm btn-secondary" id="btnCheckAll">全勾選</button>
                                <button type="button" className="btn btn-sm btn-ghost" id="btnUncheckAll">全不勾選</button>
                                <button type="button" className="btn btn-sm btn-ghost" id="btnCopySelToTime" title="將 Select區域 的勾選狀態複製到 記錄Tpp/Terase區域">同步 Select ➔ 記錄區域</button>
                            </div>
                        </div>
                    </div>

                    <div className="tabs-bar" role="tablist">
                        <button type="button" className="tab-btn active" data-tab="select">
                            <span className="tab-dot sel"></span><span>Select區域</span><span className="tab-count" id="tabCountSelect">0</span>
                        </button>
                        <button type="button" className="tab-btn" data-tab="unselect">
                            <span className="tab-dot unsel"></span><span>Unselect區域</span><span className="tab-count" id="tabCountUnselect">0</span>
                        </button>
                        <button type="button" className="tab-btn" data-tab="initial">
                            <span className="tab-dot pre"></span><span>Initial區域</span><span className="tab-count" id="tabCountInitial">0</span>
                        </button>
                        <button type="button" className="tab-btn" data-tab="timesel">
                            <span className="tab-dot time"></span><span>記錄Tpp/Terase區域</span><span className="tab-count" id="tabCountTimesel">0</span>
                        </button>
                    </div>

                    <div id="timeSelWarning" className="alert-banner alert-warn" hidden>
                        ⚠️ 注意：「記錄Tpp/Terase區域」中有勾選未包含於「Select區域」的單位！依規格書禁止勾選非 Select 區域。
                    </div>

                    <div className="matrix-wrapper">
                        <div className="matrix-grid" id="matrixGrid"></div>
                    </div>

                    <div className="matrix-footer">
                        <span id="matrixHoverInfo">游標移至單位格上可檢視對應實體 Flash 位址區間</span>
                        <span id="matrixSelectedList" className="font-mono">已勾選: 無</span>
                    </div>
                </section>
            </div>

            {/* Pattern Editor Modal */}
            <div className="modal-backdrop" id="patternModal" hidden>
                <div className="modal-dialog">
                    <div className="modal-header">
                        <h3 id="patternModalTitle">Select Pattern</h3>
                        <button type="button" className="btn-close" id="btnClosePatternModal" aria-label="關閉">✕</button>
                    </div>
                    <div className="modal-body">
                        <div className="pattern-action-bar">
                            <input type="file" id="loadPatternBinInput" accept=".bin,*/*" hidden />
                            <button type="button" className="btn btn-secondary" id="btnLoadPatternBin">📂 讀入 BIN 檔</button>
                            <button type="button" className="btn btn-secondary" id="btnSequentialPattern">🔢 Sequential 00-ff</button>
                            <div className="pattern-all-box">
                                <label htmlFor="inputAllPatternHex">全區指定 (HEX):</label>
                                <input type="text" id="inputAllPatternHex" className="input-text input-xs font-mono" defaultValue="00" maxLength={2} />
                                <button type="button" className="btn btn-primary btn-sm" id="btnApplyAllPattern">套用全部</button>
                            </div>
                            <button type="button" className="btn btn-ghost btn-sm" id="btnToggleBlockGrid">展開/收合分區指定 (32區)</button>
                        </div>

                        <div className="pattern-block-panel" id="patternBlockPanel">
                            <div className="pattern-block-header">
                                <span>分區指定 Pattern（每區 0040 Bytes / 64 Bytes，共 32 區）</span>
                                <button type="button" className="btn btn-primary btn-sm" id="btnApplyBlockPattern">套用分區指定</button>
                            </div>
                            <div className="pattern-block-grid" id="patternBlockGrid"></div>
                        </div>

                        <div className="hex-viewer-container">
                            <div className="hex-viewer-header font-mono">
                                Offset(h)  00 01 02 03 04 05 06 07 08 09 0a 0b 0c 0d 0e 0f  解碼的文字
                            </div>
                            <pre className="hex-viewer-body font-mono" id="patternHexText"></pre>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" id="btnClosePatternModalFooter">關閉</button>
                    </div>
                </div>
            </div>

            {/* Message / Confirm Dialog Modal */}
            <div className="modal-backdrop" id="dialogModal" hidden>
                <div className="modal-dialog modal-sm">
                    <div className="modal-header">
                        <h3 id="dialogTitle">訊息</h3>
                        <button type="button" className="btn-close" id="btnCloseDialog">✕</button>
                    </div>
                    <div className="modal-body">
                        <pre className="dialog-message" id="dialogMessage"></pre>
                    </div>
                    <div className="modal-footer" id="dialogFooter"></div>
                </div>
            </div>
        </div>
    );
}

export default memo(GeneratorPanel);
