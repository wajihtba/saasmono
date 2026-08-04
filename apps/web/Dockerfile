# Build stage
FROM node:24-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.16.1 --activate

WORKDIR /app

# Copy root package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./

# Copy all workspace packages
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build workspace dependencies first (required for @repo/ui)
RUN pnpm --filter @repo/ui build

# Build argument for runtime environment variables
ARG NEXT_PUBLIC_SERVER_URL
ENV NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL

# Build the frontend
RUN pnpm --filter web build

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
COPY apps/web/package.json ./apps/web/

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod --filter web

# Copy built files and necessary Next.js files from builder
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/next.config.js ./apps/web/

# Set working directory to frontend app
WORKDIR /app/apps/web

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the Next.js server
CMD ["pnpm", "start"]
