/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    instrumentationHook: true,
    // These packages ship native/WASM assets and must be required at runtime
    // instead of being bundled by webpack.
    serverComponentsExternalPackages: [
      "@electric-sql/pglite",
      "@neondatabase/serverless",
    ],
  },
};

export default nextConfig;
