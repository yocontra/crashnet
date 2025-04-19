/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable unnecessary features for this minimal project
  reactStrictMode: true,
  poweredByHeader: false,
  
  // Configure headers for better compatibility with vintage browsers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/html; charset=utf-8',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600',
          },
        ],
      },
    ]
  },
  
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
    // Disable font optimization
    fontLoaders: [],
  },
  
  // Disable webpack features we don't need
  webpack: (config) => {
    // Disable client-side JavaScript
    config.optimization.runtimeChunk = false;
    config.optimization.minimize = true;
    
    return config;
  },
}

export default nextConfig
