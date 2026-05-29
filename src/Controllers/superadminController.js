import {
  getCompleteProfileUsersService,
  getSuperadminAnalyticsService,
  getSuperadminUserByIdService,
  getSuperadminUsersService,
} from "../services/superadminService.js";

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
