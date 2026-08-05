/** @type {import('next').NextConfig} */
const nextConfig = {
  // @repo/ui ships TypeScript source, so Next compiles it like app code.
  transpilePackages: ['@repo/ui'],
  experimental: {
    // Rewrites barrel imports to the file that defines the export, so a page
    // stops pulling in every component in the package.
    optimizePackageImports: ['@repo/ui', 'lucide-react'],
  },
  typescript: {
    // Skip type checking during build (run separately in CI)
    ignoreBuildErrors: true,
  },
  eslint: {
    // Skip ESLint during build (run separately in CI)
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
