import { createUserService, getUsersService, getUserByIdService } from "../services/userService.js";

// ✅ Create User
export const createUser = async (req, res, next) => {
    try {
       const data = await createUserService(req.body);
  
      res.json({
        message: "User created",
        ...data,
      });
    } catch (err) {
      next(err);
    }
  };

//Get All Users
export const getUsers = async (req, res, next) => {
  try {
    const data = await getUsersService();

    res.json(data);
  } catch (err) {
    next(err);
  }
};

//Get User by ID
export const getUserById = async (req, res, next) => {
  try {
    const data = await getUserByIdService(req.params.id);

    if (!data) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
};