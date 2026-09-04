// supabase/functions/portal-login/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";

// supabase/functions/portal-login/apiKeys.js
function resolveSupabaseApiKey(jsonKeys, singularKey = "", legacyKey = "") {
  const serializedKeys = typeof jsonKeys === "string" ? jsonKeys.trim() : "";
  if (serializedKeys) {
    try {
      const parsedKeys = JSON.parse(serializedKeys);
      if (parsedKeys && typeof parsedKeys === "object" && !Array.isArray(parsedKeys)) {
        const candidates = [
          parsedKeys.default,
          ...Object.values(parsedKeys)
        ];
        const resolvedKey = candidates.find(
          (value) => typeof value === "string" && value.trim()
        );
        if (resolvedKey) {
          return resolvedKey.trim();
        }
      }
    } catch (error) {
      console.error("Supabase API key JSON \u8A2D\u5B9A\u7121\u6CD5\u89E3\u6790\uFF1A", error);
    }
  }
  return [singularKey, legacyKey].find(
    (value) => typeof value === "string" && value.trim()
  )?.trim() ?? "";
}

// supabase/functions/portal-login/index.ts
var supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
var supabasePublishableKey = resolveSupabaseApiKey(
  Deno.env.get("SUPABASE_PUBLISHABLE_KEYS"),
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY"),
  Deno.env.get("SUPABASE_ANON_KEY")
);
var supabaseSecretKey = resolveSupabaseApiKey(
  Deno.env.get("SUPABASE_SECRET_KEYS"),
  Deno.env.get("SUPABASE_SECRET_KEY"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
);
var allowedOrigins = new Set(
  (Deno.env.get("PORTAL_ALLOWED_ORIGINS") ?? "http://localhost:3100,http://127.0.0.1:3100,https://desmondlyu.github.io").split(",").map((origin) => origin.trim()).filter(Boolean)
);
var adminClient = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
var authClient = createClient(supabaseUrl, supabasePublishableKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
var invalidCredentialsMessage = "\u5E33\u865F\u6216\u5BC6\u78BC\u932F\u8AA4\uFF0C\u8ACB\u78BA\u8A8D\u5F8C\u518D\u8A66\u3002";
function createResponse(body, status, origin) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
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
    return createResponse({ error: "\u4E0D\u5141\u8A31\u7684\u4F86\u6E90\u3002" }, 403, "");
  }
  if (request.method === "OPTIONS") {
    const headers = new Headers({
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    });
    if (origin) {
      headers.set("Access-Control-Allow-Origin", origin);
      headers.set("Vary", "Origin");
    }
    return new Response("ok", { headers });
  }
  if (request.method !== "POST") {
    return createResponse({ error: "\u53EA\u63A5\u53D7 POST\u3002" }, 405, origin);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return createResponse({ error: invalidCredentialsMessage }, 401, origin);
  }
  const account = typeof body.account === "string" ? body.account.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!/^[a-z0-9]{2,32}$/.test(account) || password.length === 0 || password.length > 1024) {
    return createResponse({ error: invalidCredentialsMessage }, 401, origin);
  }
  const { data: mapping, error: mappingError } = await adminClient.from("portal_accounts").select("auth_user_id").eq("account_code", account).eq("is_active", true).maybeSingle();
  if (mappingError) {
    console.error("\u8B80\u53D6 Portal \u5E33\u865F\u5C0D\u61C9\u5931\u6557\uFF1A", mappingError.message);
    return createResponse({ error: "\u767B\u5165\u670D\u52D9\u66AB\u6642\u7121\u6CD5\u4F7F\u7528\u3002" }, 503, origin);
  }
  if (!mapping) {
    return createResponse({ error: invalidCredentialsMessage }, 401, origin);
  }
  const { data: authUserData, error: authUserError } = await adminClient.auth.admin.getUserById(mapping.auth_user_id);
  const internalEmail = authUserData.user?.email;
  if (authUserError || !internalEmail) {
    console.error(
      "\u8B80\u53D6 Portal Auth \u4F7F\u7528\u8005\u5931\u6557\uFF1A",
      authUserError?.message ?? "missing email"
    );
    return createResponse({ error: "\u767B\u5165\u670D\u52D9\u66AB\u6642\u7121\u6CD5\u4F7F\u7528\u3002" }, 503, origin);
  }
  const { data: sessionData, error: authError } = await authClient.auth.signInWithPassword({
    email: internalEmail,
    password
  });
  if (authError || !sessionData.session) {
    return createResponse({ error: invalidCredentialsMessage }, 401, origin);
  }
  return createResponse({ session: sessionData.session }, 200, origin);
});
