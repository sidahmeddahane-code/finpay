FROM node:20-alpine

RUN apk add --no-cache openssl openssl-dev

WORKDIR /app

# Copy everything
COPY . .

# Build frontend
WORKDIR /app/frontend
RUN npm install
RUN npm run build

# Install backend dependencies and generate Prisma client
WORKDIR /app/backend
RUN npm install
RUN npx prisma generate

# Go back to root
WORKDIR /app

EXPOSE 5000

# Push DB schema then start server
CMD ["sh", "-c", "cd /app/backend && npx prisma db push --accept-data-loss && node src/index.js"]
