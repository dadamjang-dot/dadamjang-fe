import { isIP } from "node:net";
import type { NextConfig } from "next";

type RuntimeEnvironment = "development" | "production" | "test";
type ImageRemotePattern = {
  protocol: "http" | "https";
  hostname: string;
  port: string;
  pathname: "/**";
};

const isPrivateHostname = (hostname: string) => {
  const normalized = hostname
    .toLowerCase()
    .replace(/^\[/, "")
    .replace(/\]$/, "");
  if (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local")
  )
    return true;

  const ipVersion = isIP(normalized);
  if (ipVersion === 4) {
    const octets = normalized.split(".").map(Number);
    const first = octets[0] ?? 0;
    const second = octets[1] ?? 0;
    return (
      first === 0 ||
      first === 10 ||
      first === 127 ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      (first === 198 && (second === 18 || second === 19)) ||
      first >= 224
    );
  }
  if (ipVersion === 6)
    return (
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      /^fe[89ab]/.test(normalized)
    );
  return false;
};

const invalidOrigins = () =>
  new Error(
    "DADAMJANG_IMAGE_ORIGINS must contain exact public http or https origins",
  );

const imageRemotePatterns = (
  value: string | undefined,
  environment: RuntimeEnvironment,
): ImageRemotePattern[] => {
  const origins = (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    if (environment === "production") throw invalidOrigins();
    if (environment === "development")
      return [
        {
          protocol: "http",
          hostname: "localhost",
          port: "",
          pathname: "/**",
        },
      ];
    return [];
  }

  return origins.map((origin) => {
    let url: URL;
    try {
      url = new URL(origin);
    } catch {
      throw invalidOrigins();
    }

    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.hostname.includes("*") ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      (environment !== "development" &&
        (url.hostname === "localhost" ||
          url.hostname.endsWith(".localhost"))) ||
      (environment === "production" && isPrivateHostname(url.hostname))
    )
      throw invalidOrigins();

    return {
      protocol: url.protocol.slice(0, -1) as "http" | "https",
      hostname: url.hostname,
      port: url.port,
      pathname: "/**",
    };
  });
};

const environment = process.env.NODE_ENV as RuntimeEnvironment;
const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: ["@dadamjang/domain"],
  images: {
    remotePatterns: imageRemotePatterns(
      process.env.DADAMJANG_IMAGE_ORIGINS,
      environment,
    ),
  },
};

export default nextConfig;
