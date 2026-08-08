import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: [],
    testTimeout: 20000,
    env: {
      DATABASE_URL: "postgresql://testuser:testpass@localhost:5432/testdb",
      JWT_SECRET: "testsecret123456789012345678901234567890",
      NODE_ENV: "test",
    },
  },
});
