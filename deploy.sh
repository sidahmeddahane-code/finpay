#!/bin/bash
echo "🚀 Starting FinPay Deployment..."

# Pulldown new code from GitHub main branch
echo "⬇️ Pulling from GitHub..."
git pull origin main

# Stop and rebuild the containers
echo "🔄 Rebuilding Docker Containers..."
docker compose down
docker compose up -d --build

echo "✅ Deployment Successful! FinPay is now Live."
