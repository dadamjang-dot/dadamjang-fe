import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "../../proxy";

const request = (cookie: string) =>
  new NextRequest("http://localhost:3002/dashboard", {
    headers: { cookie },
  });

describe("partner route proxy", () => {
  it("accepts only partner portal auth cookies", () => {
    expect(
      proxy(request("partner_refresh_token=partner")).headers.get("location"),
    ).toBeNull();
    expect(proxy(request("access_token=admin")).headers.get("location")).toBe(
      "http://localhost:3002/login",
    );
  });
});
