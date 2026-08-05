/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  // @repo/ui and @repo/rbac ship TypeScript source, so Next compiles them like
  // app code.
  transpilePackages: ['@repo/ui', '@repo/rbac'],
  // Disable ESLint and TypeScript checks during production builds
  // Run these checks separately in CI/CD pipeline
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    // Rewrites barrel imports (`import { Button } from '@repo/ui'`) to the file
    // that actually defines the export, so a page stops pulling in all 83
    // components plus recharts/embla/cmdk just to render a button.
    optimizePackageImports: ['@repo/ui', 'lucide-react'],
  },
}

export default nextConfig
