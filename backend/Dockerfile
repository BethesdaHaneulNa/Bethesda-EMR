FROM node:20-alpine
WORKDIR /app

# pg_dump for the backup service (matches the postgres:16 server)
RUN apk add --no-cache postgresql16-client

RUN npm config set fetch-retries 8 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm config set fetch-timeout 600000

# The lockfile pins every dependency (see NOTICE); npm ci installs exactly that.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --registry=https://registry.npmjs.org/ --maxsockets 3 --no-audit --no-fund

COPY . .
EXPOSE 3000
CMD ["node", "src/index.js"]
