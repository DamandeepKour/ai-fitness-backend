import { signupService, loginService } from "../services/authService.js";
import { redis }  from "../config/redis.js";

// 🧑‍💻 SIGNUP
export const signup = async (req, res, next) => {
  try {
    const data = await signupService(req.body);

    res.json({
      success: true,
      message: "User registered successfully",
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
      await redis.set(`blacklist:${token}`, "true", "EX", 60 * 60 * 24);
  
      res.json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (err) {
      next(err);
    }
  };