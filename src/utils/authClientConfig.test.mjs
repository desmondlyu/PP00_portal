import test from "node:test";
import assert from "node:assert/strict";
import {
  ADMIN_ACCOUNT_EMAIL,
  ADMIN_AUTH_STORAGE_KEY,
  getAdminAuthOptions,
  isAdminAccount,
} from "./authClientConfig.js";

test("admin auth uses a storage key separate from the Portal session", () => {
  const options = getAdminAuthOptions("admin-session-storage");

  assert.equal(options.auth.storage, "admin-session-storage");
  assert.equal(options.auth.storageKey, ADMIN_AUTH_STORAGE_KEY);
  assert.notEqual(options.auth.storageKey, "supabase.auth.token");
});

test("admin auth accepts only the configured administrator email", () => {
  assert.equal(ADMIN_ACCOUNT_EMAIL, "dannyowan@gmail.com");
  assert.equal(isAdminAccount(" DANNYOWAN@GMAIL.COM "), true);
  assert.equal(isAdminAccount("pp32@portal-internal.invalid"), false);
  assert.equal(isAdminAccount("pp32"), false);
});
