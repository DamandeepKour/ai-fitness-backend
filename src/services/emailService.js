import nodemailer from "nodemailer";
import { getEmailConfig, isEmailConfigured } from "../config/email.js";

function buildSignupLoginHtml({ name, loginUrl }) {
  const displayName = name || "there";
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#2563eb,#7c3aed);padding:28px 24px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;">Welcome to FitNova AI</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px;">
              <p style="margin:0 0 16px;color:#18181b;font-size:16px;">Hi ${displayName},</p>
              <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6;">
                Your account is ready. Tap the button below to sign in securely — no password needed for this link.
              </p>
              <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#7c3aed);color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:12px;">
                Log in to FitNova
              </a>
              <p style="margin:24px 0 0;color:#71717a;font-size:13px;line-height:1.5;">
                This link expires in 24 hours and works once. If you didn't create an account, you can ignore this email.
              </p>
              <p style="margin:16px 0 0;color:#a1a1aa;font-size:12px;word-break:break-all;">
                Or copy this link: ${loginUrl}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendSignupLoginEmail({ to, name, loginUrl }) {
  const subject = "Your FitNova AI login link";

  if (!isEmailConfigured()) {
    console.warn("[email] SMTP not configured — login link for", to, ":", loginUrl);
    return { sent: false, reason: "smtp_not_configured", loginUrl };
  }

  const config = getEmailConfig();
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  const text = `Hi ${name || "there"},\n\nWelcome to FitNova AI! Log in here (expires in 24 hours):\n${loginUrl}\n\nIf you didn't sign up, ignore this email.`;

  await transporter.sendMail({
    from: `"${config.fromName}" <${config.from}>`,
    to,
    subject,
    text,
    html: buildSignupLoginHtml({ name, loginUrl }),
  });

  return { sent: true };
}
