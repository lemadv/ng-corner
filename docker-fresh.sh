#!/bin/bash

echo "🧹 Cleaning up Docker containers and volumes..."

# Stop and remove containers
docker-compose down

# Remove any dangling containers
docker container prune -f

# Remove any unused volumes (except postgres data)
docker volume ls -q -f dangling=true | grep -v postgres | xargs -r docker volume rm

echo "🚀 Starting fresh containers..."

# Start services
docker-compose up

echo "✅ Fresh Docker environment ready!"