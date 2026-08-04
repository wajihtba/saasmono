# Build stage
FROM node:24-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.16.1 --activate

WORKDIR /app

# Copy root package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./

# Copy all workspace packages
COPY packages/ ./packages/
COPY apps/raqeem-backend/ ./apps/raqeem-backend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the backend
RUN pnpm --filter raqeem-backend build

# Production stage
FROM node:24-alpine AS runner

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.16.1 --activate

WORKDIR /app

# Copy root package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy all workspace packages (needed for workspace dependencies)
COPY packages/ ./packages/

# Copy backend package
COPY apps/raqeem-backend/package.json ./apps/raqeem-backend/

# Install dependencies (including drizzle-kit for migrations)
RUN pnpm install --frozen-lockfile --filter raqeem-backend

# Copy built files from builder
COPY --from=builder /app/apps/raqeem-backend/dist ./apps/raqeem-backend/dist

# Copy source files (needed for drizzle migrations)
COPY --from=builder /app/apps/raqeem-backend/src ./apps/raqeem-backend/src
COPY --from=builder /app/apps/raqeem-backend/drizzle.config.ts ./apps/raqeem-backend/

# Copy scripts folder (needed for create-user script)
COPY --from=builder /app/apps/raqeem-backend/scripts ./apps/raqeem-backend/scripts

# Copy entrypoint script
COPY apps/raqeem-backend/docker-entrypoint.sh ./apps/raqeem-backend/
RUN chmod +x ./apps/raqeem-backend/docker-entrypoint.sh

# Set working directory to backend app
WORKDIR /app/apps/raqeem-backend

# Expose port
EXPOSE 4000

# Set environment to production
ENV NODE_ENV=production

# Use entrypoint script to handle migrations
ENTRYPOINT ["/app/apps/raqeem-backend/docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
