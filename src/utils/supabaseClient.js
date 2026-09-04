import { createClient } from '@supabase/supabase-js';
import { getAdminAuthOptions, isAdminAccount } from './authClientConfig';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  '';

let supabaseInstance = null;
let supabaseAdminInstance = null;

// 防禦性檢查，確保只有在 URL 與 Key 有效時才初始化，避免在 file:// 協議下雙擊 index.html 造成 React crash 一片空白
if (supabaseUrl && supabasePublishableKey && supabaseUrl.startsWith('http')) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabasePublishableKey);
    if (typeof window !== 'undefined') {
      supabaseAdminInstance = createClient(
        supabaseUrl,
        supabasePublishableKey,
        getAdminAuthOptions(window.sessionStorage),
      );
    }
  } catch (e) {
    console.error('Supabase 初始化失敗：', e);
  }
}

export const supabase = supabaseInstance;
export const supabaseAdmin = supabaseAdminInstance;

async function signInWithAccount(client, account, password) {
  if (!client) {
    return { error: new Error('Supabase 尚未設定。'), status: 0 };
  }

  const { data, error } = await client.functions.invoke('portal-login', {
    body: { account: account.trim(), password },
  });

  if (error) {
    return { error, status: error.context?.status ?? 0 };
  }

  const accessToken = data?.session?.access_token;
  const refreshToken = data?.session?.refresh_token;

  if (!accessToken || !refreshToken) {
    return { error: new Error('登入服務沒有回傳有效 Session。'), status: 503 };
  }

  const { error: sessionError } = await client.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return { error: sessionError, status: sessionError ? 503 : 200 };
}

export function signInWithPortalAccount(account, password) {
  return signInWithAccount(supabase, account, password);
}

export async function signInWithAdminAccount(account, password) {
  if (!supabaseAdmin) {
    return { error: new Error('Supabase 尚未設定。'), status: 0 };
  }

  const email = account.trim().toLowerCase();
  if (!isAdminAccount(email) || !password) {
    return { error: new Error('管理員登入失敗。'), status: 401 };
  }

  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      error,
      status: error.status === 400 ? 401 : error.status ?? 0,
    };
  }

  if (!data.session) {
    return {
      error: new Error('登入服務沒有建立有效 Session。'),
      status: 503,
    };
  }

  if (data.user?.app_metadata?.role !== 'admin') {
    const { error: signOutError } = await supabaseAdmin.auth.signOut({
      scope: 'local',
    });
    if (signOutError) {
      return { error: signOutError, status: 503 };
    }
    return {
      error: new Error('管理員權限尚未設定。'),
      status: 403,
    };
  }

  return { error: null, status: 200 };
}
