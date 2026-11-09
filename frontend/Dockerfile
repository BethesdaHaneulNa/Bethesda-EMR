FROM node:20-alpine AS build
WORKDIR /app

# So a build survives a flaky DNS: more retries, fewer parallel connections, longer timeouts.
RUN npm config set fetch-retries 8 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm config set fetch-timeout 600000

# The lockfile pins every dependency (see NOTICE); npm ci installs exactly that.
COPY package.json package-lock.json ./
RUN npm ci --include=dev --registry=https://registry.npmjs.org/ --maxsockets 3 --no-audit --no-fund

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
