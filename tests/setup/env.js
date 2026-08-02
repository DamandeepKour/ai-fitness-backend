/**
 * Test environment defaults — applied before any app imports.
 */
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-at-least-32-characters-long";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
process.env.FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
process.env.APP_URL = process.env.APP_URL || "http://localhost:5000";
process.env.DB_HOST = process.env.DB_HOST || "localhost";
process.env.DB_USER = process.env.DB_USER || "test";
process.env.DB_NAME = process.env.DB_NAME || "fitnova_test";
process.env.DB_PASSWORD = process.env.DB_PASSWORD || "";
process.env.GROQ_API_KEY = process.env.GROQ_API_KEY || "test-groq-key-xxxxxxxxxxxx";
process.env.LOG_LEVEL = process.env.LOG_LEVEL || "silent";
process.env.BODY_SIZE_LIMIT = "1mb";
// Disable Redis/Mongo side effects in unit/integration tests unless explicitly set.
if (!process.env.KEEP_REDIS_IN_TESTS) {
  delete process.env.REDIS_URL;
}
if (!process.env.KEEP_MONGO_IN_TESTS) {
  delete process.env.MONGODB_URI;
}
