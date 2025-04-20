/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: false, // Disable gzip compression for vintage browsers

  // Disable image optimization since we're doing our own
  images: {
    unoptimized: true,
  },

  // Minimize output size
  output: 'standalone',

  // Disable unnecessary features during development
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // Disable Next.js scripts
  experimental: {
    // This disables the script optimization
    optimizePackageImports: [],
  },

  // Disable webpack features we don't need
  webpack: (config) => {
    // Disable client-side JavaScript
    config.optimization.runtimeChunk = false
    config.optimization.minimize = true

    return config
  },
}

export default nextConfig
