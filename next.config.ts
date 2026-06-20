import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native addon — must not be bundled by webpack/Turbopack.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
