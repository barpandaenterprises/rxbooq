import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@next/next/no-img-element": "warn",
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "storybook-static/**",
      "src/lib/supabase/database.types.ts",
    ],
  },
];

export default config;
