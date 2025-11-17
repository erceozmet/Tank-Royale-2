#!/bin/bash
set -e

# Tank Royale 2 - Server Setup Script
# This script sets up a fresh Ubuntu server for production deployment

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          Tank Royale 2 - Server Setup Script              ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Error: This script must be run as root${NC}"
    echo "Run with: sudo $0"
    exit 1
fi

echo -e "${BLUE}[1/10] Updating system...${NC}"
apt update && apt upgrade -y
echo -e "${GREEN}✓ System updated${NC}"
echo ""

echo -e "${BLUE}[2/10] Installing Docker...${NC}"
# Install Docker
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo -e "${GREEN}✓ Docker installed${NC}"
else
    echo -e "${YELLOW}Docker already installed${NC}"
fi

# Install Docker Compose plugin
apt install -y docker-compose-plugin
echo -e "${GREEN}✓ Docker Compose installed${NC}"
echo ""

echo -e "${BLUE}[3/10] Installing additional tools...${NC}"
apt install -y git nginx certbot python3-certbot-nginx ufw fail2ban \
    curl wget htop vim unzip jq
echo -e "${GREEN}✓ Additional tools installed${NC}"
echo ""

echo -e "${BLUE}[4/10] Configuring firewall...${NC}"
# Configure UFW
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   comment 'SSH'
ufw allow 80/tcp   comment 'HTTP'
ufw allow 443/tcp  comment 'HTTPS'
ufw allow 3001/tcp comment 'Grafana'
ufw --force enable
echo -e "${GREEN}✓ Firewall configured${NC}"
echo ""

echo -e "${BLUE}[5/10] Setting up fail2ban...${NC}"
# Configure fail2ban for SSH protection
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
backend = %(sshd_backend)s
EOF

systemctl enable fail2ban
systemctl restart fail2ban
echo -e "${GREEN}✓ fail2ban configured${NC}"
echo ""

echo -e "${BLUE}[6/10] Configuring automatic security updates...${NC}"
apt install -y unattended-upgrades
dpkg-reconfigure --priority=low unattended-upgrades
echo -e "${GREEN}✓ Automatic security updates enabled${NC}"
echo ""

echo -e "${BLUE}[7/10] Creating deployment user...${NC}"
# Create deploy user if it doesn't exist
if ! id -u deploy &>/dev/null; then
    adduser --disabled-password --gecos "" deploy
    usermod -aG docker deploy
    usermod -aG sudo deploy
    
    # Setup SSH for deploy user
    mkdir -p /home/deploy/.ssh
    if [ -f /root/.ssh/authorized_keys ]; then
        cp /root/.ssh/authorized_keys /home/deploy/.ssh/
    fi
    chown -R deploy:deploy /home/deploy/.ssh
    chmod 700 /home/deploy/.ssh
    chmod 600 /home/deploy/.ssh/authorized_keys 2>/dev/null || true
    
    echo -e "${GREEN}✓ Deploy user created${NC}"
else
    echo -e "${YELLOW}Deploy user already exists${NC}"
fi
echo ""

echo -e "${BLUE}[8/10] Setting up deployment directory...${NC}"
# Create deployment directory
su - deploy -c "mkdir -p /home/deploy/Tank-Royale-2"
echo -e "${GREEN}✓ Deployment directory created${NC}"
echo ""

echo -e "${BLUE}[9/10] Configuring swap...${NC}"
# Add swap if not exists (helps with memory management)
if ! swapon --show | grep -q '/swapfile'; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
    echo -e "${GREEN}✓ Swap configured (2GB)${NC}"
else
    echo -e "${YELLOW}Swap already configured${NC}"
fi
echo ""

echo -e "${BLUE}[10/10] Optimizing system settings...${NC}"
# Optimize network settings for gaming
cat >> /etc/sysctl.conf << 'EOF'

# Tank Royale 2 optimizations
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 87380 67108864
net.ipv4.tcp_wmem = 4096 65536 67108864
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_congestion_control = bbr
net.core.default_qdisc = fq
EOF

sysctl -p
echo -e "${GREEN}✓ System settings optimized${NC}"
echo ""

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║            Server Setup Completed Successfully!            ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Switch to deploy user:"
echo "   su - deploy"
echo ""
echo "2. Clone the repository:"
echo "   git clone https://github.com/yourusername/Tank-Royale-2.git"
echo "   cd Tank-Royale-2"
echo ""
echo "3. Create .env.production file:"
echo "   nano .env.production"
echo "   (Add all required environment variables)"
echo ""
echo "4. Setup SSL certificate:"
echo "   sudo certbot certonly --standalone -d yourdomain.com"
echo "   sudo ln -s /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/"
echo "   sudo ln -s /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/"
echo ""
echo "5. Deploy the application:"
echo "   ./scripts/deploy-production.sh"
echo ""
echo -e "${BLUE}Security reminders:${NC}"
echo "• Change deploy user password: sudo passwd deploy"
echo "• Disable root SSH login (edit /etc/ssh/sshd_config)"
echo "• Setup monitoring alerts"
echo "• Configure database backups"
echo ""
