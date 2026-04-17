const FROM_EMAIL = process.env.FROM_EMAIL || 'hello@summitvalleybank.com';
const FROM_NAME  = process.env.FROM_NAME  || 'Summit Valley Bank';

// In production the Angular app calls /api/email/send on the same Vercel domain
// (same-origin — no CORS headers needed). The headers below only matter for
// local development via `vercel dev` or direct curl testing.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:4200,http://localhost:3000').split(',');

module.exports = async (req, res) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { type, to, name, data } = req.body || {};
  if (!type || !to) return res.status(400).json({ error: 'type and to are required' });

  const template = buildTemplate(type, name || 'Valued Customer', data || {});
  if (!template) return res.status(400).json({ error: `Unknown email type: ${type}` });

  const token   = process.env.MAILTRAP_API_TOKEN;
  const inboxId = process.env.MAILTRAP_INBOX_ID;

  if (!token || !inboxId) {
    console.warn('[Email] MAILTRAP_API_TOKEN or MAILTRAP_INBOX_ID not set — skipping send');
    return res.json({ success: true, skipped: true });
  }

  try {
    const response = await fetch(`https://sandbox.api.mailtrap.io/api/send/${inboxId}`, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    { email: FROM_EMAIL, name: FROM_NAME },
        to:      [{ email: to }],
        subject: template.subject,
        html:    template.html,
      }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.errors?.join(', ') || response.statusText);

    console.log(`[Email] ${type} → ${to} | id: ${result.message_ids?.[0]}`);
    return res.json({ success: true, id: result.message_ids?.[0] });
  } catch (err) {
    console.error(`[Email] Failed: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// Template dispatcher
// ════════════════════════════════════════════════════════════════════════════
function buildTemplate(type, name, data) {
  switch (type) {
    case 'login':            return loginTemplate(name, data);
    case 'transfer':         return transferTemplate(name, data);
    case 'transfer_blocked': return transferBlockedTemplate(name, data);
    case 'deposit':          return depositTemplate(name, data);
    case 'bill_payment':     return billPaymentTemplate(name, data);
    case 'welcome':          return welcomeTemplate(name, data);
    default: return null;
  }
}

// ── Shared base layout ────────────────────────────────────────────────────────
function base(preheader, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;color:#f4f4f4;font-size:1px;">${preheader}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#660000 0%,#880000 50%,#CC0000 100%);padding:26px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="vertical-align:middle;">
                <table cellpadding="0" cellspacing="0"><tr>
                  <td style="width:44px;height:44px;background:rgba(0,0,0,0.2);border-radius:10px;border:1px solid rgba(255,205,65,0.35);text-align:center;vertical-align:middle;font-size:22px;">🏦</td>
                  <td style="padding-left:12px;">
                    <p style="margin:0;font-size:18px;font-weight:800;color:#ffffff;">Summit Valley Bank</p>
                    <p style="margin:3px 0 0;font-size:11px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.5px;">Secure Notification</p>
                  </td>
                </tr></table>
              </td>
              <td align="right" style="vertical-align:middle;">
                <span style="display:inline-block;background:rgba(255,205,65,0.18);border:1px solid rgba(255,205,65,0.4);border-radius:20px;padding:4px 12px;font-size:11px;font-weight:700;color:#FFCD41;">OFFICIAL NOTICE</span>
              </td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;padding:32px;">
            ${bodyHtml}
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;border-top:1px solid #eeeeee;padding-top:24px;">
              <tr><td style="text-align:center;font-size:11px;color:#aaaaaa;line-height:1.7;">
                <p style="margin:0 0 4px;">This is an automated notification — please do not reply.</p>
                <p style="margin:0 0 4px;">If you did not perform this action, <strong style="color:#CC0000;">contact us immediately</strong>.</p>
                <p style="margin:0;">© ${new Date().getFullYear()} Summit Valley Bank. All rights reserved.</p>
              </td></tr>
            </table>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function greeting(name) {
  return `<p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#111111;">Hello, ${name} 👋</p>`;
}

function infoRow(label, value, highlight) {
  return `<tr>
    <td style="padding:10px 14px;font-size:13px;color:#666666;font-weight:500;border-bottom:1px solid #f0f0f0;white-space:nowrap;">${label}</td>
    <td style="padding:10px 14px;font-size:13px;${highlight ? 'font-weight:800;color:#880000;font-size:16px;' : 'font-weight:600;color:#111111;'}border-bottom:1px solid #f0f0f0;text-align:right;">${value}</td>
  </tr>`;
}

function detailTable(rows) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #eeeeee;border-radius:10px;overflow:hidden;margin:20px 0;"><tbody>${rows}</tbody></table>`;
}

