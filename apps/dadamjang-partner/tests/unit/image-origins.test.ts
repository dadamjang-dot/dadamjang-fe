import { afterEach, describe, expect, it, vi } from "vitest";

const loadConfig = async (
  environment: "development" | "production" | "test",
  origins?: string,
) => {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", environment);
  vi.stubEnv("DADAMJANG_IMAGE_ORIGINS", origins ?? "");
  return (await import("../../next.config")).default;
};

describe("image origin configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("maps configured origins to exact protocol, hostname, and port patterns", async () => {
    const config = await loadConfig(
      "production",
      " https://cdn.example.com, https://assets.example.com:8443 ",
    );

    expect(config.images?.remotePatterns).toEqual([
      {
        protocol: "https",
        hostname: "cdn.example.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "assets.example.com",
        port: "8443",
        pathname: "/**",
      },
    ]);
  });

  it.each([
    ["an empty allowlist", ""],
    ["a wildcard origin", "https://*.example.com"],
    ["a localhost origin", "http://localhost:3000"],
    ["a trailing-dot localhost origin", "http://localhost."],
    ["a private origin", "http://10.0.0.7"],
    ["an IPv4-mapped loopback origin", "http://[::ffff:127.0.0.1]"],
  ])("rejects %s in production", async (_name, origins) => {
    await expect(loadConfig("production", origins)).rejects.toThrow(
      "DADAMJANG_IMAGE_ORIGINS",
    );
  });

  it("allows only localhost by default in development", async () => {
    const config = await loadConfig("development");

    expect(config.images?.remotePatterns).toEqual([
      {
        protocol: "http",
        hostname: "localhost",
        port: "",
        pathname: "/**",
      },
    ]);
  });
});
