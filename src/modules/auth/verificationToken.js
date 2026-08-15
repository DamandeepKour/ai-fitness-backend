import crypto from "crypto";

const TOKEN_BYTES = 32;

export function generateRawVerificationToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString("hex");
}

export function hashVerificationToken(rawToken) {
  return crypto.createHash("sha256").update(String(rawToken)).digest("hex");
}
