import {
  signupService,
  loginService,
  magicLoginService,
  forgotPasswordService,
  resetPasswordService,
  verifyEmailService,
} from "../services/authService.js";
import { googleAuthService } from "../services/googleAuthService.js";
import { verifyEmailSchema, googleAuthSchema } from "../validators/authValidator.js";
import { getRedis } from "../config/redis.js";

export const verifyEmail = async (req, res, next) => {
  try {
    const { error } = verifyEmailSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0]?.message || "Invalid email",
      });
    }

    const data = await verifyEmailService(req.body);
    res.json({
      success: true,
      message: data.message,
      data,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message || "Invalid email",
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
    res.json({
      success: true,
      message: data.isNewUser ? "Account created with Google" : "Google login successful",
      data,
    });
  } catch (err) {
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

    res.json({
      success: true,
      message: data.message || "User registered successfully",
      data,
    });
  } catch (err) {
    if (
      err.message?.includes("email") ||
      err.message?.includes("Email") ||
      err.message?.includes("Password") ||
      err.message?.includes("Name") ||
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

    res.json({
      success: true,
      message: "Login successful",
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const signupByType = (userType) => async (req, res, next) => {
  try {
    const data = await signupService(req.body, { userType });
    res.json({
      success: true,
      message: `${userType} registered successfully`,
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const loginByType = (userType) => async (req, res, next) => {
  try {
    const data = await loginService(req.body, { requiredUserType: userType });
    res.json({
      success: true,
      message: `${userType} login successful`,
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const magicLogin = async (req, res, next) => {
  try {
    const token = req.body?.token || req.query?.token;
    const data = await magicLoginService(token);
    res.json({
      success: true,
      message: "Login successful",
      data,
    });
  } catch (err) {
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