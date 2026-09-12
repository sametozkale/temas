import path from "node:path";

import react from "@vitejs/plugin-react";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "vitest/config";

// Integration tests (e.g. lib/db/rls.test.ts) use the local Supabase DB when
// DATABASE_URL is present; they self-skip otherwise.
loadEnv({ path: [".env.test", ".env.local", ".env"] });

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    include: [
      "lib/**/*.test.ts",
      "components/**/*.test.tsx",
      "inngest/**/*.test.ts",
    ],
    passWithNoTests: true,
    testTimeout: 20_000,
  },
});
