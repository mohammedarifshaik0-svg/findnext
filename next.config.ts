import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep PDF.js and its native canvas runtime intact in Vercel Functions.
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
};

export default nextConfig;
