FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/admin-web/package.json apps/admin-web/package.json
COPY packages packages
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter ./apps/admin-web build

FROM deps AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/admin-web/.next ./apps/admin-web/.next
COPY --from=build /app/apps/admin-web/public ./apps/admin-web/public
COPY --from=build /app/apps/admin-web/package.json ./apps/admin-web/package.json
EXPOSE 3000
CMD ["pnpm", "--filter", "./apps/admin-web", "exec", "next", "start", "-p", "3000"]
