#!/usr/bin/env bash
# Runs locally — SSHes into the new server and does everything
set -euo pipefail

SERVER="91.147.105.14"
USER="admin"
KEY="/Users/sanzhar/projects/wavevizual/root.pem"
SSH="ssh -o StrictHostKeyChecking=no -i $KEY $USER@$SERVER"
SCP="scp -o StrictHostKeyChecking=no -i $KEY"
PROJECT="/Users/sanzhar/projects/wavevizual"

echo "=== [1/5] Installing Docker ==="
$SSH "curl -fsSL https://get.docker.com | sudo sh && sudo usermod -aG docker \$USER"

echo "=== [2/5] Installing k3s with extended NodePort range ==="
$SSH "curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC='--service-node-port-range 7000-9000' sudo sh -"
$SSH "sudo chmod 644 /etc/rancher/k3s/k3s.yaml"
$SSH "mkdir -p \$HOME/.kube && sudo cp /etc/rancher/k3s/k3s.yaml \$HOME/.kube/config && sudo chown \$USER:\$USER \$HOME/.kube/config"

echo "=== [3/5] Uploading project ==="
$SSH "rm -rf \$HOME/wavevizual && mkdir \$HOME/wavevizual"
tar -czf /tmp/wavevizual.tar.gz \
  --exclude='./storage' \
  --exclude='./.git' \
  --exclude='./frontend/node_modules' \
  --exclude='./backend/__pycache__' \
  --exclude='./backend/.venv' \
  -C "$PROJECT" .
$SCP /tmp/wavevizual.tar.gz $USER@$SERVER:~/wavevizual.tar.gz
$SSH "cd \$HOME/wavevizual && tar -xzf \$HOME/wavevizual.tar.gz && chmod +x k8s/deploy.sh"

echo "=== [4/5] Running deploy ==="
$SSH "cd \$HOME/wavevizual && bash k8s/deploy.sh"

echo "=== [5/5] Done ==="
