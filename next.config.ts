import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: [],
  // devcontainer support: allow binding to 0.0.0.0 via HOSTNAME environment variable
  ...(process.env["HOSTNAME"] && {
    // @ts-ignore - Next.js 15 type definitions may not support this yet
    hostname: process.env["HOSTNAME"],
  }),
};

export default nextConfig;
