import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabaseInstance = null;

// 防禦性檢查，確保只有在 URL 與 Key 有效時才初始化，避免在 file:// 協議下雙擊 index.html 造成 React crash 一片空白
if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  } catch (e) {
    console.error('Supabase 初始化失敗：', e);
  }
}

export const supabase = supabaseInstance;

