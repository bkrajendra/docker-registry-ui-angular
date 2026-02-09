# Build stage
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime stage (based on original docker-registry-ui Dockerfile)
FROM nginx:alpine-slim
LABEL maintainer="Docker Registry UI Angular"

WORKDIR /usr/share/nginx/html/

# Copy built Angular app (browser output)
COPY --from=build /app/dist/docker-registry-ui-angular/browser/ /usr/share/nginx/html/

# Nginx config (proxy to registry enabled at runtime when NGINX_PROXY_PASS_URL is set)
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Entrypoint: generate config.js from env vars and optionally patch nginx for proxy
COPY bin/entrypoint.sh /docker-entrypoint.d/90-docker-registry-ui-angular.sh
RUN chmod +x /docker-entrypoint.d/90-docker-registry-ui-angular.sh

RUN chown -R nginx:nginx /usr/share/nginx/html/

ENV NGINX_LISTEN_PORT=80
EXPOSE 80
