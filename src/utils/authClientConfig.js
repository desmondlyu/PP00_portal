export const ADMIN_AUTH_STORAGE_KEY = 'pp00-admin-auth';
export const ADMIN_ACCOUNT_EMAIL = 'dannyowan@gmail.com';

export function isAdminAccount(account) {
  return typeof account === 'string' &&
    account.trim().toLowerCase() === ADMIN_ACCOUNT_EMAIL;
}

export function getAdminAuthOptions(storage) {
  return {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
      storage,
      storageKey: ADMIN_AUTH_STORAGE_KEY,
    },
  };
}
