import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Mastra packages to work correctly in Next.js
  serverExternalPackages: ["@mastra/*"],
};

export default nextConfig;
