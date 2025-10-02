#!/bin/bash
set -euo pipefail

echo "🧪 Testing Direct SSH Deployment Locally"
echo "========================================"

# Check if DO_PAT is set
if [ -z "${DO_PAT:-}" ]; then
    echo "❌ DO_PAT environment variable not set"
    echo "Please run: export DO_PAT='your_digitalocean_token'"
    exit 1
fi

# Check if SSH_PRIVATE_KEY_PATH is set
if [ -z "${SSH_PRIVATE_KEY_PATH:-}" ]; then
    echo "❌ SSH_PRIVATE_KEY_PATH environment variable not set"
    echo "Please run: export SSH_PRIVATE_KEY_PATH='path_to_your_private_key'"
    exit 1
fi

echo "✅ Environment variables set"

# Get droplet IP
echo "🔍 Finding droplet IP address..."
DROPLET_IP=$(curl -s -X GET \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DO_PAT" \
  "https://api.digitalocean.com/v2/droplets?tag_name=project:asset-archive" | \
  jq -r '.droplets[] | select(.name=="asset-archive-dev-app") | .networks.v4[] | select(.type=="public") | .ip_address')

if [ -z "$DROPLET_IP" ] || [ "$DROPLET_IP" = "null" ]; then
    echo "❌ Could not find droplet IP address"
    echo "Make sure your droplet is tagged with 'project:asset-archive'"
    exit 1
fi

echo "✅ Found droplet IP: $DROPLET_IP"

# Test SSH connection
echo "🔐 Testing SSH connection..."
if ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 -i "$SSH_PRIVATE_KEY_PATH" root@$DROPLET_IP "echo 'SSH connection successful'" 2>/dev/null; then
    echo "✅ SSH connection successful"
else
    echo "❌ SSH connection failed"
    echo "Check your SSH private key and droplet access"
    exit 1
fi

# Test container update
echo "🚀 Testing container update process..."
ssh -o StrictHostKeyChecking=no -i "$SSH_PRIVATE_KEY_PATH" root@$DROPLET_IP << 'EOF'
set -euo pipefail

echo "📍 Current directory: $(pwd)"
echo "📂 Checking for application directory..."

if [ ! -d "/opt/asset-archive" ]; then
    echo "❌ /opt/asset-archive directory not found"
    exit 1
fi

cd /opt/asset-archive
echo "✅ Found application directory"

echo "📄 Current docker-compose.yml images:"
grep "image:" docker-compose.yml || echo "No images found in docker-compose.yml"

echo "🐳 Current running containers:"
docker compose ps

echo "✅ Container update test complete!"
EOF

echo ""
echo "🎉 All tests passed! Direct SSH deployment is working."
echo "🌐 Your droplet IP: $DROPLET_IP"
echo "🔗 Frontend URL: http://$DROPLET_IP:3000"
echo "🔗 CMS Admin URL: http://$DROPLET_IP:1337/admin" 