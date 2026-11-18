(function() {
  // WEC Token 存放於 Supabase，只有 PP00 Portal 白名單帳號登入後才能讀取
  const SUPABASE_URL = "https://fvfekakjjzhocpprcbgi.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ldz5T4XwRxZOk6dyo4iOUA_P3jTgjzr";
  const STORAGE_KEY = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`;
  let tokensPromise = null;

  function readPortalSession() {
    try {
      return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
    } catch {
      return null;
    }
  }

  async function loadTokens() {
    const session = readPortalSession();
    if (!session || !session.access_token) {
      throw new Error('請先登入 PP00 Portal');
    }
    if (session.expires_at && session.expires_at * 1000 <= Date.now()) {
      throw new Error('Portal 登入已過期，請重新登入');
    }

    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_yield_summary_tokens`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_PUBLISHABLE_KEY,
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: '{}'
    });
    if (resp.status === 401) throw new Error('Portal 登入已過期，請重新登入');
    if (resp.status === 403) throw new Error('此帳號沒有 WEC 權限');
    if (!resp.ok) throw new Error(`Token 服務錯誤 ${resp.status}`);
    return resp.json();
  }

  // kind: 'cp' 或 'ft'；Token 只保留在記憶體，失敗時清除快取以便下次重試
  window.getWecToken = async function(kind) {
    if (!tokensPromise) {
      tokensPromise = loadTokens().catch(err => {
        tokensPromise = null;
        throw err;
      });
    }
    const tokens = await tokensPromise;
    const token = tokens && tokens[`wec_token_${kind}`];
    if (!token) throw new Error(`Supabase 尚未設定 ${kind.toUpperCase()} Token`);
    return token;
  };
})();
