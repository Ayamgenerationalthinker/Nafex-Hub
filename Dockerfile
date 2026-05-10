FROM node:24-slim

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy everything
COPY . .

# Remove the preinstall script
RUN node -e "const fs=require('fs'); const pkg=JSON.parse(fs.readFileSync('package.json')); delete pkg.scripts.preinstall; fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));"

# Install dependencies with all scripts enabled
RUN pnpm install --no-frozen-lockfile

# Build shared libs first
RUN pnpm run typecheck:libs

# Build frontend
RUN pnpm --filter @workspace/nafex-hub run build

# Build API server
RUN pnpm --filter @workspace/api-server run build

EXPOSE 5000

CMD ["node", "artifacts/api-server/dist/index.js"]