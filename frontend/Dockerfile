FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 5173

# Default command
CMD ["sh", "-c", "npm install && npm run dev -- --host 0.0.0.0"]