function badge(text, bg, color) {
  return `<span style="display:inline-block;background:${bg};color:${color};font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;">${text}</span>`;
}

function alertBox(icon, text, bg, border) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:${bg || '#fff8f8'};border:1px solid ${border || '#FFCCCC'};border-radius:10px;margin:20px 0;">
    <tr>
      <td style="padding:14px 16px;font-size:22px;vertical-align:top;width:36px;">${icon}</td>
      <td style="padding:14px 16px 14px 0;font-size:13px;color:#444444;line-height:1.6;vertical-align:top;">${text}</td>
    </tr>
  </table>`;
}

// ── Login Alert ───────────────────────────────────────────────────────────────
function loginTemplate(name, { time, device } = {}) {
  const fmtTime = time ? new Date(time).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' }) : 'Just now';
  const body = `
    ${greeting(name)}
    <p style="margin:0 0 20px;font-size:14px;color:#555555;line-height:1.6;">A new sign-in to your Summit Valley Bank account was detected. If this was you, no action is needed.</p>
    ${detailTable(infoRow('Date & Time', fmtTime) + infoRow('Device', device || 'Unknown device'))}
    ${alertBox('🔒', '<strong>Wasn\'t you?</strong> If you did not sign in, please change your password and contact support immediately.')}
  `;
  return { subject: 'New sign-in to your Summit Valley Bank account', html: base('New sign-in detected on your account', body) };
}

// ── Transfer Confirmation ─────────────────────────────────────────────────────
function transferTemplate(name, { amount, recipient, fromAccount, reference, isInternal, date } = {}) {
  const fmtDate = date ? new Date(date).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' }) : 'Today';
  const body = `
    ${greeting(name)}
    <p style="margin:0 0 20px;font-size:14px;color:#555555;line-height:1.6;">Your transfer has been processed successfully.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#660000,#CC0000);border-radius:12px;margin:0 0 20px;overflow:hidden;">
      <tr><td style="padding:22px 26px;">
        <p style="margin:0 0 4px;font-size:12px;color:rgba(255,255,255,0.65);text-transform:uppercase;letter-spacing:0.6px;font-weight:600;">Amount Transferred</p>
        <p style="margin:0;font-size:32px;font-weight:800;color:#ffffff;">${amount}</p>
        <p style="margin:6px 0 0;">${badge('COMPLETED', 'rgba(255,255,255,0.15)', '#ffffff')}</p>
      </td></tr>
    </table>
    ${detailTable(
      (recipient    ? infoRow('To',            recipient)   : '') +
      (fromAccount  ? infoRow('From Account',  fromAccount) : '') +
      infoRow('Type',       isInternal ? 'Internal Transfer' : 'External Transfer') +
      infoRow('Reference',  reference || '—') +
      infoRow('Date',       fmtDate)
    )}
  `;
  return { subject: `Transfer of ${amount} processed — Summit Valley Bank`, html: base(`Your transfer of ${amount} has been completed`, body) };
}

// ── Transfer Blocked ──────────────────────────────────────────────────────────
function transferBlockedTemplate(name, { amount, reason, date } = {}) {
  const fmtDate = date ? new Date(date).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' }) : 'Today';
  const body = `
    ${greeting(name)}
    <p style="margin:0 0 20px;font-size:14px;color:#555555;line-height:1.6;">We were unable to process your recent transfer.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8f8;border:2px solid #FFCCCC;border-radius:12px;margin:0 0 20px;">
      <tr><td style="padding:20px 24px;">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="font-size:28px;padding-right:12px;">🚫</td>
          <td>
            <p style="margin:0 0 2px;font-size:16px;font-weight:800;color:#CC0000;">Transfer Declined</p>
            <p style="margin:0;font-size:13px;color:#888888;">Amount: <strong style="color:#111111;">${amount}</strong></p>
          </td>
        </tr></table>
      </td></tr>
    </table>
    ${detailTable(
      infoRow('Amount', amount, true) +
      infoRow('Status', '<span style="color:#CC0000;font-weight:700;">Declined</span>') +
      infoRow('Date',   fmtDate)
    )}
    ${reason ? alertBox('ℹ️', `<strong>Reason:</strong> ${reason}`, '#fffbeb', '#FEF08A') : ''}
  `;
  return { subject: `Transfer of ${amount} was declined — Summit Valley Bank`, html: base(`Your transfer of ${amount} was declined`, body) };
}

// ── Deposit Notification ──────────────────────────────────────────────────────
function depositTemplate(name, { amount, account, note, depositedBy, date } = {}) {
  const fmtDate = date ? new Date(date).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' }) : 'Today';
  const body = `
    ${greeting(name)}
    <p style="margin:0 0 20px;font-size:14px;color:#555555;line-height:1.6;">Great news! Funds have been deposited into your account.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#14532d,#16a34a);border-radius:12px;margin:0 0 20px;overflow:hidden;">
      <tr><td style="padding:22px 26px;">
        <p style="margin:0 0 4px;font-size:12px;color:rgba(255,255,255,0.65);text-transform:uppercase;letter-spacing:0.6px;font-weight:600;">Amount Deposited</p>
        <p style="margin:0;font-size:32px;font-weight:800;color:#ffffff;">+${amount}</p>
        <p style="margin:6px 0 0;">${badge('COMPLETED', 'rgba(255,255,255,0.15)', '#ffffff')}</p>
      </td></tr>
    </table>
    ${detailTable(
      infoRow('Deposited Into', account      || '—') +
      infoRow('Deposited By',   depositedBy  || 'Summit Valley Bank') +
      (note ? infoRow('Note', note) : '') +
      infoRow('Date',           fmtDate)
    )}
    ${alertBox('✅', 'Your account balance has been updated. You can view it in your dashboard.', '#f0fdf4', '#bbf7d0')}
  `;
  return { subject: `${amount} deposited into your account — Summit Valley Bank`, html: base(`${amount} has been deposited into your account`, body) };
}

// ── Welcome / Account Created ─────────────────────────────────────────────────
function welcomeTemplate(name, { tempPassword } = {}) {
  const body = `
    ${greeting(name)}
    <p style="margin:0 0 20px;font-size:14px;color:#555555;line-height:1.6;">Your Summit Valley Bank account has been created. Use the temporary password below to sign in for the first time. You'll be prompted to choose a new password immediately after logging in.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#660000,#CC0000);border-radius:12px;margin:0 0 20px;overflow:hidden;">
      <tr><td style="padding:22px 26px;text-align:center;">
        <p style="margin:0 0 6px;font-size:12px;color:rgba(255,255,255,0.65);text-transform:uppercase;letter-spacing:0.6px;font-weight:600;">Your Temporary Password</p>
        <p style="margin:0;font-size:28px;font-weight:800;color:#FFCD41;font-family:monospace;letter-spacing:3px;">${tempPassword || '—'}</p>
        <p style="margin:8px 0 0;font-size:11px;color:rgba(255,255,255,0.55);">This password must be changed on first login</p>
      </td></tr>
    </table>
    ${alertBox('🔑', '<strong>Next steps:</strong> Visit the Summit Valley Bank login page, enter your email and this temporary password, then follow the prompts to set a permanent password of your choice.', '#fffbeb', '#FEF08A')}
    ${alertBox('🔒', 'If you did not request this account, please contact Summit Valley Bank support immediately.', '#fff8f8', '#FFCCCC')}
  `;
  return { subject: 'Welcome to Summit Valley Bank — your account is ready', html: base('Your new account is ready. Sign in with your temporary password.', body) };
}

// ── Bill Payment Confirmation ─────────────────────────────────────────────────
function billPaymentTemplate(name, { biller, amount, confirmation, scheduledDate, fromAccount } = {}) {
  const fmtDate = scheduledDate ? new Date(scheduledDate).toLocaleString('en-US', { dateStyle: 'long' }) : 'Today';
  const body = `
    ${greeting(name)}
    <p style="margin:0 0 20px;font-size:14px;color:#555555;line-height:1.6;">Your bill payment has been scheduled. Keep this confirmation for your records.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #eeeeee;border-radius:12px;margin:0 0 20px;">
      <tr><td style="padding:18px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="vertical-align:middle;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="width:42px;height:42px;background:#fff1f1;border-radius:8px;border:1px solid #FFCCCC;text-align:center;vertical-align:middle;font-size:20px;">🧾</td>
              <td style="padding-left:14px;">
                <p style="margin:0 0 2px;font-size:15px;font-weight:700;color:#111111;">${biller}</p>
                <p style="margin:0;font-size:13px;font-weight:700;color:#880000;">${amount}</p>
              </td>
            </tr></table>
          </td>
          <td align="right">${badge('SCHEDULED', '#fff7ed', '#c2410c')}</td>
        </tr></table>
      </td></tr>
    </table>
    ${detailTable(
      infoRow('Payee',             biller) +
      infoRow('Amount',            amount, true) +
      (fromAccount ? infoRow('From Account', fromAccount) : '') +
      infoRow('Payment Date',      fmtDate) +
      infoRow('Confirmation',      `<code style="font-family:monospace;font-size:12px;">${confirmation || '—'}</code>`)
    )}
  `;
  return { subject: `Bill payment of ${amount} to ${biller} scheduled — Summit Valley Bank`, html: base(`Your payment to ${biller} is scheduled`, body) };
}
