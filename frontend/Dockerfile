# Build stage: compile the React app.
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json vite.config.ts postcss.config.cjs index.html ./
COPY src ./src
# scripts/compile-docs.js regenerates src/docsCatalog.ts from src/docs/*.md as
# the first step of `npm run build`, so it must be in the image.
COPY scripts ./scripts
# Build stamp: the git commit the bundle was built from, surfaced in the About
# dialog (see CLAUDE.md "Build stamping"). Local builds pass VITE_COMMIT_HASH via
# frees.sh; Railway auto-provides RAILWAY_GIT_COMMIT_SHA as a build arg.
ARG VITE_COMMIT_HASH=
ARG RAILWAY_GIT_COMMIT_SHA=
ARG VITE_ASYNC_API=
ARG VITE_API_BASE=
RUN VITE_COMMIT_HASH="${VITE_COMMIT_HASH:-${RAILWAY_GIT_COMMIT_SHA:-dev}}" \
    VITE_ASYNC_API="${VITE_ASYNC_API}" \
    VITE_API_BASE="${VITE_API_BASE}" \
    npm run build

# Runtime stage: unprivileged nginx (runs as uid 101, listens on 8080)
# serves the static bundle and proxies /api to the backend. The nginx config
# is a template: the 20-envsubst-on-templates.sh entrypoint script expands
# ${BACKEND_HOST} at container start, so the same image works in docker-compose
# (BACKEND_HOST=api-node) and Railway (BACKEND_HOST=frees-api.railway.internal).
FROM nginxinc/nginx-unprivileged:alpine
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
# Runtime build-info: an entrypoint script stamps the live commit (see the
# script and CLAUDE.md "Build stamping"). build-info.js must be writable by the
# unprivileged runtime user; it starts empty so local builds fall back cleanly.
COPY docker-entrypoint.d/40-build-info.sh /docker-entrypoint.d/40-build-info.sh
USER root
RUN chmod +x /docker-entrypoint.d/40-build-info.sh \
    && : > /usr/share/nginx/html/build-info.js \
    && chown 101:101 /usr/share/nginx/html/build-info.js \
    && chmod 644 /usr/share/nginx/html/build-info.js
USER 101
EXPOSE 8080
