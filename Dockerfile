# Multi-stage Dockerfile for Nyte application

# Stage 1: Builder - Build the application
FROM node:24-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY vite.config.ts ./
COPY react-router.config.ts ./
COPY eslint.config.mjs ./

# Copy source code
COPY src ./src
COPY scripts ./scripts

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Build the application
RUN pnpm build:web && pnpm build:server && node scripts/move-web-build.mjs

# Stage 2: Production - Run the application
FROM node:24-alpine AS production

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Set environment to production
ENV NODE_ENV=production

# Expose the port your app runs on (adjust if different)
EXPOSE 3000

# Start the application
CMD ["pnpm", "start"]
