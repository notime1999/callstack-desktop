# Frontend Dockerfile (Web version served via nginx)
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./
COPY apps/desktop/package.json ./apps/desktop/

# Install dependencies
RUN npm install --workspace=@tactical-voice/desktop

# Copy source
COPY apps/desktop ./apps/desktop
COPY tsconfig.base.json ./

# Build Angular app
WORKDIR /app/apps/desktop
RUN npm run build:angular:prod

# Production stage with nginx
FROM nginx:alpine

# Copy built app
COPY --from=builder /app/apps/desktop/dist /usr/share/nginx/html

# Copy nginx config
COPY apps/desktop/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
