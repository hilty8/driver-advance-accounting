# syntax=docker/dockerfile:1
FROM node:20-slim AS build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/next.config.ts ./
COPY frontend/tsconfig.json ./
COPY frontend/public ./public
COPY frontend/src ./src
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app/frontend
ENV NODE_ENV=production
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/frontend/.next ./.next
COPY --from=build /app/frontend/public ./public
COPY --from=build /app/frontend/next.config.ts ./
EXPOSE 3000
# Standalone output is enabled in next.config.ts, but runtime uses next start per policy.
CMD ["sh", "-c", "npx next start -p ${PORT:-3000}"]
