export class SerialManager {
    constructor(onData, onStatusChange) {
        this.onData = onData;
        this.onStatusChange = onStatusChange;
        this.activePorts = new Map();  // portName -> { port, reader, keepReading }
        this.portNamesMap = new Map(); // port -> portName (持久對應關係，使相同硬體重連時保持同一個 PORT_x 名稱)
        this._portCounter = 0;         // 自增計數器，確保每個 portName 全域唯一
    }

    // 產生唯一 port 識別名稱
    _generatePortName() {
        this._portCounter += 1;
        return `PORT_${this._portCounter}`;
    }

    // 自動偵測並開啟所有先前已授權的裝置
    async autoConnect() {
        if (!navigator.serial) return [];
        try {
            const authorizedPorts = await navigator.serial.getPorts();
            const connectedNames = [];
            for (const port of authorizedPorts) {
                // 檢查此實體 port 物件是否已被追蹤（避免重複連接同一個已連線的 port）
                const alreadyTracked = [...this.activePorts.values()].some(b => b.port === port);
                if (alreadyTracked) continue;

                // 取得或分派一個持久的 portName
                let portName = this.portNamesMap.get(port);
                if (!portName) {
                    portName = this._generatePortName();
                    this.portNamesMap.set(port, portName);
                }

                try {
                    await this._startPortConnection(port, portName);
                    connectedNames.push(portName);
                } catch (err) {
                    console.error(`自動開啟/連接 ${portName} 失敗:`, err);
                    this.onStatusChange(portName, 'offline');
                }
            }
            return connectedNames;
        } catch (error) {
            console.error('Auto-connect failed:', error);
            return [];
        }
    }

    // 連接新裝置 (允許選取任何 Serial 裝置)
    async connectPort() {
        // 先嘗試偵測與重連所有已授權但非作用中的裝置 (起「Refresh」或「重連」作用)
        const autoConnected = await this.autoConnect();
        if (autoConnected.length > 0) {
            return autoConnected[0];
        }

        try {
            // 不帶任何 filters，允許使用者選取所有可用的 COM Port
            const port = await navigator.serial.requestPort();

            // 若使用者選取的 port 已在監控中，直接忽略（不重複開啟）
            const alreadyTracked = [...this.activePorts.values()].some(b => b.port === port);
            if (alreadyTracked) {
                console.warn('此 Port 已在監控中，跳過重複連接');
                return null;
            }

            // 取得或分派一個持久的 portName
            let portName = this.portNamesMap.get(port);
            if (!portName) {
                portName = this._generatePortName();
                this.portNamesMap.set(port, portName);
            }

            await this._startPortConnection(port, portName);
            return portName;
        } catch (error) {
            console.error('Connection failed:', error);
            throw error;
        }
    }

    async _startPortConnection(port, portName) {
        await port.open({ baudRate: 115200 });
        this.onStatusChange(portName, 'ready');
        
        const bundle = {
            port,
            reader: null,
            keepReading: true
        };
        this.activePorts.set(portName, bundle);
        this._readLoop(portName, bundle);
    }

    async _readLoop(portName, bundle) {
        try {
            const decoder = new TextDecoder("utf-8");
            bundle.reader = bundle.port.readable.getReader();

            let lineBuffer = ""; // 用於快取未完整的行

            while (bundle.keepReading) {
                const { value, done } = await bundle.reader.read();
                if (done) break;
                if (value) {
                    const chunk = decoder.decode(value, { stream: true });
                    lineBuffer += chunk;
                    const lines = lineBuffer.split('\n');
                    // 彈出最後一個可能未完的行
                    lineBuffer = lines.pop();

                    for (const line of lines) {
                        // 移除所有 \r 字元（裝置以 \r\n 結尾，此處清除殘留 CR）
                        const cleanLine = line.replace(/\r/g, '');
                        // 只有非空的行才送出，避免 \r\n 分割殘留的空字串
                        if (cleanLine) {
                            this.onData(portName, cleanLine);
                        }
                    }
                }
            }

            // 關閉前送出最後一行殘留內容
            if (lineBuffer) {
                const cleanLine = lineBuffer.replace(/\r/g, '');
                if (cleanLine) {
                    this.onData(portName, cleanLine);
                }
            }
        } catch (error) {
            console.error(`Read error on ${portName}:`, error);
        } finally {
            // 1. 確保釋放 Reader 鎖定
            if (bundle.reader) {
                try {
                    bundle.reader.releaseLock();
                } catch (e) {}
            }
            
            // 2. 鎖定釋放後，才關閉 Serial Port 連接
            try {
                await bundle.port.close();
            } catch (error) {
                console.error(`Error closing port ${portName}:`, error);
            }
            
            // 3. 更新狀態為離線
            this.onStatusChange(portName, 'offline');

            // 4. 通知 disconnectAll 關閉已完成
            if (bundle.onClose) {
                bundle.onClose();
            }
        }
    }

    async disconnectAll() {
        const closePromises = [];
        for (const [portName, bundle] of this.activePorts.entries()) {
            bundle.keepReading = false;
            
            const closePromise = new Promise((resolve) => {
                let resolved = false;
                bundle.onClose = () => {
                    if (!resolved) {
                        resolved = true;
                        resolve();
                    }
                };
                // 備用安全超時 (1.5秒)，避免極端情況下關閉卡死
                setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        resolve();
                    }
                }, 1500);
            });
            closePromises.push(closePromise);

            if (bundle.reader) {
                try {
                    // 取消讀取，這會迫使 _readLoop 進入 finally 區塊釋放鎖並關閉 Port
                    await bundle.reader.cancel();
                } catch (e) {}
            }
        }

        if (closePromises.length > 0) {
            await Promise.all(closePromises);
        }
        this.activePorts.clear();
    }
}
