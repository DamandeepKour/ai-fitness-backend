import dotenv from "dotenv";
dotenv.config();

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Rejection:", reason);
});

import express from "express";
import cors from "cors";
import initDb from "./initDb.js";
import routes from "./src/routes/index.js";
import errorHandler from "./src/middleware/errorHandler.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

// Routes
app.use("/api", routes);

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    console.log("⏳ Starting server...");

    await initDb();
    console.log("✅ DB initialized");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();