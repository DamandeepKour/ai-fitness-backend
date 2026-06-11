export function getEmailConfig() {
  return {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@fitnova.ai",
    fromName: process.env.SMTP_FROM_NAME || "FitNova AI",
  };
}

export function isEmailConfigured() {
  const { host, user, pass } = getEmailConfig();
  return Boolean(host && user && pass);
}

export function getFrontendUrl() {
  return (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
}
