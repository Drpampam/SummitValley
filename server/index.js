require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const { Resend } = require('resend');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: ['http://localhost:4200', 'http://localhost:4201'] }));
app.use(express.json());

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'Summit Valley Bank Email Server' }));

// ── Send email ───────────────────────────────────────────────────────────────
app.post('/api/email/send', async (req, res) => {
  const { type, to, name, data } = req.body;
  if (!type || !to) return res.status(400).json({ error: 'type and to are required' });

  const template = buildTemplate(type, name || 'Valued Customer', data || {});
  if (!template) return res.status(400).json({ error: `Unknown email type: ${type}` });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[Email] RESEND_API_KEY not set — skipping send');
    return res.json({ success: true, skipped: true });
  }

  try {
    const resend = new Resend(apiKey);
    const from   = `${process.env.FROM_NAME || 'Summit Valley Bank'} <${process.env.FROM_EMAIL || 'notifications@summitvalleybank.com'}>`;
    const result = await resend.emails.send({
      from,
      to:      [to],
      subject: template.subject,
      html:    template.html,
    });
    console.log(`[Email] ${type} → ${to} | id: ${result.data?.id}`);
    res.json({ success: true, id: result.data?.id });
  } catch (err) {
    console.error(`[Email] Failed to send ${type} to ${to}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🏦 Summit Valley Bank Email Server`);
  console.log(`   Running on http://localhost:${PORT}`);
  console.log(`   Resend key: ${process.env.RESEND_API_KEY ? '✓ configured' : '✗ not set'}`);
  console.log(`   Sending from: ${process.env.FROM_EMAIL || 'notifications@summitvalleybank.com'}\n`);
});

// ════════════════════════════════════════════════════════════════════════════
// Email Templates
// ════════════════════════════════════════════════════════════════════════════

