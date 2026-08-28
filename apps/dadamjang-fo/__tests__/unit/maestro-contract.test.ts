import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("iOS Maestro contract", () => {
  it("uses the email sign-in selector and environment variable", () => {
    const flow = readFileSync(
      resolve(__dirname, "../../.maestro/ios-full.yaml"),
      "utf8",
    );

    expect(flow).toContain("id: e2e.auth.email.input");
    expect(flow).toContain("inputText: ${E2E_USER_EMAIL}");
    expect(flow).not.toContain("e2e.auth.userid.input");
    expect(flow).not.toContain("E2E_USER_ID");
  });
});
