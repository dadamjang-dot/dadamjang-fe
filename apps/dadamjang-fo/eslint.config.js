const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  {
    ignores: [
      ".expo/**",
      ".rnstorybook/storybook.requires.ts",
      "dist/**",
      "node_modules/**",
    ],
  },
  expoConfig,
  {
    rules: {
      "react/jsx-no-leaked-render": "error",
      "import/no-unresolved": [
        "error",
        {
          ignore: [
            "^@/.*",
            "^@dadamjang/.*",
            "^\\./storybook\\.requires$",
          ],
        },
      ],
    },
  },
]);
