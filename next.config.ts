import { execFileSync } from "node:child_process";

import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

function getRevision() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return "development";
  }
}

const withSerwist = withSerwistInit({
  additionalPrecacheEntries: [
    { url: "/about", revision: getRevision() },
    { url: "/editor", revision: getRevision() },
    { url: "/history", revision: getRevision() },
    { url: "/practice", revision: getRevision() },
    { url: "/patterns", revision: getRevision() },
    { url: "/settings", revision: getRevision() },
  ],
  disable: process.env.NODE_ENV === "development",
  swDest: "public/sw.js",
  swSrc: "src/app/service-worker.ts",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.100.*"],
};

export default withSerwist(nextConfig);
