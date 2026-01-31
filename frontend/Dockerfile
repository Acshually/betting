FROM node:20-alpine

WORKDIR /app

# Only copy package files first for better caching
COPY package*.json ./
RUN npm install

# Copy the source code
COPY . .

EXPOSE 5173

# Vite requires the --host flag to accept external traffic
CMD ["npm", "run", "dev", "--", "--host"]