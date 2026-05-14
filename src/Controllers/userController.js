import { createUserService, updateUserService,getUsersService, getUserByIdService, getUserHistoryService } from "../services/userService.js";

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
        data: result.user,
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

// Get logged-in user
export const getCurrentUser = async (req, res, next) => {
  try {
    const data = await getUserByIdService(req.user.id);

    if (!data) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, data });
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

//get user history
export const getUserHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const {
      page = 1,
      limit = 10,
      field,
      from,
      to,
    } = req.query;

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

  } catch (err) {
    next(err);
  }
};