# Portal backend — NestJS API
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
RUN npm ci --workspace @portal/shared --workspace @portal/backend --include-workspace-root=false

COPY shared shared
COPY backend backend
RUN npm run build -w @portal/shared && npm run build -w @portal/backend

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
RUN npm ci --omit=dev --workspace @portal/shared --workspace @portal/backend --include-workspace-root=false

COPY --from=build /app/shared/dist shared/dist
COPY --from=build /app/backend/dist backend/dist

# Uploads are a mounted volume the app writes to at runtime, so it has to be
# owned by the user the app runs as — created here rather than left for Docker
# to make root-owned on first mount.
RUN mkdir -p /app/backend/uploads && chown -R node:node /app

# The `node` image ships an unprivileged `node` user but does not select it.
# Running as root means a file-write bug in the upload path writes anywhere in
# the container; this is the cheapest containment there is.
USER node

WORKDIR /app/backend
EXPOSE 4000
CMD ["node", "dist/main"]
