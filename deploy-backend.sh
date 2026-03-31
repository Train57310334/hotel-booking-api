#!/bin/bash

# deploy-backend.sh - Setup & Update Script for Backend (NestJS)
# Run this script from the root of your project: bash deploy-backend.sh

set -e # Exit on error

echo "🚀 Starting Node.js Backend Deployment..."

# Directories
ROOT_DIR=$(pwd)
BACKEND_DIR="$ROOT_DIR/hotel-booking-nest-postgres"

echo "📂 Root Directory: $ROOT_DIR"

if [ ! -d "$BACKEND_DIR" ]; then
    echo "❌ Error: Backend folder not found at $BACKEND_DIR"
    exit 1
fi

cd "$BACKEND_DIR"

echo "⬇️  Pulling latest backend code..."
git pull || echo "⚠️  Git pull failed or not a git repository. Continuing anyway..."

echo "📦 Installing backend dependencies..."
npm install

echo "🗄️  Running database migrations..."
npx prisma generate
npx prisma db push --accept-data-loss || echo "⚠️  DB Push had issues, check your database connection."

echo "🏗️  Building NestJS API..."
npm run build

echo "🔄 Restarting API Service (using PM2)..."
if ! command -v pm2 &> /dev/null
then
    echo "⚠️  pm2 could not be found. Please install it with 'npm install -g pm2' for background running."
    echo "⚠️  Skipping pm2 restart. You can start it manually with 'npm run start:prod'."
else
    pm2 restart hotel-api || pm2 start dist/main.js --name "hotel-api"
    pm2 save
fi

echo "✅ Backend Updated Successfully!"
cd "$ROOT_DIR"
