import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "drizzle/**",
      "supabase/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "e2e/.seed.json",
    ],
  },
  {
    // Icons must come through the central registry (docs/01 §5, rules/ui).
    files: ["**/*.{ts,tsx}"],
    ignores: ["components/icons.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@hugeicons/react",
              message: "Import icons from '@/components/icons' instead.",
            },
            {
              name: "@hugeicons/core-free-icons",
              message: "Import icons from '@/components/icons' instead.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
