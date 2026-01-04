---
description: Deploy to Tencent Cloud via Docker
---

# Tencent Cloud Deployment Guide (Lighthouse/CVM)

This guide walks you through deploying the Nano Logistics Scheduler application to a Tencent Cloud server (Lightweight Application Server or CVM).

## Prerequisites

1.  **Tencent Cloud Server**: A server running Ubuntu 20.04/22.04 or CentOS 7+. 
    *   *Recommended: Lightweight Application Server (Lighthouse) - Ubuntu 22.04 LTS.*
2.  **Domain Name (Optional)**: For easier access (e.g., `scheduler.yourdomain.com`).
3.  **SSH Access**: You can connect to your server terminal.

## Step 1: Prepare the Server

Connect to your server via SSH:

```bash
ssh root@your_server_ip
```

### 1.1 Install Docker & Docker Compose

Run the following commands to install Docker:

```bash
# Update package index
apt-get update

# Install prerequisites
apt-get install -y ca-certificates curl gnupg

# Add Docker's official GPG key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Set up the repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verify installation
docker compose version
```

## Step 2: Deploy Application

### 2.1 Upload Project Files

You can use SCP, SFTP, or Git to upload your project. Since your project is local, let's assume you create a folder `/opt/nano`:

```bash
mkdir -p /opt/nano
cd /opt/nano
```

Copy the following files from your local machine to `/opt/nano` on the server:
- `docker-compose.yml`
- `Dockerfile`
- `package.json`
- `package-lock.json`
- `next.config.js`
- `tsconfig.json`
- `postcss.config.js`
- `tailwind.config.ts`
- `public/` (directory)
- `app/` (directory)
- `components/` (directory)
- `config/` (directory)
- `lib/` (directory)
- `types/` (directory)
- `store/` (directory)
- `data/` (directory - optional, creates automatically)

*Tip: You can zip your local project (excluding `node_modules` and `.next`) and upload it via `scp`.*

### 2.2 Configure Environment Variables

Create a `.env` file on the server:

```bash
nano .env
```

Paste your production configuration. **Important: Generate a new random secret for `ADMIN_SESSION_SECRET`.**

```env
# Production Environment Variables

# Amap Maps (Use Web Service Key)
AMAP_KEY=your_amap_web_service_key
# JS API Key (Configured with domain whitelist matching your cloud IP/domain)
NEXT_PUBLIC_AMAP_JS_KEY=your_amap_js_api_key
# Security Code (If needed)
NEXT_PUBLIC_AMAP_SECURITY_CODE=

# App Config
NEXT_PUBLIC_APP_NAME=Nano Scheduler
DEPOT_NAME=Jiangsu Factory
DEPOT_ADDRESS=...
DEPOT_LNG=121.2367
DEPOT_LAT=31.2156

# Core Secrets
# Generate a new one with: openssl rand -hex 32
ADMIN_SESSION_SECRET=create_a_new_long_random_string_here

# Initial Admin Password (Optional, only for first run)
ADMIN_BOOTSTRAP_PASSWORD=your_secure_password
```

Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

### 2.3 Start the Service

In the `/opt/nano` directory:

```bash
# Build and start in detached mode
docker compose up -d --build
```

Check status:

```bash
docker compose ps
docker compose logs -f
```

## Step 3: Configure Network & Security

### 3.1 Open Firewall Ports (Tencent Cloud Console)

1.  Go to **Tencent Cloud Console** -> **Lighthouse** (or CVM) -> **Firewall**.
2.  Add Rule:
    *   **Protocol**: TCP
    *   **Port**: `3000` (Direct access) OR `80/443` (If using Nginx)
    *   **Source**: `0.0.0.0/0` (Allow all)

Now you should be able to access your app at `http://your_server_ip:3000`.

## Step 4: (Optional) Setup Nginx & HTTPS

For a professional setup, use Nginx as a reverse proxy to use standard port 80/443 and SSL.

1.  Install Nginx: `apt install -y nginx`
2.  Create config: `nano /etc/nginx/sites-available/nano`

```nginx
server {
    listen 80;
    server_name your_domain.com; # Or your IP if no domain

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3.  Enable site:
    ```bash
    ln -s /etc/nginx/sites-available/nano /etc/nginx/sites-enabled/
    rm /etc/nginx/sites-enabled/default
    nginx -t
    systemctl restart nginx
    ```

## Maintenance

-   **Update App**: Upload new code, then run `docker compose up -d --build`.
-   **Backup Data**: Download the `/opt/nano/data` directory locally.

