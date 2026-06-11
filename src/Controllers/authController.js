import { signupService, loginService, magicLoginService } from "../services/authService.js";
import { getRedis } from "../config/redis.js";

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