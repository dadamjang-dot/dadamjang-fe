import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = (relativePath: string) =>
  readFileSync(resolve(__dirname, "../../src", relativePath), "utf8");

describe("mobile compiler and styling contract", () => {
  it.each([
    "shared/components/product-layout/layout-animation.ios.ts",
    "shared/components/product-layout/product-layout.ios.tsx",
    "shared/components/product-header/header-animation.ios.ts",
    "shared/components/product-header/product-header.ios.tsx",
  ])("uses SharedValue get/set accessors in %s", (relativePath) => {
    expect(source(relativePath)).not.toMatch(/\.value\b/);
  });

  it.each([
    "shared/components/product-layout/product-layout.ios.tsx",
    "shared/components/product-header/product-header.ios.tsx",
    "shared/components/product-header/product-header.android.tsx",
  ])("uses Unistyles in %s", (relativePath) => {
    const contents = source(relativePath);

    expect(contents).toContain('from "react-native-unistyles"');
    expect(contents).not.toMatch(
      /import\s*\{[^}]*\bStyleSheet\b[^}]*\}\s*from\s*"react-native"/s,
    );
  });

  it.each([
    "shared/components/product-layout/layout-animation.ios.ts",
    "shared/components/product-header/header-animation.ios.ts",
  ])("does not animate layout properties in %s", (relativePath) => {
    expect(source(relativePath)).not.toMatch(
      /\b(?:bottom|flex|height|left|margin|padding|right|top|width)\s*:/,
    );
  });
});
