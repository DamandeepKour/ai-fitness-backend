import { createUserService, updateUserService,getUsersService, getUserByIdService } from "../services/userService.js";

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

  //update user
  export const updateUser = async (req, res, next) => {
    try {
      const userId = req.user.id; 
  
      const result = await updateUserService(userId, req.body);
  
      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found or no changes made",
        });
      }
  
      res.json({
        success: true,
        message: "User updated successfully",
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