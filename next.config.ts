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
  additionalPrecacheEntries: [{ url: "/practice", revision: getRevision() }],
  disable: process.env.NODE_ENV === "development",
  swDest: "public/sw.js",
  swSrc: "src/app/service-worker.ts",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default withSerwist(nextConfig);
