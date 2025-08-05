@echo off
echo 🧹 Cleaning up Docker containers and volumes...

rem Stop and remove containers
docker-compose down

rem Remove any dangling containers
docker container prune -f

rem Remove any unused volumes (except postgres data)
for /f "tokens=*" %%i in ('docker volume ls -q -f dangling=true') do (
    echo %%i | findstr /v postgres > nul && docker volume rm %%i
)

echo 🚀 Starting fresh containers...

rem Start services
docker-compose up

echo ✅ Fresh Docker environment ready!