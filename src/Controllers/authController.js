import {
  signupService,
  loginService,
  magicLoginService,
  forgotPasswordService,
  resetPasswordService,
  verifyEmailService,
} from "../services/authService.js";
import { sendSignupCodeService } from "../services/signupVerificationService.js";
import {
  verifyEmailByToken,
  resendVerificationEmail,
} from "../services/emailVerificationService.js";
import { googleAuthService } from "../services/googleAuthService.js";
import {
  verifyEmailSchema,
  googleAuthSchema,
} from "../validators/authValidator.js";
import { getRedis } from "../config/redis.js";
import { AUDIT_ACTIONS, logAction } from "../utils/auditLog.js";

export const sendSignupCode = async (req, res, next) => {
  try {
    const data = await sendSignupCodeService(req.body);
    res.json({
      success: true,
      message: data.message,
      data,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message || "Could not send verification code",
    });
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { error } = verifyEmailSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0]?.message || "Invalid email address.",
      });
    }

    const data = await verifyEmailService(req.body);
    res.json({
      success: true,
      message: data.message,
      data,
    });
  } catch (err) {
    const status = err.message === "Email domain does not exist." ? 400 : 400;
    res.status(status).json({
      success: false,
      message: err.message || "Invalid email address.",
    });
  }
};

export const verifyEmailToken = async (req, res, next) => {
  try {
    const token = req.query?.token;
    const data = await verifyEmailByToken(token);
    res.json({
      success: true,
      message: data.message,
    });
  } catch (err) {
    const isExpired = err.message === "Verification link has expired.";
    res.status(isExpired ? 400 : 400).json({
      success: false,
      message: err.message || "Invalid verification link.",
    });
  }
};

export const resendVerification = async (req, res, next) => {
  try {
    const data = await resendVerificationEmail(req.body.email);
    res.json({
      success: true,
      message: data.message,
      data,
    });
  } catch (err) {
    const isAlreadyVerified = err.message === "Email is already verified.";
    res.status(isAlreadyVerified ? 400 : 400).json({
      success: false,
      message: err.message || "Could not resend verification email",
    });
  }
};

export const googleAuth = async (req, res, next) => {
  try {
    const { error } = googleAuthSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0]?.message || "Invalid Google sign-in",
      });
    }

    const data = await googleAuthService(req.body.credential);
    logAction({
      action: data.isNewUser ? AUDIT_ACTIONS.SIGNUP : AUDIT_ACTIONS.LOGIN,
      status: "success",
      req,
      userId: data?.user?.id ?? null,
      meta: { method: "google", isNewUser: Boolean(data.isNewUser) },
    });
    res.json({
      success: true,
      message: data.isNewUser ? "Account created with Google" : "Google login successful",
      data,
    });
  } catch (err) {
    logAction({
      action: AUDIT_ACTIONS.LOGIN,
      status: "failure",
      req,
      message: err.message,
      meta: { method: "google" },
    });
    const status = err.message?.includes("not configured") ? 503 : 401;
    res.status(status).json({
      success: false,
      message: err.message || "Google sign-in failed",
    });
  }
};

