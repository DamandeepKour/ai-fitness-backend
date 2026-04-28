import { addWeightService } from "../services/weightService.js";

export const addWeight = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const payload = {
      user_id: userId,
      weight: req.body.weight,
      log_date: new Date().toISOString().split("T")[0],
    };

    const result = await addWeightService(payload);

    res.json({
      success: true,
      message: result.updated
        ? "Weight updated for today"
        : "Weight added for today",
      data: {
        weight: payload.weight,
        log_date: payload.log_date,
      },
    });
  } catch (err) {
    next(err);
  }
};
