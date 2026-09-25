# Repo ildizidan quriladi: docker build -f apps/api/Dockerfile .
FROM node:22-alpine
WORKDIR /repo
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/engine/package.json packages/engine/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @iquest/api...
COPY packages/engine packages/engine
COPY apps/api apps/api
WORKDIR /repo/apps/api
ENV NODE_ENV=production PORT=3000 UPLOAD_DIR=/data/uploads
EXPOSE 3000
CMD ["sh", "-c", "pnpm db:migrate && pnpm start"]
