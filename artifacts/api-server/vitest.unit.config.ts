import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.service.test.ts"], // Only run unit tests, bypassing Docker container setup
    setupFiles: ["./src/test/setup.ts"],
    testTimeout: 20000,
  },
});
