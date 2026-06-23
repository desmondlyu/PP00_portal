export class LocalFileWriter {
    constructor() {
        this.directoryHandle = null;
        this.buffers = new Map(); // portName -> accumulated logs
        this.isWriting = new Map(); // portName -> boolean lock
        
        // 定期將暫存寫入磁碟 (每秒)
        this.flushInterval = setInterval(() => {
            this.flushAll();
        }, 1000);
    }

    async selectDirectory() {
        try {
            this.directoryHandle = await window.showDirectoryPicker();
            return true;
        } catch (error) {
            console.error('Directory selection failed:', error);
            return false;
        }
    }

    writeLog(portName, data) {
        const currentBuffer = this.buffers.get(portName) || "";
        // 防禦性清洗：移除 data 結尾所有殘留的 \r 或 \n，
        // 確保每行在檔案中只有一個 \n，不產生空行
        const sanitized = data.replace(/[\r\n]+$/, '');
        this.buffers.set(portName, currentBuffer + sanitized + '\n');
    }

    async flushAll() {
        if (!this.directoryHandle) return;

        for (const [portName, dataToFlush] of this.buffers.entries()) {
            if (!dataToFlush) continue;
            if (this.isWriting.get(portName)) continue;

            this.isWriting.set(portName, true);
            this.buffers.set(portName, ""); // 先清空緩衝，防止重複寫入

            try {
                // 每次寫入都向目錄 handle 請求最新的 fileHandle
                // 這能確保當使用者手動刪除本機檔案時，系統能自動在下一秒重新建立檔案
                const fileHandle = await this.directoryHandle.getFileHandle(`${portName}_log.txt`, { create: true });

                // 取得目前檔案大小，直接進行追加寫入，不需整包讀出
                const file = await fileHandle.getFile();
                const size = file.size;
                const writable = await fileHandle.createWritable({ keepExistingData: true });
                await writable.write({ type: 'write', position: size, data: dataToFlush });
                await writable.close();
            } catch (error) {
                console.error(`File flush error on ${portName}:`, error);
                // 復原緩衝區以利下次寫入
                const rest = this.buffers.get(portName) || "";
                this.buffers.set(portName, dataToFlush + rest);
            } finally {
                this.isWriting.set(portName, false);
            }
        }
    }

    clearHandles() {
        this.buffers.clear();
        this.isWriting.clear();
    }

    destroy() {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
        }
        this.flushAll();
    }
}
