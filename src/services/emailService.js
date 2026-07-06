import nodemailer from "nodemailer";
import { getEmailConfig, isEmailConfigured } from "../config/email.js";

function buildEmailVerificationHtml({ name, verifyUrl, expiresInMinutes }) {
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
            <td style="background:linear-gradient(135deg,#2563eb,#7c3aed);padding:32px 24px;text-align:center;">
              <p style="margin:0 0 8px;color:rgba(255,255,255,0.9);font-size:14px;font-weight:600;letter-spacing:0.5px;">FitNova AI</p>
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Verify Your Email</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 24px;">
              <p style="margin:0 0 16px;color:#18181b;font-size:16px;">Hi ${displayName},</p>
              <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6;">
                Thanks for signing up for FitNova AI. Please confirm your email address to activate your account and start your fitness journey.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="border-radius:12px;background:linear-gradient(135deg,#2563eb,#7c3aed);">
                    <a href="${verifyUrl}" style="display:inline-block;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 32px;border-radius:12px;">
                      Verify Email
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;color:#71717a;font-size:13px;line-height:1.5;">
                This verification link expires in <strong>${expiresInMinutes} minutes</strong>.
              </p>
              <p style="margin:16px 0 0;color:#a1a1aa;font-size:12px;line-height:1.5;word-break:break-all;">
                Or copy this link: ${verifyUrl}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 24px;background:#fafafa;border-top:1px solid #f4f4f5;">
              <p style="margin:0;color:#a1a1aa;font-size:12px;line-height:1.5;text-align:center;">
                If you didn't create this account, you can safely ignore this email.
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

export async function sendEmailVerificationEmail({ to, name, verifyUrl, expiresInMinutes }) {
  const subject = "Verify your FitNova AI email";

  if (!isEmailConfigured()) {
    console.warn("[email] SMTP not configured — verification link for", to, ":", verifyUrl);
    return { sent: false, reason: "smtp_not_configured", verifyUrl };
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

  const text = `Hi ${name || "there"},\n\nVerify your FitNova AI email address:\n${verifyUrl}\n\nThis link expires in ${expiresInMinutes} minutes.\n\nIf you didn't create this account, ignore this email.`;

  await transporter.sendMail({
    from: `"${config.fromName}" <${config.from}>`,
    to,
    subject,
    text,
    html: buildEmailVerificationHtml({ name, verifyUrl, expiresInMinutes }),
  });

  return { sent: true };
}

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

function buildPasswordResetHtml({ name, resetUrl }) {
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
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;">Reset your FitNova AI password</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px;">
              <p style="margin:0 0 16px;color:#18181b;font-size:16px;">Hi ${displayName},</p>
              <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.6;">
                Use the button below to choose a new password for your account.
              </p>
              <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#7c3aed);color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:12px;">
                Reset password
              </a>
              <p style="margin:24px 0 0;color:#71717a;font-size:13px;line-height:1.5;">
                This link expires soon and works once. If you didn't request it, you can ignore this email.
              </p>
              <p style="margin:16px 0 0;color:#a1a1aa;font-size:12px;word-break:break-all;">
                Or copy this link: ${resetUrl}
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

export async function sendPasswordResetEmail({ to, name, resetUrl }) {
  const subject = "Reset your FitNova AI password";

  if (!isEmailConfigured()) {
    console.warn("[email] SMTP not configured — password reset link for", to, ":", resetUrl);
    return { sent: false, reason: "smtp_not_configured", resetUrl };
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

  const text = `Hi ${name || "there"},\n\nReset your FitNova AI password here:\n${resetUrl}\n\nIf you didn't request this, ignore this email.`;

  await transporter.sendMail({
    from: `"${config.fromName}" <${config.from}>`,
    to,
    subject,
    text,
    html: buildPasswordResetHtml({ name, resetUrl }),
  });

  return { sent: true };
}

function buildSignupOtpHtml({ name, code, expiresInMinutes }) {
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
            <td style="background:linear-gradient(135deg,#059669,#7c3aed);padding:28px 24px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;">Verify your email</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px;text-align:center;">
              <p style="margin:0 0 16px;color:#18181b;font-size:16px;">Hi ${displayName},</p>
              <p style="margin:0 0 20px;color:#52525b;font-size:15px;line-height:1.6;">
                Enter this code on the signup page to confirm your email address:
              </p>
              <p style="margin:0 0 20px;font-size:32px;font-weight:700;letter-spacing:8px;color:#059669;">${code}</p>
              <p style="margin:0;color:#71717a;font-size:13px;">
                This code expires in ${expiresInMinutes} minutes. If you didn't request this, ignore this email.
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

export async function sendSignupOtpEmail({ to, name, code, expiresInMinutes }) {
  const subject = "Your FitNova AI verification code";

  if (!isEmailConfigured()) {
    console.warn("[email] SMTP not configured — OTP for", to, ":", code);
    return { sent: false, reason: "smtp_not_configured" };
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

  const text = `Hi ${name || "there"},\n\nYour FitNova AI verification code is: ${code}\n\nThis code expires in ${expiresInMinutes} minutes.\n\nIf you didn't sign up, ignore this email.`;

  await transporter.sendMail({
    from: `"${config.fromName}" <${config.from}>`,
    to,
    subject,
    text,
    html: buildSignupOtpHtml({ name, code, expiresInMinutes }),
  });

  return { sent: true };
}
