import { createClient } from "npm:@supabase/supabase-js@2";
import { resolveSupabaseApiKey } from "./apiKeys.js";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabasePublishableKey = resolveSupabaseApiKey(
  Deno.env.get("SUPABASE_PUBLISHABLE_KEYS"),
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY"),
  Deno.env.get("SUPABASE_ANON_KEY"),
);
const supabaseSecretKey = resolveSupabaseApiKey(
  Deno.env.get("SUPABASE_SECRET_KEYS"),
  Deno.env.get("SUPABASE_SECRET_KEY"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
);

const allowedOrigins = new Set(
  (Deno.env.get("PORTAL_ALLOWED_ORIGINS") ??
    "http://localhost:3100,http://127.0.0.1:3100,https://desmondlyu.github.io")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

const adminClient = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const authClient = createClient(supabaseUrl, supabasePublishableKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const invalidCredentialsMessage = "帳號或密碼錯誤，請確認後再試。";

function createResponse(
  body: Record<string, unknown>,
  status: number,
  origin: string,
) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });

  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }

  return new Response(JSON.stringify(body), { status, headers });
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin") ?? "";

  if (origin && !allowedOrigins.has(origin)) {
    return createResponse({ error: "不允許的來源。" }, 403, "");
  }

  if (request.method === "OPTIONS") {
    const headers = new Headers({
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    });
    if (origin) {
      headers.set("Access-Control-Allow-Origin", origin);
      headers.set("Vary", "Origin");
    }
    return new Response("ok", { headers });
  }

  if (request.method !== "POST") {
    return createResponse({ error: "只接受 POST。" }, 405, origin);
  }

  let body: { account?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return createResponse({ error: invalidCredentialsMessage }, 401, origin);
  }

  const account =
    typeof body.account === "string" ? body.account.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (
    !/^[a-z0-9]{2,32}$/.test(account) ||
    password.length === 0 ||
    password.length > 1024
  ) {
    return createResponse({ error: invalidCredentialsMessage }, 401, origin);
  }

  const { data: mapping, error: mappingError } = await adminClient
    .from("portal_accounts")
    .select("auth_user_id")
    .eq("account_code", account)
    .eq("is_active", true)
    .maybeSingle();

  if (mappingError) {
    console.error("讀取 Portal 帳號對應失敗：", mappingError.message);
    return createResponse({ error: "登入服務暫時無法使用。" }, 503, origin);
  }

  if (!mapping) {
    return createResponse({ error: invalidCredentialsMessage }, 401, origin);
  }

  const { data: authUserData, error: authUserError } =
    await adminClient.auth.admin.getUserById(mapping.auth_user_id);
  const internalEmail = authUserData.user?.email;

  if (authUserError || !internalEmail) {
    console.error(
      "讀取 Portal Auth 使用者失敗：",
      authUserError?.message ?? "missing email",
    );
    return createResponse({ error: "登入服務暫時無法使用。" }, 503, origin);
  }

  // ponytail: rely on Supabase Auth rate limits; add per-account/IP throttling if abuse appears.
  const { data: sessionData, error: authError } =
    await authClient.auth.signInWithPassword({
      email: internalEmail,
      password,
    });

  if (authError || !sessionData.session) {
    return createResponse({ error: invalidCredentialsMessage }, 401, origin);
  }

  return createResponse({ session: sessionData.session }, 200, origin);
});
