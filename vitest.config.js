import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    setupFiles: ["./tests/setup/env.js"],
    include: [
      "tests/unit/**/*.test.js",
      "tests/validation/**/*.test.js",
      "tests/integration/**/*.test.js",
      "tests/smoke/**/*.test.js",
    ],
    exclude: ["node_modules", "tests/load/**", "tests/manual/**"],
    testTimeout: 15000,
    hookTimeout: 15000,
    pool: "forks",
    sequence: {
      concurrent: false,
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.js"],
      exclude: ["src/jobs/workerProcess.js", "src/jobs/aiWorker.js"],
    },
  },
});
