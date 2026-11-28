# syntax=docker/dockerfile:1@sha256:572cebbc2b15e6f84c077742952674889cb63cd5e9b80abdffcbe587b6f19183
FROM node:26-alpine@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5 AS build-base

ENV HUSKY=0
RUN npm install --global pnpm@12.23.0 \
    && printf '%s\n' '//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}' > /root/.npmrc

FROM build-base AS server-build
WORKDIR /src/nyte-server
COPY components/nyte-server/package.json components/nyte-server/pnpm-lock.yaml components/nyte-server/pnpm-workspace.yaml components/nyte-server/.npmrc ./
RUN --mount=type=secret,id=npm_token,env=NODE_AUTH_TOKEN,required=true pnpm install --frozen-lockfile
COPY components/nyte-server/ ./
RUN pnpm run build

FROM build-base AS server-deps
WORKDIR /src/nyte-server
COPY components/nyte-server/package.json components/nyte-server/pnpm-lock.yaml components/nyte-server/pnpm-workspace.yaml components/nyte-server/.npmrc ./
RUN --mount=type=secret,id=npm_token,env=NODE_AUTH_TOKEN,required=true pnpm install --frozen-lockfile --prod --ignore-scripts

FROM build-base AS web-build
WORKDIR /src/nyte-web
COPY components/nyte-web/package.json components/nyte-web/pnpm-lock.yaml components/nyte-web/pnpm-workspace.yaml components/nyte-web/.npmrc ./
RUN --mount=type=secret,id=npm_token,env=NODE_AUTH_TOKEN,required=true pnpm install --frozen-lockfile
COPY components/nyte-web/ ./
RUN pnpm exec vite build

FROM node:26-alpine@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5 AS server-runtime
ENV HOST=0.0.0.0 NODE_ENV=production PORT=52470
WORKDIR /app
COPY --from=server-deps --chown=node:node /src/nyte-server/node_modules ./server/node_modules
COPY --from=server-build --chown=node:node /src/nyte-server/dist ./server/dist
COPY --from=server-build --chown=node:node /src/nyte-server/package.json ./server/package.json
USER node
EXPOSE 52470
HEALTHCHECK CMD ["node", "-e", "fetch('http://127.0.0.1:' + process.env.PORT + '/health/live').then(r => { if (!r.ok) process.exitCode = 1 }).catch(() => { process.exitCode = 1 })"]

FROM server-runtime AS nyte-server
CMD ["node", "server/dist/main.js"]

FROM nginx:stable-alpine@sha256:8eb04fe3b385090e9aa02961f77398ad09b6bf33ab07f6669a5bb7acce22c0d3 AS nyte-web
ENV NYTE_SERVER_URL=http://nyte-server:52470
COPY packaging/web.conf.template /etc/nginx/templates/default.conf.template
COPY --from=web-build /src/nyte-web/dist/ /usr/share/nginx/html/
EXPOSE 52471

FROM server-runtime AS nyte
COPY --chown=node:node packaging/combined.cjs ./combined.cjs
COPY --from=web-build --chown=node:node /src/nyte-web/dist/ ./web/
CMD ["node", "combined.cjs"]
