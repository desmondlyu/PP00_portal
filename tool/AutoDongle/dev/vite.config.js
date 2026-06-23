import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // 使用相對路徑，防止 GitHub Pages 子目錄 404
  build: {
    outDir: '../', // 建置輸出直接寫入到 tool/AutoDongle/ 根目錄下
    emptyOutDir: false, // 確保建置時不會刪除父目錄下的 Python 程式與原始碼資料夾
  }
})
