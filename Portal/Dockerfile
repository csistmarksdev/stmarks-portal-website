# CSI St. Mark's Portal — API + CMS in one image.
#
# Wraps the same layout `scripts/build-production-bundle.mjs` produces, so the
# container and the plain folder bundle run identical code through identical
# paths. Build from the repository root:
#
#   docker build -t csistmc-portal .
#
# See docker-compose.prod.yml for the database and required environment.

# ---------------------------------------------------------------- build ----
FROM node:22-alpine AS build
WORKDIR /app

# Manifests first: this layer is cached until a dependency actually changes,
# which is the difference between a 20-second rebuild and a 4-minute one.
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci

COPY shared shared
COPY backend backend
COPY frontend frontend

RUN npm run build -w @portal/shared \
 && npm run build -w @portal/backend \
 && npm run build -w @portal/frontend

# ------------------------------------------------------- runtime deps ------
# Production dependencies for the API, installed in isolation. `@portal/shared`
# is stripped first: it is a workspace package that does not exist on the public
# registry, so leaving it in the manifest makes `npm install` fail with a 404.
FROM node:22-alpine AS deps
WORKDIR /deps
COPY backend/package.json ./package.json
RUN node -e "const p=require('./package.json'); delete p.dependencies['@portal/shared']; \
             require('fs').writeFileSync('package.json', JSON.stringify({name:p.name,version:p.version,private:true,dependencies:p.dependencies},null,2))" \
 && npm install --omit=dev --no-audit --no-fund

# -------------------------------------------------------------- runtime ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# The API: compiled output plus production dependencies.
COPY --from=build  /app/backend/dist            backend/dist
COPY --from=deps   /deps/node_modules           backend/node_modules
COPY --from=build  /app/shared/dist             backend/node_modules/@portal/shared/dist
COPY --from=build  /app/shared/package.json     backend/node_modules/@portal/shared/package.json

# The initial data set: demo content and the media it references.
COPY --from=build  /app/backend/seed-data       backend/seed-data
COPY --from=build  /app/backend/seed-assets     backend/seed-assets

# The CMS: Next.js standalone server. `static` and `public` are copied
# separately because Next leaves them out of the trace — they are read from
# disk, never imported, so nothing references them and the CMS would otherwise
# boot and serve pages with no CSS or JavaScript.
COPY --from=build  /app/frontend/.next/standalone/frontend      frontend
COPY --from=build  /app/frontend/.next/standalone/node_modules  node_modules
COPY --from=build  /app/frontend/.next/static                   frontend/.next/static
COPY --from=build  /app/frontend/public                         frontend/public

COPY docker/entrypoint.mjs start.mjs

# Uploads are a mounted volume written at runtime, so it must belong to the
# user the app runs as — created here rather than left for Docker to create
# root-owned on first mount.
RUN mkdir -p /app/backend/uploads && chown -R node:node /app

# The node image ships an unprivileged `node` user but does not select it.
USER node

# 4000 API, 3001 CMS.
EXPOSE 4000 3001

HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "start.mjs"]
