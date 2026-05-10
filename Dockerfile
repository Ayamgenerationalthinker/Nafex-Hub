FROM node:24-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy everything
COPY . .

# Remove the preinstall script
RUN node -e "const fs=require('fs'); const pkg=JSON.parse(fs.readFileSync('package.json')); delete pkg.scripts.preinstall; fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));"

# Approve build scripts for bcrypt and esbuild before installing
RUN pnpm config set allow-scripts bcrypt,esbuild || true

# Install dependencies
RUN pnpm install --no-frozen-lockfile --ignore-scripts

# Rebuild native modules that need scripts
RUN pnpm rebuild bcrypt esbuild

# Build shared libs first
RUN pnpm run typecheck:libs

# Build frontend
RUN pnpm --filter @workspace/nafex-hub run build

# Build API server
RUN pnpm --filter @workspace/api-server run build

EXPOSE 5000

CMD ["node", "artifacts/api-server/dist/index.js"]