// This file is overwritten at build time by scripts/set-env.js using
// SUPABASE_URL and SUPABASE_KEY from Vercel environment variables.
export const environment = {
  production: true,
  apiUrl: '/api',
  sessionTimeoutMinutes: 15,
  sessionWarningMinutes: 13,
  appVersion: '1.0.0',
  supabaseUrl: '',
  supabaseKey: '',
};