function buildTemplate(type, name, data) {
  switch (type) {
    case 'login':            return loginTemplate(name, data);
    case 'transfer':         return transferTemplate(name, data);
    case 'transfer_blocked': return transferBlockedTemplate(name, data);
    case 'deposit':          return depositTemplate(name, data);
    case 'bill_payment':     return billPaymentTemplate(name, data);
    case 'welcome':          return welcomeTemplate(name, data);
    case 'forgot_password':  return forgotPasswordTemplate(name, data);
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
  <title>Summit Valley Bank</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;color:#f4f4f4;font-size:1px;">${preheader}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- ── Header ── -->
        <tr>
          <td style="background:linear-gradient(135deg,#660000 0%,#880000 50%,#CC0000 100%);padding:26px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="vertical-align:middle;">
                <table cellpadding="0" cellspacing="0"><tr>
                  <td style="width:44px;height:44px;background:rgba(0,0,0,0.2);border-radius:10px;border:1px solid rgba(255,205,65,0.35);text-align:center;vertical-align:middle;font-size:22px;">🏦</td>
                  <td style="padding-left:12px;">
                    <p style="margin:0;font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">Summit Valley Bank</p>
                    <p style="margin:3px 0 0;font-size:11px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.5px;">Secure Notification</p>
                  </td>
                </tr></table>
              </td>
              <td align="right" style="vertical-align:middle;">
                <span style="display:inline-block;background:rgba(255,205,65,0.18);border:1px solid rgba(255,205,65,0.4);border-radius:20px;padding:4px 12px;font-size:11px;font-weight:700;color:#FFCD41;letter-spacing:0.3px;">OFFICIAL NOTICE</span>
              </td>
            </tr></table>
          </td>
        </tr>

        <!-- ── Body ── -->
        <tr>
          <td style="background:#ffffff;padding:32px;">
            ${bodyHtml}

            <!-- Footer -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;border-top:1px solid #eeeeee;padding-top:24px;">
              <tr><td style="text-align:center;font-size:11px;color:#aaaaaa;line-height:1.7;">
                <p style="margin:0 0 4px;">This is an automated notification — please do not reply to this email.</p>
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

// ── Shared UI helpers ──────────────────────────────────────────────────────────
function greeting(name) {
  return `<p style="margin:0 0 6px;font-size:22px;font-weight:800;color:#111111;">Hello, ${name} 👋</p>`;
}

function infoRow(label, value, highlight = false) {
  return `
  <tr>
    <td style="padding:10px 14px;font-size:13px;color:#666666;font-weight:500;border-bottom:1px solid #f0f0f0;white-space:nowrap;">${label}</td>
    <td style="padding:10px 14px;font-size:13px;${highlight ? 'font-weight:800;color:#880000;font-size:16px;' : 'font-weight:600;color:#111111;'}border-bottom:1px solid #f0f0f0;text-align:right;">${value}</td>
  </tr>`;
}

function detailTable(rows) {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #eeeeee;border-radius:10px;overflow:hidden;margin:20px 0;">
    <tbody>${rows}</tbody>
  </table>`;
}

function badge(text, bg, color) {
  return `<span style="display:inline-block;background:${bg};color:${color};font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;">${text}</span>`;
}

function ctaButton(text, href = '#') {
  return `
  <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr><td style="border-radius:8px;background:linear-gradient(135deg,#880000,#CC0000);">
      <a href="${href}" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.3px;">${text}</a>
    </td></tr>
  </table>`;
}

function alertBox(icon, text, bg = '#fff8f8', border = '#FFCCCC') {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${bg};border:1px solid ${border};border-radius:10px;margin:20px 0;">
    <tr>
      <td style="padding:14px 16px;font-size:22px;vertical-align:top;width:36px;">${icon}</td>
      <td style="padding:14px 16px 14px 0;font-size:13px;color:#444444;line-height:1.6;vertical-align:top;">${text}</td>
    </tr>
  </table>`;
}

// ════════════════════════════════════════════════════════════════════════════
// 1. Login Alert
// ════════════════════════════════════════════════════════════════════════════
function loginTemplate(name, { time, device, ip }) {
  const fmtTime = time ? new Date(time).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' }) : 'Just now';
  const body = `
    ${greeting(name)}
    <p style="margin:0 0 20px;font-size:14px;color:#555555;line-height:1.6;">
      We detected a new sign-in to your Summit Valley Bank account. If this was you, no action is needed.
    </p>

    ${detailTable(
      infoRow('Date & Time', fmtTime) +
      infoRow('Device',      device || 'Unknown device') +
      (ip ? infoRow('IP Address', ip) : '')
    )}

    ${alertBox('🔒',
      '<strong>Was this you?</strong> If you did not sign in, someone may have access to your account. Please change your password immediately and contact our support team.',
      '#fff8f8', '#FFCCCC'
    )}

    ${ctaButton('Review Account Activity')}
  `;
  return { subject: `New sign-in to your Summit Valley Bank account`, html: base('New sign-in detected on your account', body) };
}

// ════════════════════════════════════════════════════════════════════════════
// 2. Transfer Confirmation
// ════════════════════════════════════════════════════════════════════════════
function transferTemplate(name, { amount, recipient, fromAccount, reference, date, isInternal }) {
  const fmtDate = date ? new Date(date).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' }) : 'Today';
  const body = `
    ${greeting(name)}
    <p style="margin:0 0 20px;font-size:14px;color:#555555;line-height:1.6;">
      Your transfer has been processed successfully. Here are the details:
    </p>

    <!-- Amount highlight -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#660000,#CC0000);border-radius:12px;padding:0;margin:0 0 20px;overflow:hidden;">
      <tr><td style="padding:22px 26px;">
        <p style="margin:0 0 4px;font-size:12px;color:rgba(255,255,255,0.65);text-transform:uppercase;letter-spacing:0.6px;font-weight:600;">Amount Transferred</p>
        <p style="margin:0;font-size:32px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">${amount}</p>
        <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.65);">${badge('COMPLETED', 'rgba(255,255,255,0.15)', '#ffffff')}</p>
      </td></tr>
    </table>

    ${detailTable(
      (recipient ? infoRow('To', recipient)                          : '') +
      (fromAccount ? infoRow('From Account', fromAccount)           : '') +
      infoRow('Transfer Type', isInternal ? 'Internal Transfer' : 'External Transfer') +
      infoRow('Reference',  reference || '—') +
      infoRow('Date',       fmtDate)
    )}

    <p style="margin:0;font-size:13px;color:#888888;line-height:1.6;">
      Please allow up to <strong>1–3 business days</strong> for the funds to appear in the recipient's account for external transfers.
    </p>

    ${ctaButton('View Transaction History')}
  `;
  return { subject: `Transfer of ${amount} processed — Summit Valley Bank`, html: base(`Your transfer of ${amount} has been completed`, body) };
}

// ════════════════════════════════════════════════════════════════════════════
// 3. Transfer Blocked
// ════════════════════════════════════════════════════════════════════════════
function transferBlockedTemplate(name, { amount, reason, date }) {
  const fmtDate = date ? new Date(date).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' }) : 'Today';
  const body = `
    ${greeting(name)}
    <p style="margin:0 0 20px;font-size:14px;color:#555555;line-height:1.6;">
      We were unable to process your recent transfer. Please review the details below.
    </p>

    <!-- Declined box -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8f8;border:2px solid #FFCCCC;border-radius:12px;margin:0 0 20px;overflow:hidden;">
      <tr><td style="padding:20px 24px;">
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="font-size:28px;vertical-align:middle;padding-right:12px;">🚫</td>
          <td style="vertical-align:middle;">
            <p style="margin:0 0 2px;font-size:16px;font-weight:800;color:#CC0000;">Transfer Declined</p>
            <p style="margin:0;font-size:13px;color:#888888;">Amount: <strong style="color:#111111;">${amount}</strong></p>
          </td>
        </tr></table>
      </td></tr>
    </table>

    ${detailTable(
      infoRow('Attempted Amount', amount, true) +
      infoRow('Status', '<span style="color:#CC0000;font-weight:700;">Declined</span>') +
      infoRow('Date', fmtDate)
    )}

    ${reason ? alertBox('ℹ️', `<strong>Reason:</strong> ${reason}`, '#fffbeb', '#FEF08A') : ''}

    <p style="margin:20px 0 0;font-size:13px;color:#666666;line-height:1.6;">
      If you believe this is an error or have questions about your account restrictions, please contact your account manager or our support team.
    </p>

    ${ctaButton('Contact Support')}
  `;
  return { subject: `Transfer of ${amount} was declined — Summit Valley Bank`, html: base(`Your transfer of ${amount} was declined`, body) };
}

// ════════════════════════════════════════════════════════════════════════════
// 4. Deposit Notification
// ════════════════════════════════════════════════════════════════════════════
function depositTemplate(name, { amount, account, note, depositedBy, date }) {
  const fmtDate = date ? new Date(date).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' }) : 'Today';
  const body = `
    ${greeting(name)}
    <p style="margin:0 0 20px;font-size:14px;color:#555555;line-height:1.6;">
      Great news! Funds have been deposited into your account. Here are the details:
    </p>

    <!-- Amount highlight -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#14532d,#16a34a);border-radius:12px;margin:0 0 20px;overflow:hidden;">
      <tr><td style="padding:22px 26px;">
        <p style="margin:0 0 4px;font-size:12px;color:rgba(255,255,255,0.65);text-transform:uppercase;letter-spacing:0.6px;font-weight:600;">Amount Deposited</p>
        <p style="margin:0;font-size:32px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">+${amount}</p>
        <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.65);">${badge('COMPLETED', 'rgba(255,255,255,0.15)', '#ffffff')}</p>
      </td></tr>
    </table>

    ${detailTable(
      infoRow('Deposited Into',  account  || '—') +
      infoRow('Deposited By',    depositedBy || 'Summit Valley Bank') +
      (note ? infoRow('Note', note) : '') +
      infoRow('Date',            fmtDate)
    )}

    ${alertBox('✅',
      'Your account balance has been updated immediately. You can view the updated balance in your account dashboard.',
      '#f0fdf4', '#bbf7d0'
    )}

    ${ctaButton('View Account Balance')}
  `;
  return { subject: `${amount} deposited into your account — Summit Valley Bank`, html: base(`${amount} has been deposited into your account`, body) };
}

// ════════════════════════════════════════════════════════════════════════════
// 5. Bill Payment Confirmation
// ════════════════════════════════════════════════════════════════════════════
function billPaymentTemplate(name, { biller, amount, confirmation, scheduledDate, fromAccount }) {
  const fmtDate = scheduledDate ? new Date(scheduledDate).toLocaleString('en-US', { dateStyle: 'long' }) : 'Today';
  const body = `
    ${greeting(name)}
    <p style="margin:0 0 20px;font-size:14px;color:#555555;line-height:1.6;">
      Your bill payment has been scheduled successfully. Keep this confirmation for your records.
    </p>

    <!-- Biller card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #eeeeee;border-radius:12px;margin:0 0 20px;overflow:hidden;">
      <tr>
        <td style="padding:18px 20px;vertical-align:middle;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="width:42px;height:42px;background:#fff1f1;border-radius:8px;border:1px solid #FFCCCC;text-align:center;vertical-align:middle;font-size:20px;">🧾</td>
            <td style="padding-left:14px;">
              <p style="margin:0 0 2px;font-size:15px;font-weight:700;color:#111111;">${biller}</p>
              <p style="margin:0;font-size:13px;font-weight:700;color:#880000;">${amount}</p>
            </td>
            <td align="right" style="padding-right:4px;">${badge('SCHEDULED', '#fff7ed', '#c2410c')}</td>
          </tr></table>
        </td>
      </tr>
    </table>

    ${detailTable(
      infoRow('Payee',             biller) +
      infoRow('Amount',            amount,  true) +
      (fromAccount ? infoRow('From Account', fromAccount) : '') +
      infoRow('Payment Date',      fmtDate) +
      infoRow('Confirmation Code', `<code style="font-family:monospace;font-size:12px;">${confirmation || '—'}</code>`)
    )}

    <p style="margin:0;font-size:13px;color:#888888;line-height:1.6;">
      You can cancel this payment any time before the scheduled date through your Bill Pay dashboard.
    </p>

    ${ctaButton('Manage Bill Payments')}
  `;
  return { subject: `Bill payment of ${amount} to ${biller} scheduled — Summit Valley Bank`, html: base(`Your payment of ${amount} to ${biller} is scheduled`, body) };
}

// ════════════════════════════════════════════════════════════════════════════
// 6. Forgot Password
// ════════════════════════════════════════════════════════════════════════════
function forgotPasswordTemplate(name, { tempPassword } = {}) {
  const body = `
    ${greeting(name)}
    <p style="margin:0 0 20px;font-size:14px;color:#555555;line-height:1.6;">
      We received a request to reset your Summit Valley Bank account password. Use the temporary password below to complete the reset — it will be replaced once you set your new password.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#660000,#CC0000);border-radius:12px;margin:0 0 20px;overflow:hidden;">
      <tr><td style="padding:26px;text-align:center;">
        <p style="margin:0 0 6px;font-size:12px;color:rgba(255,255,255,0.65);text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">Your Temporary Password</p>
        <p style="margin:0;font-size:30px;font-weight:800;color:#FFCD41;font-family:monospace;letter-spacing:4px;">${tempPassword || '—'}</p>
        <p style="margin:10px 0 0;font-size:11px;color:rgba(255,255,255,0.5);">Enter this on the password reset page</p>
      </td></tr>
    </table>

    ${alertBox('🔑', '<strong>How to reset:</strong> Go to the Summit Valley Bank login page, click "Forgot password?", enter your email and this temporary password, then choose a new permanent password.', '#fffbeb', '#FEF08A')}
    ${alertBox('🔒', 'If you did not request a password reset, please ignore this email and contact support immediately — your account is still secure.', '#fff8f8', '#FFCCCC')}

    ${ctaButton('Reset My Password')}
  `;
  return {
    subject: 'Reset your Summit Valley Bank password',
    html: base('Your password reset temporary code is inside.', body),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 7. Welcome / Account Created
// ════════════════════════════════════════════════════════════════════════════
function welcomeTemplate(name, { tempPassword, email } = {}) {
  const body = `
    ${greeting(name)}
    <p style="margin:0 0 20px;font-size:14px;color:#555555;line-height:1.6;">
      Welcome to Summit Valley Bank! Your account has been created. Use the temporary password below to sign in for the first time — you'll be prompted to choose a permanent password immediately after logging in.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#660000,#CC0000);border-radius:12px;margin:0 0 20px;overflow:hidden;">
      <tr><td style="padding:26px;text-align:center;">
        <p style="margin:0 0 6px;font-size:12px;color:rgba(255,255,255,0.65);text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">Your Temporary Password</p>
        <p style="margin:0;font-size:30px;font-weight:800;color:#FFCD41;font-family:monospace;letter-spacing:4px;">${tempPassword || '—'}</p>
        <p style="margin:10px 0 0;font-size:11px;color:rgba(255,255,255,0.5);">Must be changed on first login</p>
      </td></tr>
    </table>

    ${detailTable(
      infoRow('Email', email || name) +
      infoRow('Status', '<span style="color:#15803d;font-weight:700;">Active</span>')
    )}

    ${alertBox('🔑', '<strong>Next step:</strong> Visit the Summit Valley Bank login page, enter your email address and the temporary password above, then follow the prompts to set a new permanent password.', '#fffbeb', '#FEF08A')}
    ${alertBox('🔒', 'If you did not expect this account, please contact Summit Valley Bank support immediately.', '#fff8f8', '#FFCCCC')}

    ${ctaButton('Sign In Now')}
  `;
  return {
    subject: 'Welcome to Summit Valley Bank — your account is ready',
    html: base('Your new Summit Valley Bank account is ready. Sign in with your temporary password.', body),
  };
}
