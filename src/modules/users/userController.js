import { createUserService, updateUserService, getUsersService, getUserByIdService, getUserHistoryService } from "./userService.js";
import { AppError } from "../../utils/AppError.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";

export const createUser = asyncHandler(async (req, res) => {
  const data = await createUserService(req.body);

  res.json({
    message: "User created",
    ...data,
  });
});

export const updateUser = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await updateUserService(userId, req.body);

  res.json({
    success: true,
    message: "User updated successfully",
    data: result.user,
  });
});

export const getUsers = asyncHandler(async (req, res) => {
  const data = await getUsersService();
  res.json(data);
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  const data = await getUserByIdService(req.user.id);

  if (!data) {
    throw new AppError("User not found", 404);
  }

  res.json({ success: true, data });
});

export const getUserById = asyncHandler(async (req, res) => {
  const data = await getUserByIdService(req.params.id);

  if (!data) {
    throw new AppError("User not found", 404);
  }

  res.json(data);
});

export const getUserHistory = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 10, field, from, to } = req.query;

  const result = await getUserHistoryService(userId, {
    page: Number(page),
    limit: Number(limit),
    field,
    from,
    to,
  });

  res.json({
    success: true,
    ...result,
  });
});
