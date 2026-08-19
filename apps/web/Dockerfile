# apps/web/Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy workspace package manifests for the web app
COPY apps/web/package.json ./apps/web/package.json
COPY apps/web/package-lock.json ./apps/web/package-lock.json
COPY ../packages/db/package.json ./packages/db/package.json
COPY ../packages/shared/package.json ./packages/shared/package.json
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npm run db:generate --workspace=@cc-ops/db

# Build the Next.js app
RUN npm run build --workspace=@cc-ops/web

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built Next.js output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# The Next.js server entrypoint
CMD ["node", "server.js"]

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"