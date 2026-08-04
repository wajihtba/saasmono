# Build stage
FROM node:24-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.16.1 --activate

WORKDIR /app

# Copy root package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./

# Copy all workspace packages
COPY packages/ ./packages/
COPY apps/raqeem-frontend/ ./apps/raqeem-frontend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build workspace dependencies first (required for @repo/ui)
RUN pnpm --filter @repo/ui build

# Build argument for runtime environment variables
ARG NEXT_PUBLIC_SERVER_URL
ENV NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL

# Build the frontend
RUN pnpm --filter raqeem-frontend build

# Production stage
FROM node:24-alpine AS runner

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.16.1 --activate

WORKDIR /app

# Copy root package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy all workspace packages (needed for workspace dependencies)
COPY packages/ ./packages/

# Copy frontend package
COPY apps/raqeem-frontend/package.json ./apps/raqeem-frontend/

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod --filter raqeem-frontend

# Copy built files and necessary Next.js files from builder
COPY --from=builder /app/apps/raqeem-frontend/.next ./apps/raqeem-frontend/.next
COPY --from=builder /app/apps/raqeem-frontend/public ./apps/raqeem-frontend/public
COPY --from=builder /app/apps/raqeem-frontend/next.config.js ./apps/raqeem-frontend/

# Set working directory to frontend app
WORKDIR /app/apps/raqeem-frontend

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the Next.js server
CMD ["pnpm", "start"]
