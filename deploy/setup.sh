#!/bin/bash
# Deployment script for File Search RAG
# Run as root on Ubuntu/Debian VDS

set -e

DOMAIN="filesearch.odindindindun.ru"
APP_DIR="/var/www/filesearch"
REPO_URL="https://github.com/ruenh/filesearch.git"

echo "=== File Search RAG Deployment ==="

# Update system
echo "Updating system..."
apt update && apt upgrade -y

# Install dependencies
echo "Installing dependencies..."
apt install -y python3 python3-pip python3-venv nginx certbot python3-certbot-nginx git nodejs npm

# Create app directory
echo "Creating app directory..."
mkdir -p $APP_DIR
cd $APP_DIR

# Clone repository
if [ -d ".git" ]; then
    echo "Pulling latest changes..."
    git pull origin main
else
    echo "Cloning repository..."
    git clone $REPO_URL .
fi

# Setup Python virtual environment
echo "Setting up Python environment..."
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn eventlet

# Setup frontend
echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Create uploads directory
mkdir -p uploads
chown -R www-data:www-data uploads

# Setup environment file
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp deploy/.env.production .env
    # Generate random secrets
    SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
    JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
    sed -i "s/CHANGE_THIS_TO_RANDOM_STRING_32_CHARS/$SECRET_KEY/" .env
    sed -i "s/CHANGE_THIS_TO_ANOTHER_RANDOM_STRING/$JWT_SECRET/" .env
    echo "!!! IMPORTANT: Edit /var/www/filesearch/.env and add your GEMINI_API_KEY !!!"
fi

# Initialize database
echo "Initializing database..."
source venv/bin/activate
python3 -c "from backend.app import create_app; from backend.extensions import db; app = create_app('production'); app.app_context().push(); db.create_all()"

# Set permissions
chown -R www-data:www-data $APP_DIR

# Setup systemd service
echo "Setting up systemd service..."
cp deploy/filesearch.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable filesearch
systemctl restart filesearch

# Setup nginx
echo "Setting up nginx..."
cp deploy/nginx.conf /etc/nginx/sites-available/filesearch
ln -sf /etc/nginx/sites-available/filesearch /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx config
nginx -t

# Get SSL certificate
echo "Getting SSL certificate..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN || true

# Restart services
systemctl restart nginx
systemctl restart filesearch

echo ""
echo "=== Deployment Complete ==="
echo "Your app should be available at: https://$DOMAIN"
echo ""
echo "Next steps:"
echo "1. Edit /var/www/filesearch/.env and add your GEMINI_API_KEY"
echo "2. Restart the service: systemctl restart filesearch"
echo "3. Check status: systemctl status filesearch"
echo "4. View logs: journalctl -u filesearch -f"
