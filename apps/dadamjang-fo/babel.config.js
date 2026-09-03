module.exports = {
  presets: ["babel-preset-expo"],
  plugins: [
    ...(process.env.NODE_ENV === "test" ? ["babel-plugin-react-compiler"] : []),
    "react-native-reanimated/plugin",
  ],
};
