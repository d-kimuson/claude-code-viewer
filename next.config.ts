import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: [],
  },
  // devcontainer対応：HOSTNAME環境変数で0.0.0.0にバインド可能
  ...(process.env.HOSTNAME && {
    // @ts-ignore - Next.js 15の型定義に未対応の場合があるため
    hostname: process.env.HOSTNAME,
  }),
};

export default nextConfig;
