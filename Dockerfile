# Build Stage
FROM node:22-alpine AS builder

WORKDIR /app

ENV CI=true

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@11.4.0 --activate

# Copy workspace configurations
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/nafex-hub/package.json ./artifacts/nafex-hub/
COPY lib/db/package.json ./lib/db/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the source code
COPY . .

# Build the applications
RUN pnpm run build

# Prune dev dependencies to reduce final image size
RUN pnpm install --prod --frozen-lockfile

# Production Stage
FROM node:22-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

# Create non-root user for security
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs
USER nodejs

# Copy built assets and production dependencies
COPY --from=builder --chown=nodejs:nodejs /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=builder --chown=nodejs:nodejs /app/artifacts/api-server/package.json ./artifacts/api-server/
COPY --from=builder --chown=nodejs:nodejs /app/artifacts/nafex-hub/dist ./artifacts/nafex-hub/dist
COPY --from=builder --chown=nodejs:nodejs /app/lib/db ./lib/db

EXPOSE 5000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/healthz || exit 1

# Start the API server
CMD ["node", "artifacts/api-server/dist/index.mjs"]
