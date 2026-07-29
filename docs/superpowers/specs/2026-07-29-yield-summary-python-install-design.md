# Yield Summary Python 安裝流程設計

## 目的

修正沒有 Python 的 Windows 使用者執行 `tool\Yield_Summary\proxy.bat` 時，
winget 未指定來源而誤選 Microsoft Store，導致 Python 安裝失敗。

## 範圍

- 修改 `tool\Yield_Summary\proxy.bat`。
- 不修改 `proxy.py`、前端或新增依賴。

## 流程

1. 先檢查既有 `py -3` 或 `python`。
2. 若找不到 Python，使用 winget 的 `winget` 來源安裝 `Python.Python.3.14`。
3. 若 winget 不存在或安裝失敗，改用既有的 python.org 下載與靜默安裝流程。
4. 安裝後重新檢查 `py -3`、`python` 及使用者 Python 安裝路徑。
5. 找到可用執行檔後啟動 `proxy.py`；仍找不到則顯示錯誤並停止。

## 錯誤處理

- winget 來源錯誤、套件不存在或安裝回傳非零時，均進入 python.org fallback。
- python.org 下載、安裝或架構不支援時，顯示現有錯誤訊息並停止。
- 不將安裝失敗誤判為 proxy 已啟動。

## 驗證

- 檢查批次檔語法與控制流程。
- 確認安裝命令包含 `--source winget`。
- 確認 winget 失敗路徑會進入 `:download_python`。
