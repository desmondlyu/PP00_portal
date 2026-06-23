import { createClient } from '@supabase/supabase-js';

// 使用 Vite 環境變數載入 Supabase 連線資訊
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase URL 或 Anon Key 未設定。請在專案根目錄建立 .env.local 檔案並設定 VITE_SUPABASE_URL 與 VITE_SUPABASE_ANON_KEY'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
