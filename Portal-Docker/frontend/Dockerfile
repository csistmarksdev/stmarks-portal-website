# Portal frontend — Next.js admin CMS
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY frontend/package.json frontend/
RUN npm ci --workspace @portal/shared --workspace @portal/frontend --include-workspace-root=false

COPY shared shared
COPY frontend frontend
RUN npm run build -w @portal/shared

ARG NEXT_PUBLIC_API_URL=http://localhost:4000/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build -w @portal/frontend

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules node_modules
COPY --from=build /app/shared shared
COPY --from=build /app/frontend frontend
COPY package.json ./

WORKDIR /app/frontend
EXPOSE 3001
CMD ["npx", "next", "start", "-p", "3001"]
