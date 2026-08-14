import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      "func-style": ["error", "expression", { allowArrowFunctions: true }],
    },
  },
  globalIgnores([".next/**", "playwright-report/**", "test-results/**"]),
]);
