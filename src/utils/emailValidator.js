import dns from "dns/promises";
import validator from "validator";

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
  if (!validator.isEmail(normalized)) return "Invalid email address.";

  const [, domain] = normalized.split("@");
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return "Temporary or disposable email addresses are not allowed";
  }

  return "";
}

export async function validateEmailMx(email) {
  const normalized = normalizeEmail(email);
  const domain = normalized.split("@")[1];

  try {
    const mxRecords = await dns.resolveMx(domain);
    if (!Array.isArray(mxRecords) || mxRecords.length === 0) {
      throw new Error("Email domain does not exist.");
    }
  } catch (err) {
    if (err.message === "Email domain does not exist.") throw err;
    throw new Error("Email domain does not exist.");
  }

  return normalized;
}

export async function validateSignupEmail(email) {
  const formatError = validateEmailFormat(email);
  if (formatError) throw new Error(formatError);

  return validateEmailMx(email);
}
