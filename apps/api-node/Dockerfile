# apps/api-node/Dockerfile
FROM node:20-slim AS base
# Install libc6-dev for native dependencies like bcrypt
RUN apt-get update && apt-get install -y --no-install-recommends libc6-dev && rm -rf /var/lib/apt/lists/*

# ==== 1️⃣ Copy repository‑root package manifests (they live at the repo root) ====
# From apps/api-node context, the repo root is one directory up.
COPY ../package.json .
COPY ../package-lock.json* ./

# ==== 2️⃣ Copy workspace package manifests ====
# web workspace
COPY ../apps/web/package.json apps/web/package.json
COPY ../apps/web/package-lock.json apps/web/package-lock.json
# db workspace
COPY ../packages/db/package.json packages/db/package.json
COPY ../packages/db/package-lock.json packages/db/package-lock.json
# shared workspace
COPY ../packages/shared/package.json packages/shared/package.json
COPY ../packages/shared/package-lock.json packages/shared/package-lock.json

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
# Production stage
# =========================================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non‑root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy only production node_modules (includes workspace symlinks)
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy the compiled API app
COPY --from=builder --chown=nodejs:nodejs /app/apps/api-node/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/api-node/package.json ./package.json

# Copy built workspace packages to their expected locations
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