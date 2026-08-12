const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const withStorybook = require("@storybook/react-native/metro/withStorybook");
const path = require("path");

const config = getSentryExpoConfig(__dirname);
const workspaceRoot = path.resolve(__dirname, "../..");

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

config.resolver.unstable_enablePackageExports = false;

module.exports = withStorybook(config, {
  configPath: path.resolve(__dirname, ".rnstorybook"),
});
