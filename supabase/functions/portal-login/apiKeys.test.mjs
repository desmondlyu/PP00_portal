import test from "node:test";
import assert from "node:assert/strict";
import { resolveSupabaseApiKey } from "./apiKeys.js";

test("resolves the default publishable or secret key from Supabase JSON secrets", () => {
  assert.equal(
    resolveSupabaseApiKey(
      '{"default":"sb_publishable_default","backup":"sb_publishable_backup"}',
      "",
      "",
    ),
    "sb_publishable_default",
  );

  assert.equal(
    resolveSupabaseApiKey(
      '{"default":"sb_secret_default"}',
      "",
      "",
    ),
    "sb_secret_default",
  );
});
