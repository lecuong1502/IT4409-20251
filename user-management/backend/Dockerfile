FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies (copy package.json first for caching)
COPY package*.json ./

# Use npm ci when package-lock.json is present, otherwise npm install
RUN if [ -f package-lock.json ]; then npm ci --only=production; else npm install --only=production; fi

# Copy application source
COPY . .

# Default port
ENV PORT=3001

EXPOSE 3001

# Start the server
CMD ["node", "server.js"]
