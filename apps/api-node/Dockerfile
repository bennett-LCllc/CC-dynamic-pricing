# apps/api-node/Dockerfile
FROM node:20-slim AS base
# Install libc6-dev for native dependencies like bcrypt
RUN apt-get update && apt-get install -y --no-install-recommends libc6-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ==== 1️⃣ Copy repository‑root package manifests ====
COPY package.json .
COPY package-lock.json* ./

# ==== 2️⃣ Copy workspace package manifests ====
# web workspace
COPY apps/web/package.json apps/web/package.json
# api-node workspace
COPY apps/api-node/package.json apps/api-node/package.json
# db workspace
COPY packages/db/package.json packages/db/package.json
# shared workspace
COPY packages/shared/package.json packages/shared/package.json

# ==== 3️⃣ Install all workspace dependencies ====
RUN npm install --workspaces --legacy-peer-deps

# =========================================================
# Rebuild stage
# =========================================================
FROM base AS builder
WORKDIR /app

# Bring in node_modules from the deps stage
COPY --from=base /app/node_modules ./node_modules

# Copy the entire repository so we have source code for building packages
COPY . .

# ---- 4️⃣ Generate Prisma client (from the db workspace) ----
RUN npm run db:generate --workspace=@cc-ops/db

# ---- 5️⃣ Build workspace packages that need compilation ----
RUN npm run build --workspace=@cc-ops/db
RUN npm run build --workspace=@cc-ops/api-node

# =========================================================
# Production stage - FRESH stage (NOT from base) to avoid root package.json "type": "module"
# =========================================================
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install OpenSSL 1.1 for Prisma binary target debian-openssl-1.1.x
# Add bullseye repo for libssl1.1 (not available in bookworm)
RUN echo "deb http://deb.debian.org/debian bullseye main" > /etc/apt/sources.list.d/bullseye.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends libssl1.1 && \
    rm -rf /var/lib/apt/lists/* /etc/apt/sources.list.d/bullseye.list

# Create non‑root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Create minimal root package.json WITHOUT "type": "module" for npm workspaces
RUN echo '{"private":true,"workspaces":["apps/api-node","packages/db","packages/shared"]}' > package.json

# Copy package manifests for production install (only workspace packages, NOT root)
COPY --chown=nodejs:nodejs apps/api-node/package.json apps/api-node/package.json
COPY --chown=nodejs:nodejs packages/db/package.json packages/db/package.json
COPY --chown=nodejs:nodejs packages/shared/package.json packages/shared/package.json

# Install ONLY production dependencies for api-node (creates proper symlinks to built packages)
RUN npm install --omit=dev --legacy-peer-deps --workspace=@cc-ops/api-node

# Copy built workspace packages
COPY --from=builder --chown=nodejs:nodejs /app/packages/db/dist ./packages/db/dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nodejs:nodejs /app/packages/shared/src ./packages/shared/src

# Copy the compiled API app
COPY --from=builder --chown=nodejs:nodejs /app/apps/api-node/dist ./dist

# Copy openapi.yaml for runtime usage
COPY --from=builder --chown=nodejs:nodejs /app/apps/api-node/openapi.yaml ./openapi.yaml

USER nodejs

EXPOSE 4000
ENV PORT 4000

CMD ["node", "dist/index.js"]