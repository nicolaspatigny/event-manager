FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm ci --no-audit --no-fund
COPY . .
RUN npm run build
FROM nginx:stable-alpine
COPY --chmod=644 nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
RUN chown -R nginx:nginx /usr/share/nginx/html
USER nginx
EXPOSE 8080
ENTRYPOINT ["nginx", "-g", "daemon off;"]
