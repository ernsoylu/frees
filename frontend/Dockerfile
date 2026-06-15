# Build stage: compile the React app.
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json vite.config.ts postcss.config.cjs index.html ./
COPY src ./src
# Build stamp: the git commit the bundle was built from, surfaced in the About
# dialog (see CLAUDE.md "Build stamping"). Local builds pass VITE_COMMIT_HASH via
# frees.sh; Render auto-provides RENDER_GIT_COMMIT as a build arg.
ARG VITE_COMMIT_HASH=
ARG RENDER_GIT_COMMIT=
RUN VITE_COMMIT_HASH="${VITE_COMMIT_HASH:-${RENDER_GIT_COMMIT:-dev}}" npm run build

# Runtime stage: unprivileged nginx (runs as uid 101, listens on 8080)
# serves the static bundle and proxies /api to the backend.
FROM nginxinc/nginx-unprivileged:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
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
