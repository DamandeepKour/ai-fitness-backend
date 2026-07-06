import {
  findUserByVerificationTokenHash,
  findUserByVerificationTokenHashAny,
  updateVerificationToken,
  markUserVerified,
  findUserByEmail,
} from "../repositories/userRepository.js";
import {
  generateRawVerificationToken,
  hashVerificationToken,
} from "../utils/verificationToken.js";
import { sendEmailVerificationEmail } from "./emailService.js";
import { getAppUrl } from "../config/email.js";

const VERIFICATION_EXPIRE_MINUTES = Number(
  process.env.VERIFICATION_EXPIRE_MINUTES || 30,
);

function buildVerificationExpiry() {
  return new Date(Date.now() + VERIFICATION_EXPIRE_MINUTES * 60 * 1000);
}

function buildVerificationUrl(rawToken) {
  const baseUrl = getAppUrl().replace(/\/$/, "");
  return `${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(rawToken)}`;
}

export async function createAndSendVerificationToken(user) {
  const rawToken = generateRawVerificationToken();
  const tokenHash = hashVerificationToken(rawToken);
  const expiresAt = buildVerificationExpiry();

  await updateVerificationToken(user.id, tokenHash, expiresAt);

  const verifyUrl = buildVerificationUrl(rawToken);
  const emailResult = await sendEmailVerificationEmail({
    to: user.email,
    name: user.name,
    verifyUrl,
    expiresInMinutes: VERIFICATION_EXPIRE_MINUTES,
  });

  return {
    emailSent: emailResult.sent === true,
    expiresInMinutes: VERIFICATION_EXPIRE_MINUTES,
  };
}

export async function verifyEmailByToken(rawToken) {
  const token = String(rawToken || "").trim();
  if (!token) {
    throw new Error("Invalid verification link.");
  }

  const tokenHash = hashVerificationToken(token);
  const user = await findUserByVerificationTokenHash(tokenHash);

  if (!user) {
    const existing = await findUserByVerificationTokenHashAny(tokenHash);
    if (existing?.is_verified) {
      return { message: "Email verified successfully." };
    }
    throw new Error("Verification link has expired.");
  }

  await markUserVerified(user.id);
  return { message: "Email verified successfully." };
}

export async function resendVerificationEmail(email) {
  const user = await findUserByEmail(email);

  if (!user) {
    return {
      message: "If an account exists with this email, a verification email has been sent.",
      emailSent: false,
    };
  }

  if (user.is_verified) {
    throw new Error("Email is already verified.");
  }

  const result = await createAndSendVerificationToken(user);
  return {
    message: "Verification email sent successfully.",
    emailSent: result.emailSent,
    expiresInMinutes: result.expiresInMinutes,
  };
}
