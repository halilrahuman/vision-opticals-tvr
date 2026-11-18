# Production Dockerfile for Vision Opticals
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install build dependencies for sqlite3 / native binaries if needed
RUN apk add --no-cache python3 make g++

# Copy package descriptors
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application source code
COPY . .

# Ensure data and upload directories exist
RUN mkdir -p /app/data /app/public/uploads

# Expose server port
EXPOSE 5000

# Environment defaults
ENV PORT=5000
ENV NODE_ENV=production

# Start production server
CMD ["node", "server/index.js"]
