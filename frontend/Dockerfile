FROM node:20-alpine AS build
WORKDIR /app

# DNS가 가끔 끊겨도 빌드가 버티도록: 재시도 늘리고, 동시 연결을 줄이고(getaddrinfo 폭주 방지), 타임아웃 여유
RUN npm config set fetch-retries 8 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm config set fetch-timeout 600000

COPY package.json ./
RUN npm install --include=dev --registry=https://registry.npmjs.org/ --maxsockets 3 --no-audit --no-fund

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
