# 離線 Programmer switch case 模擬設計

## 目標

離線模式以 `LP_ICIDCheck.c` 的 `mh_spi_menu` 與各層
`switch`／`case` 為行為來源。使用者不連接實際 IC 時，仍可依照原本
Programmer 選單逐層操作，完成選單輸入與 `printf` 流程。

## 行為規則

1. 保留主選單與巢狀選單的按鍵選擇，不能把不同 `case` 線性串在一起。
2. 忽略只用於確認硬體狀態的前置判斷，例如：
   - `if ((spisize == 0) && (endAddr == 0))`
   - `mh_MID`、`mh_DID`、`mh_SR2`、`mh_SR` 等 IC／Writer 讀值判斷。
3. 被忽略的硬體判斷不得阻擋流程；離線流程採「繼續執行正常選單路徑」。
4. 不執行硬體命令、SPI 讀寫、FPGA 操作、輪詢、實際計時或 IC 結果計算。
5. 終端機只顯示 C `printf` 內容：
   - 保留 `\n` 換行。
   - 移除 `\r`。
   - 移除 `%d`、`%x`、`%02x`、`%s` 等格式佔位符及變數值。
6. `mh_get_dec`、`mh_get_hex`、`mh_are_you_sure`、`mh_select_1_item`
   與 `mh_any_key` 仍保留輸入語意。
7. 每個 `case` 遇到 `mh_any_key()` 後，返回 `mh_spi_menu`。
8. `goto mh_spi_menu` 返回主選單；`goto mh_exit` 結束離線模式。
9. 不產生「硬體測試成功」或虛構 IC 結果；只有 C 原始 `printf` 會輸出。

## 狀態模型

離線流程由節點組成：

- `output`：輸出一段或多段 C `printf`。
- `select`：等待單一按鍵，依 C 的 `switch` 進入子節點。
- `dec`／`hex`／`confirm`：等待對應輸入，再進入下一節點。
- `pause`：模擬 `mh_any_key()`，任意按鍵後返回該 case 的返回目標。
- `return-menu`：等同 `goto mh_spi_menu`。
- `exit`：等同 `goto mh_exit`。

硬體條件不建模成會失敗的輸入節點；若條件只依賴 IC／Writer 狀態，
離線編譯流程時直接略過該條件，保留其後可見的選單與輸入節點。

## 實作範圍

- 修改 `tool\web_terminal\index.html` 的離線流程資料與狀態機。
- 以 `LP_ICIDCheck.c` 重新整理受影響的主選單與巢狀 `switch` case。
- 保留既有 Web Serial 即時模式、離線啟動／退出按鈕與終端機輸出格式。
- 不修改 `function_tree.md` 作為行為來源。

## 驗證

至少驗證：

1. `a Scan Vcc` 可進入第一層及其子選單，並可依輸入分支。
2. `2 Change Vcc` 的子選單不因缺少 `spisize`／`endAddr` 而中止。
3. 含 `mh_SR2 != 0x02` 或 `mh_MID` 判斷的 case 可繼續至後續 `printf`。
4. 每個測試 case 的 `mh_any_key()` 後回到主選單。
5. `goto mh_spi_menu` 與 `goto mh_exit` 的返回行為正確。
6. 十進位、十六進位、確認與單鍵選擇輸入仍可使用。
7. JavaScript module syntax check 通過，且瀏覽器 smoke test 不連接 Writer。
