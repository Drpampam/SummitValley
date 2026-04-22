// Runs before the Angular production build on Vercel.
// Reads SUPABASE_URL and SUPABASE_KEY from Vercel environment variables
// and writes them into environment.prod.ts so they are baked into the bundle.
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[set-env] ERROR: SUPABASE_URL and SUPABASE_KEY must be set as environment variables.');
  process.exit(1);
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
console.log('[set-env] environment.prod.ts written successfully.');
