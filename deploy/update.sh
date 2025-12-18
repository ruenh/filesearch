#!/bin/bash
# Quick update script - run on server to pull latest changes

set -e

APP_DIR="/var/www/filesearch"
cd $APP_DIR

echo "Pulling latest changes..."
git pull origin main

echo "Updating Python dependencies..."
source venv/bin/activate
pip install -r requirements.txt

echo "Rebuilding frontend..."
cd frontend
npm install
npm run build
cd ..

echo "Restarting services..."
systemctl restart filesearch
systemctl restart nginx

echo "Done! Check status with: systemctl status filesearch"
