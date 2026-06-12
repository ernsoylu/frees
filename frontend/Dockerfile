# Build stage: compile the React app.
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json vite.config.ts postcss.config.cjs index.html ./
COPY src ./src
RUN npm run build

# Runtime stage: unprivileged nginx (runs as uid 101, listens on 8080)
# serves the static bundle and proxies /api to the backend.
FROM nginxinc/nginx-unprivileged:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
