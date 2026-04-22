// Runs before the Angular production build on Vercel.
// Reads SUPABASE_URL and SUPABASE_KEY from Vercel environment variables
// and writes them into environment.prod.ts so they are baked into the bundle.
const fs   = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL || 'https://bxkvdoeehplrxlmdaffh.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'sb_publishable_VHdURlupRqpEcQl6rdVkSQ_10BFT3iP';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.warn('[set-env] WARNING: SUPABASE_URL / SUPABASE_KEY not found in env — using fallback values.');
}

const content = `export const environment = {
  production: true,
  apiUrl: '/api',
  sessionTimeoutMinutes: 15,
  sessionWarningMinutes: 13,
  appVersion: '1.0.0',
  supabaseUrl: '${supabaseUrl}',
  supabaseKey: '${supabaseKey}',
};
`;

const target = path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts');
fs.writeFileSync(target, content, 'utf8');
console.log('[set-env] environment.prod.ts written with supabaseUrl:', supabaseUrl);
