import dotenv from "dotenv";
dotenv.config();

import { hydrateDbEnvFromProvider } from "./src/config/db.js";
hydrateDbEnvFromProvider();

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
import { connectRedis } from "./src/config/redis.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

app.get("/health", async (req, res) => {
  res.json({ ok: true, service: "ai-fitness-backend" });
});

app.use("/api", routes);
app.use(errorHandler);

// Render sets PORT automatically — do not hardcode 2002 unless you set it in Render env.
const PORT = Number(process.env.PORT) || 5000;

const startServer = async () => {
  try {
    console.log("⏳ Starting server...");
    console.log("NODE_ENV:", process.env.NODE_ENV || "development");
    console.log("DB_HOST:", process.env.DB_HOST?.trim() || "(not set)");
    console.log("MYSQL_URL set:", Boolean(process.env.MYSQL_URL?.trim()));
    console.log("MYSQL_PUBLIC_URL set:", Boolean(process.env.MYSQL_PUBLIC_URL?.trim()));
    console.log("REDIS_URL set:", Boolean(process.env.REDIS_URL?.trim()));

    await initDb();
    await connectRedis();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
