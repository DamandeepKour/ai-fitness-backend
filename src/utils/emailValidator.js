import dns from "dns/promises";

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "tempmail.com",
  "temp-mail.org",
  "10minutemail.com",
  "yopmail.com",
  "throwaway.email",
  "fakeinbox.com",
  "trashmail.com",
  "getnada.com",
  "maildrop.cc",
  "dispostable.com",
  "sharklasers.com",
  "grr.la",
  "mailnesia.com",
  "mintemail.com",
  "emailondeck.com",
  "tempail.com",
  "moakt.com",
]);

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function validateEmailFormat(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return "Email is required";
  if (normalized.length > 254) return "Email is too long";
  if (!EMAIL_REGEX.test(normalized)) return "Not a valid email address";

  const [, domain] = normalized.split("@");
  if (!domain || domain.length < 3) return "Not a valid email address";
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return "Temporary or disposable email addresses are not allowed";
  }

  return "";
}

async function domainAcceptsMail(domain) {
  try {
    const mxRecords = await dns.resolveMx(domain);
    if (Array.isArray(mxRecords) && mxRecords.length > 0) return true;
  } catch {
    // fall through
  }

  try {
    const aRecords = await dns.resolve4(domain);
    if (Array.isArray(aRecords) && aRecords.length > 0) return true;
  } catch {
    // fall through
  }

  return false;
}

export async function validateSignupEmail(email) {
  const formatError = validateEmailFormat(email);
  if (formatError) throw new Error(formatError);

  const normalized = normalizeEmail(email);
  const domain = normalized.split("@")[1];

  const acceptsMail = await domainAcceptsMail(domain);
  if (!acceptsMail) {
    throw new Error("This email domain cannot receive mail. Use a real email address.");
  }

  return normalized;
}
