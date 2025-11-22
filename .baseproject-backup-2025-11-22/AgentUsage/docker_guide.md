# Docker Guide for Python Projects

## Overview

### When to Use Docker
- Ensuring consistent environments across development, staging, and production
- Isolating application dependencies from the host system
- Simplifying deployment and scaling
- Running multiple versions of Python or dependencies side-by-side
- Creating reproducible builds

### Benefits
- **Consistency**: Same environment everywhere
- **Isolation**: No dependency conflicts
- **Portability**: Run anywhere Docker runs
- **Efficiency**: Faster than VMs, shares host OS kernel
- **Scalability**: Easy to replicate and orchestrate

## Quick Reference

```bash
# Build an image
docker build -t my-app:latest .

# Run a container
docker run -d -p 8000:8000 --name my-app my-app:latest

# View running containers
docker ps

# View logs
docker logs my-app

# Execute command in container
docker exec -it my-app bash

# Stop and remove container
docker stop my-app && docker rm my-app

# Remove image
docker rmi my-app:latest

# Clean up unused resources
docker system prune -a
```

## Basic Dockerfile

### Simple Example

```dockerfile
# Use official Python base image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install UV (see uv_usage.md for details)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy dependency files first (better layer caching)
COPY pyproject.toml uv.lock ./

# Install dependencies
RUN uv sync --frozen --no-dev

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run the application
CMD ["uv", "run", "python", "main.py"]
```

### .dockerignore File

```
# .dockerignore
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
*.so
*.egg
*.egg-info/
dist/
build/
.git/
.gitignore
.env
.venv/
venv/
*.log
.DS_Store
.pytest_cache/
.coverage
htmlcov/
*.md
tests/
docs/
```

## Multi-Stage Builds

### Why Use Multi-Stage Builds?
- **Smaller final images**: Only include runtime dependencies (50-70% size reduction)
- **Better security**: Fewer tools in production image
- **Faster deployments**: Less data to transfer

### Optimized Production Example

```dockerfile
# Stage 1: Builder
FROM python:3.11-slim AS builder

WORKDIR /app

# Install UV
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies into virtual environment
RUN uv sync --frozen --no-dev

# Copy application code
COPY . .

# Stage 2: Runtime
FROM python:3.11-slim

WORKDIR /app

# Create non-root user
RUN useradd -m -u 1000 appuser && chown appuser:appuser /app

# Copy only necessary files from builder
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app /app

# Switch to non-root user
USER appuser

# Use the virtual environment
ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000

CMD ["python", "main.py"]
```

## Docker Compose

### When to Use Docker Compose
- Running multiple containers together (app + database + cache)
- Development environments with multiple services
- Simplified container orchestration

### Essential Example (App + Database)

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/myapp
    depends_on:
      - db
    volumes:
      - ./app:/app  # Development: mount code for live reload

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=myapp
    volumes:
      - postgres_data:/var/lib/postgresql/data  # Persist database
    ports:
      - "5432:5432"

volumes:
  postgres_data:  # Named volume for data persistence
```

### Common Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# Run command in service
docker-compose exec app bash

# Remove volumes (careful: deletes data)
docker-compose down -v
```

## Best Practices

### Layer Caching
Order Dockerfile commands from least to most frequently changing:

```dockerfile
# Good: Dependencies cached separately from code
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY . .

# Bad: Cache invalidated on every code change
COPY . .
RUN uv sync --frozen --no-dev
```

### Security Essentials
- **Use official base images** (e.g., `python:3.11-slim`)
- **Run as non-root user** (see multi-stage example above)
- **Don't include secrets in images** (use runtime env vars)
- **Keep images updated** (rebuild regularly with latest base images)
- **Multi-stage builds** to minimize attack surface

### Image Size Optimization
```dockerfile
# Use slim base images
FROM python:3.11-slim  # Not python:3.11 (400MB smaller)

# Combine RUN commands to reduce layers
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Use multi-stage builds (see example above)
```

## Volumes and Data Persistence

### Volume Types

**Named Volumes** (recommended for data persistence):
```bash
docker run -v postgres_data:/var/lib/postgresql/data postgres:15-alpine
```

**Bind Mounts** (for development):
```bash
docker run -v $(pwd)/app:/app my-app:dev  # Live code reload
```

### Volume Management
```bash
# List volumes
docker volume ls

# Remove unused volumes
docker volume prune

# Inspect volume
docker volume inspect postgres_data

# Backup volume data
docker run --rm -v postgres_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/data-backup.tar.gz /data
```

## Secrets Management

### Runtime Secrets (Recommended)

```bash
# Pass secrets at runtime via environment variables
docker run -e DATABASE_URL=$(cat secrets.json | jq -r '.database_url') my-app

# Or use env file
docker run --env-file .env.production my-app

# With Docker Compose
# docker-compose.yml
services:
  app:
    env_file:
      - .env.production
```

**Important**: See `secrets_management.md` for comprehensive patterns. Never build secrets into images.

## Debugging and Troubleshooting

### Common Issues and Solutions

**Container exits immediately**
```bash
# Check logs for errors
docker logs container_name

# Run interactively to debug
docker run -it app:v1 bash
```

**Can't connect to container**
```bash
# Verify port mapping
docker ps

# Check container network
docker inspect container_name | grep -A 10 ExposedPorts
```

**Dependencies not found**
```bash
# Exec into container
docker exec -it container_name bash

# Check installed packages
uv pip list
```

**Out of disk space**
```bash
# Check disk usage
docker system df

# Clean up everything unused
docker system prune -a --volumes
```

### Essential Debug Commands

```bash
# Interactive shell in running container
docker exec -it container_name bash

# View real-time logs
docker logs -f --tail 100 container_name

# Inspect container configuration
docker inspect container_name

# Monitor resource usage
docker stats container_name

# Copy files from/to container
docker cp container_name:/app/logs ./logs
docker cp ./config.json container_name:/app/
```

## Common Commands Reference

| Command | Purpose |
|---------|---------|
| `docker build -t app:v1 .` | Build image |
| `docker run -d -p 8000:8000 app:v1` | Run container (detached) |
| `docker ps -a` | List all containers |
| `docker logs -f container_name` | View container logs |
| `docker exec -it app bash` | Execute command in container |
| `docker stop container_name` | Stop running container |
| `docker rm container_name` | Remove container |
| `docker rmi app:v1` | Remove image |
| `docker system prune -a` | Clean up unused resources |
| `docker-compose up -d` | Start all services |
| `docker-compose down -v` | Stop services and remove volumes |

## Related Guides
- **UV Usage**: See `uv_usage.md` for detailed UV package management and Docker integration
- **Secrets Management**: See `secrets_management.md` for secure API key handling
- **CI/CD**: See `ci_cd_patterns.md` for Docker in deployment pipelines

---

*Last updated: 2025-10-19*
