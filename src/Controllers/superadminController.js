import { getBusinessAnalyticsService } from "../services/businessService.js";
import { getHealthAnalyticsService } from "../services/healthService.js";
import {
  getAIAnalyticsService,
  getAIGeneratedMealsService,
  getCompleteProfileUsersService,
  getSuperadminAnalyticsService,
  getSuperadminUserByIdService,
  getSuperadminUsersService,
} from "../services/superadminService.js";
import { updateUserService } from "../services/userService.js";

export async function getSuperadminAnalytics(req, res, next) {
  try {
    const data = await getSuperadminAnalyticsService();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getSuperadminUsers(req, res, next) {
  try {
    const users = await getSuperadminUsersService();
    res.json({ success: true, data: { users } });
  } catch (err) {
    next(err);
  }
}

export async function getSuperadminMe(req, res, next) {
  try {
    const user = await getSuperadminUserByIdService(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function updateSuperadminProfile(req, res, next) {
  try {
    const result = await updateUserService(req.user.id, req.body);
    res.json({
      success: true,
      message: "Profile updated successfully",
      data: result.user,
    });
  } catch (err) {
    next(err);
  }
}

export async function getSuperadminUserById(req, res, next) {
  try {
    const user = await getSuperadminUserByIdService(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function getCompleteProfileUsers(req, res, next) {
  try {
    const users = await getCompleteProfileUsersService();
    res.json({ success: true, data: { users } });
  } catch (err) {
    next(err);
  }
}

export async function getAIAnalytics(req, res, next) {
  try {
    const data = await getAIAnalyticsService();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getAIGeneratedMeals(req, res, next) {
  try {
    const limit = req.query.limit || 50;
    const meals = await getAIGeneratedMealsService(limit);
    res.json({ success: true, data: { meals } });
  } catch (err) {
    next(err);
  }
}

export async function getBusinessAnalytics(req, res, next) {
  try {
    const data = await getBusinessAnalyticsService();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getHealthAnalytics(req, res, next) {
  try {
    const data = await getHealthAnalyticsService();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
