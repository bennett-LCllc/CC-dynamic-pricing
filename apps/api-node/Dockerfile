# apps/api-node/Dockerfile
FROM node:20-slim AS base

# Install dependencies only when needed
FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends libc6-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package.json package-lock.json* ./
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api-node/package.json apps/api-node/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm install --workspaces --legacy-peer-deps

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npm run db:generate --workspace=@cc-ops/db

# Build workspace packages that need compilation
RUN npm run build --workspace=@cc-ops/db
RUN npm run build --workspace=@cc-ops/api-node

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy only production node_modules (includes workspace symlinks)
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy built app
COPY --from=builder --chown=nodejs:nodejs /app/apps/api-node/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/api-node/package.json ./package.json

# Copy built workspace packages to their locations (for workspace symlinks to work)
COPY --from=builder --chown=nodejs:nodejs /app/packages/db/dist ./packages/db/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/db/package.json ./packages/db/package.json
COPY --from=builder --chown=nodejs:nodejs /app/packages/shared/src ./packages/shared/src
COPY --from=builder --chown=nodejs:nodejs /app/packages/shared/package.json ./packages/shared/package.json

# Copy openapi.yaml for runtime usage
COPY --from=builder --chown=nodejs:nodejs /app/apps/api-node/openapi.yaml ./openapi.yaml

USER nodejs

EXPOSE 4000

ENV PORT 4000

CMD ["node", "dist/index.js"]