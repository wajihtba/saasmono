# Build stage
FROM node:24-alpine AS builder

# Install build dependencies for canvas and native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.16.1 --activate

WORKDIR /app

# Copy root package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./

# Copy all workspace packages
COPY packages/ ./packages/
COPY apps/server/ ./apps/server/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the backend
RUN pnpm --filter server build

# Production stage
FROM node:24-alpine AS runner

# Install runtime dependencies AND build dependencies for canvas
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo \
    cairo-dev \
    jpeg \
    jpeg-dev \
    pango \
    pango-dev \
    giflib \
    giflib-dev \
    pixman \
    pixman-dev

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.16.1 --activate

WORKDIR /app

# Copy root package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy all workspace packages (needed for workspace dependencies)
COPY packages/ ./packages/

# Copy backend package
COPY apps/server/package.json ./apps/server/

# Install dependencies (including drizzle-kit for migrations)
RUN pnpm install --frozen-lockfile --filter server

# Copy built files from builder
COPY --from=builder /app/apps/server/dist ./apps/server/dist

# Copy source files (needed for drizzle migrations)
COPY --from=builder /app/apps/server/src ./apps/server/src
COPY --from=builder /app/apps/server/drizzle.config.ts ./apps/server/

# Copy entrypoint script
COPY apps/server/docker-entrypoint.sh ./apps/server/
RUN chmod +x ./apps/server/docker-entrypoint.sh

# Set working directory to backend app
WORKDIR /app/apps/server

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Use entrypoint script to handle migrations
ENTRYPOINT ["/app/apps/server/docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
