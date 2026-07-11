const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  {
    ignores: ['.expo/**', 'dist/**', 'node_modules/**'],
  },
  expoConfig,
  {
    rules: {
      'import/no-unresolved': ['error', { ignore: ['^@/.*', '^@dadamjang/.*'] }],
    },
  },
]);
