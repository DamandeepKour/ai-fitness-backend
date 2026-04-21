import dotenv from "dotenv";
dotenv.config(); 
import express from "express"; 
import cors from "cors";
import initDb from "./initDb.js";
import routes from "./src/routes/index.js";
import errorHandler from "./src/middleware/errorHandler.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check (optional but good)
app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

// Routes
app.use("/api", routes);

// Error handler (always last)
app.use(errorHandler);

// 🚀 Start server properly
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await initDb();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();