# Multi-stage build for React app

# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files
COPY apps/frontend/package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY apps/frontend/ .

# Build the app
RUN npm run build

# Development stage
FROM node:18-alpine AS development

WORKDIR /app

# Copy package files
COPY apps/frontend/package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm install

# Copy source code
COPY apps/frontend/ .

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "start"]

# Production stage
FROM nginx:alpine AS production

# Copy build files to nginx
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom nginx config
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"] 