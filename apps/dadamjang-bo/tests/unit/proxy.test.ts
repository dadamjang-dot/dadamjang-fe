import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "../../proxy";

const request = (cookie: string) =>
  new NextRequest("http://localhost:3001/dashboard", {
    headers: { cookie },
  });

describe("admin route proxy", () => {
  it("accepts only admin portal auth cookies", () => {
    expect(
      proxy(request("bo_refresh_token=admin")).headers.get("location"),
    ).toBeNull();
    expect(proxy(request("access_token=partner")).headers.get("location")).toBe(
      "http://localhost:3001/login",
    );
  });
});
