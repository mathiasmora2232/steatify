# Multi-stage build for the NestJS backend.
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

# --- deps ---
FROM base AS deps
COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/
RUN npm ci --workspace=backend --include-workspace-root

# --- build ---
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY backend ./backend
# Workspace-nested deps (e.g. sharp pinned to a different version than the root)
# live under backend/node_modules and must be carried over too, or tsc can't
# resolve them.
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY package.json ./
RUN npm run prisma:generate --workspace=backend \
 && npm run build --workspace=backend

# --- runtime ---
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/node_modules ./backend/node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/prisma ./backend/prisma
COPY backend/package.json ./backend/
WORKDIR /app/backend
EXPOSE 4000
# Run pending migrations then boot.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
