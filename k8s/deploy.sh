#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$HOME/wavevizual"
cd "$PROJECT_DIR"

echo "=== Building Docker images ==="
docker build -t wavevizual-backend:latest ./backend
docker build -t wavevizual-frontend:latest ./frontend

echo "=== Importing images into k3s containerd ==="
docker save wavevizual-backend:latest | sudo k3s ctr images import -
docker save wavevizual-frontend:latest | sudo k3s ctr images import -

echo "=== Applying manifests ==="
sudo kubectl apply -f k8s/namespace.yaml
sudo kubectl apply -f k8s/storage-pvc.yaml
sudo kubectl apply -f k8s/backend-deployment.yaml
sudo kubectl apply -f k8s/frontend-deployment.yaml

echo "=== Waiting for pods to be ready ==="
sudo kubectl rollout status deployment/backend  -n wavevizual --timeout=120s
sudo kubectl rollout status deployment/frontend -n wavevizual --timeout=120s

echo ""
echo "=== Done ==="
sudo kubectl get pods -n wavevizual
echo ""
echo "Frontend : http://$(curl -s ifconfig.me):7777"
echo "Backend  : http://$(curl -s ifconfig.me):8888"
