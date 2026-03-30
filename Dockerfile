FROM node:20-alpine

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

# Start from root
WORKDIR /app
EXPOSE 5000

CMD ["node", "backend/src/index.js"]
