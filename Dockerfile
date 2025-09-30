FROM node:20-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@8.15.5 --activate
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --prod
COPY . .
RUN pnpm run build
CMD ["pnpm", "start"]