// 🧑‍💻 SIGNUP
export const signup = async (req, res, next) => {
  try {
    const data = await signupService(req.body, { userType: "user" });

    logAction({
      action: AUDIT_ACTIONS.SIGNUP,
      status: "success",
      req,
      userId: data?.user?.id ?? data?.id ?? null,
      meta: { userType: "user", email: data?.user?.email ?? req.body?.email },
    });

    res.json({
      success: true,
      message: data.message || "User registered successfully",
      data,
    });
  } catch (err) {
    logAction({
      action: AUDIT_ACTIONS.SIGNUP,
      status: "failure",
      req,
      message: err.message,
      meta: { userType: "user", email: req.body?.email },
    });
    if (
      err.message?.includes("email") ||
      err.message?.includes("Email") ||
      err.message?.includes("Password") ||
      err.message?.includes("Name") ||
      err.message?.includes("verification") ||
      err.message?.includes("Verification") ||
      err.message?.includes("code") ||
      err.message?.includes("Code") ||
      err.message?.includes("already exists") ||
      err.message?.includes("disposable")
    ) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
};

// 🔐 LOGIN
export const login = async (req, res, next) => {
  try {
    const data = await loginService(req.body);

    logAction({
      action: AUDIT_ACTIONS.LOGIN,
      status: "success",
      req,
      userId: data?.user?.id ?? null,
      meta: { userType: data?.user?.user_type ?? "user", method: "password" },
    });

    res.json({
      success: true,
      message: "Login successful",
      data,
    });
  } catch (err) {
    logAction({
      action: AUDIT_ACTIONS.LOGIN,
      status: "failure",
      req,
      message: err.message,
      meta: { method: "password", email: req.body?.email },
    });
    if (err.statusCode === 403) {
      return res.status(403).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
};

export const signupByType = (userType) => async (req, res, next) => {
  try {
    const data = await signupService(req.body, { userType });
    logAction({
      action: AUDIT_ACTIONS.SIGNUP,
      status: "success",
      req,
      userId: data?.user?.id ?? data?.id ?? null,
      meta: { userType, email: data?.user?.email ?? req.body?.email },
    });
    res.json({
      success: true,
      message: `${userType} registered successfully`,
      data,
    });
  } catch (err) {
    logAction({
      action: AUDIT_ACTIONS.SIGNUP,
      status: "failure",
      req,
      message: err.message,
      meta: { userType, email: req.body?.email },
    });
    next(err);
  }
};

export const loginByType = (userType) => async (req, res, next) => {
  try {
    const data = await loginService(req.body, { requiredUserType: userType });
    logAction({
      action: AUDIT_ACTIONS.LOGIN,
      status: "success",
      req,
      userId: data?.user?.id ?? null,
      meta: { userType, method: "password" },
    });
    res.json({
      success: true,
      message: `${userType} login successful`,
      data,
    });
  } catch (err) {
    logAction({
      action: AUDIT_ACTIONS.LOGIN,
      status: "failure",
      req,
      message: err.message,
      meta: { userType, method: "password", email: req.body?.email },
    });
    if (err.statusCode === 403) {
      return res.status(403).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
};

export const magicLogin = async (req, res, next) => {
  try {
    const token = req.body?.token || req.query?.token;
    const data = await magicLoginService(token);
    logAction({
      action: AUDIT_ACTIONS.LOGIN,
      status: "success",
      req,
      userId: data?.user?.id ?? null,
      meta: { method: "magic_link" },
    });
    res.json({
      success: true,
      message: "Login successful",
      data,
    });
  } catch (err) {
    logAction({
      action: AUDIT_ACTIONS.LOGIN,
      status: "failure",
      req,
      message: err.message,
      meta: { method: "magic_link" },
    });
    if (err.statusCode === 403) {
      return res.status(403).json({
        success: false,
        message: err.message,
      });
    }
    if (err.message === "Invalid or expired login link") {
      return res.status(401).json({ success: false, message: err.message });
    }
    next(err);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const data = await forgotPasswordService(req.body);
    res.json({
      success: true,
      message: data.message || "Email verified",
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const data = await resetPasswordService(req.body);
    res.json({
      success: true,
      message: data.message || "Password reset successfully",
      data,
    });
  } catch (err) {
    next(err);
  }
};

//logout
export const logout = async (req, res, next) => {
    try {
      const header = req.headers.authorization;
  
      if (!header) {
        return res.status(400).json({
          success: false,
          message: "Token missing",
        });
      }
  
      const token = header.split(" ")[1];
  
      // ⏳ Set expiry (same as JWT expiry or shorter)
      const redis = getRedis();
      if (redis) {
        await redis.set(`blacklist:${token}`, "true", "EX", 60 * 60 * 24);
      }
      res.clearCookie("token", { path: "/" });
  
      res.json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (err) {
      next(err);
    }
  };