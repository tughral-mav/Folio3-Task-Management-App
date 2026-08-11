import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NFR9/D5: portable build — standalone output for Docker/VM hosting.
  // Vercel does its own serverless packaging and breaks on standalone
  // (missing .nft.json trace files), so it is skipped there only.
  output: process.env.VERCEL ? undefined : "standalone",
};

export default nextConfig;
