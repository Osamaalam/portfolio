import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dynamically enable standalone output ONLY during Docker container builds
  output: process.env.DOCKER_BUILD === "true" ? "standalone" : undefined,
};

export default nextConfig;
