FROM node:24-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy everything
COPY . .

# Install dependencies (skip preinstall script)
RUN npm_config_user_agent=pnpm/0.0.0 pnpm install --frozen-lockfile

# Approve bcrypt build scripts
RUN pnpm approve-builds --force || true
RUN pnpm rebuild bcrypt

# Build shared libs first
RUN pnpm run typecheck:libs

# Build frontend
RUN pnpm --filter @workspace/nafex-hub run build

# Build API server
RUN pnpm --filter @workspace/api-server run build

EXPOSE 5000

CMD ["node", "artifacts/api-server/dist/index.js"]