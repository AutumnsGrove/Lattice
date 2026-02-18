---
title: Setting Up Woodpecker CI with Codeberg
description: Step-by-step guide to migrating from GitHub Actions to Woodpecker on Codeberg
lastUpdated: "2026-02-02"
---

# Setting Up Woodpecker CI with Codeberg

> Phase 1 of Firefly CI: Get Codeberg CI working with a static Woodpecker instance.

## Prerequisites

- Codeberg account with your repository migrated
- Hetzner Cloud account (or other VPS provider)
- Domain or subdomain for Woodpecker (optional but recommended)
- Docker installed locally (for testing)

## Step 1: Provision the Server

**Recommended:** Hetzner CX21 (2 vCPU, 4GB RAM, €6.72/month)

```bash
# Create server via Hetzner Console or CLI
# OS: Ubuntu 22.04 LTS
# Location: Nuremberg (closest to Codeberg's Germany servers)
# Add your SSH key

# SSH into the server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Install Docker Compose
apt install docker-compose-plugin -y
```

## Step 2: Configure DNS (Optional but Recommended)

Point a subdomain at your server:

```
ci.grove.place    A    your-server-ip
```

This lets you access Woodpecker at `https://ci.grove.place` instead of an IP address.

## Step 3: Create Woodpecker Configuration

```bash
mkdir -p /opt/woodpecker
cd /opt/woodpecker

# Generate secrets
WOODPECKER_AGENT_SECRET=$(openssl rand -hex 32)
WOODPECKER_AGENT_SECRET=$WOODPECKER_AGENT_SECRET

echo "Agent secret: $WOODPECKER_AGENT_SECRET"
```

Create `docker-compose.yml`:

```yaml
version: "3"

services:
  woodpecker-server:
    image: woodpeckerci/woodpecker-server:latest
    restart: always
    ports:
      - "80:8000"
      - "443:8443" # If using HTTPS
    volumes:
      - woodpecker-server-data:/var/lib/woodpecker
    environment:
      # Core settings
      - WOODPECKER_OPEN=true
      - WOODPECKER_HOST=${WOODPECKER_HOST}
      - WOODPECKER_AGENT_SECRET=${WOODPECKER_AGENT_SECRET}

      # Codeberg (Forgejo) integration
      - WOODPECKER_FORGEJO=true
      - WOODPECKER_FORGEJO_URL=https://codeberg.org
      - WOODPECKER_FORGEJO_CLIENT=${WOODPECKER_FORGEJO_CLIENT}
      - WOODPECKER_FORGEJO_SECRET=${WOODPECKER_FORGEJO_SECRET}

      # Admin user (your Codeberg username)
      - WOODPECKER_ADMIN_AUTHS=${WOODPECKER_ADMIN}

      # Optional: GitHub migration helpers
      - WOODPECKER_DEFAULT_CANCEL_PREVIOUS_PIPELINE_EVENTS=pull_request,push
      - WOODPECKER_ENABLE_SWAGGER=true

  woodpecker-agent:
    image: woodpeckerci/woodpecker-agent:latest
    restart: always
    depends_on:
      - woodpecker-server
    volumes:
      - woodpecker-agent-config:/etc/woodpecker
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - WOODPECKER_SERVER=woodpecker-server:9000
      - WOODPECKER_AGENT_SECRET=${WOODPECKER_AGENT_SECRET}
      - WOODPECKER_MAX_WORKFLOWS=2 # Parallel jobs
      - WOODPECKER_LABELS=type=static

volumes:
  woodpecker-server-data:
  woodpecker-agent-config:
```

Create `.env` file:

```bash
# .env
WOODPECKER_HOST=https://ci.grove.place
WOODPECKER_AGENT_SECRET=your-generated-secret-here
WOODPECKER_FORGEJO_CLIENT=will-get-this-next
WOODPECKER_FORGEJO_SECRET=will-get-this-next
WOODPECKER_ADMIN=AutumnsGrove
```

## Step 4: Register OAuth App on Codeberg

1. Go to https://codeberg.org/user/settings/applications
2. Click "Create Application"
3. Fill in:
   - **Application Name:** Woodpecker CI
   - **Redirect URI:** `https://ci.grove.place/authorize`
   - **Scopes:** `repo`, `user:email`
4. Save the **Client ID** and **Client Secret**
5. Update your `.env` file with these values

## Step 5: Start Woodpecker

```bash
cd /opt/woodpecker
docker compose up -d

# Check logs
docker logs -f woodpecker-woodpecker-server-1
```

Visit `https://ci.grove.place` (or your IP) and log in with Codeberg.

## Step 6: Enable Your Repository

1. In Woodpecker UI, go to "Repositories"
2. Click "Add Repository"
3. Find `AutumnsGrove/Lattice`
4. Click "Enable"

## Step 7: Create Your First Pipeline

Create `.woodpecker.yml` in your repository root:

```yaml
workspace:
  base: /app
  path: .

steps:
  install:
    image: node:20
    commands:
      - npm ci

  typecheck:
    image: node:20
    commands:
      - npm run typecheck --all

  test:
    image: node:20
    commands:
      - npm test --all
    # Only run tests if typecheck passes
    depends_on: [typecheck]

  build:
    image: node:20
    commands:
      - npm run build --all
    depends_on: [install]

  deploy-dry-run:
    image: node:20
    commands:
      - npx wrangler deploy --dry-run
    when:
      event: pull_request

  deploy:
    image: node:20
    commands:
      - npx wrangler deploy
    secrets:
      - CLOUDFLARE_API_TOKEN
    when:
      branch: main
      event: push
```

## Step 8: Add Secrets

In Woodpecker UI:

1. Go to your repository → Settings → Secrets
2. Add `CLOUDFLARE_API_TOKEN`
3. Value: Your Cloudflare API token with Workers and Pages permissions

## Step 9: Test the Pipeline

Push the `.woodpecker.yml` to Codeberg:

```bash
git add .woodpecker.yml
git commit -m "ci: add Woodpecker pipeline"
git push codeberg main
```

Check Woodpecker UI for the running pipeline.

## Migrating from GitHub Actions

### Common Patterns

| GitHub Actions                | Woodpecker                       |
| ----------------------------- | -------------------------------- |
| `on: [push, pull_request]`    | No change (default)              |
| `runs-on: ubuntu-latest`      | `image: node:20` (or any image)  |
| `steps:`                      | `steps:`                         |
| `uses: actions/checkout@v4`   | Automatic (workspace mounted)    |
| `uses: actions/setup-node@v4` | Use image with Node preinstalled |
| `env:`                        | `environment:`                   |
| `secrets.GITHUB_TOKEN`        | No equivalent (use deploy keys)  |
| `matrix:`                     | `matrix:` (similar syntax)       |

### Example: Matrix Builds

```yaml
# .woodpecker.yml
matrix:
  NODE_VERSION:
    - 18
    - 20
    - 22

steps:
  test:
    image: node:${NODE_VERSION}
    commands:
      - npm ci
      - npm test
```

### Example: Conditional Steps

```yaml
steps:
  notify:
    image: alpine/curl
    commands:
      - curl -X POST https://notify.grove.place
    when:
      status: [failure]
      event: push
      branch: main
```

## Troubleshooting

### Pipeline not triggering

1. Check Woodpecker logs: `docker logs woodpecker-woodpecker-server-1`
2. Verify webhook is set up in Codeberg repo settings
3. Ensure `.woodpecker.yml` is in root of default branch

### Permission denied on Docker socket

```bash
# On the host
chmod 666 /var/run/docker.sock
# Or add woodpecker-agent to docker group (more secure)
```

### Out of disk space

```bash
# Clean up Docker
docker system prune -a

# Add more storage or cleanup between jobs
# In .woodpecker.yml:
steps:
  cleanup:
    image: alpine
    commands:
      - rm -rf node_modules/.cache
```

### Secrets not working

- Secrets are repo-specific in Woodpecker
- Check they're set in UI: Repository → Settings → Secrets
- Secret names are case-sensitive

## Next Steps

Once this is working:

1. [ ] Port all GitHub Actions workflows
2. [ ] Document any gaps or pain points
3. [ ] Measure build times vs GitHub Actions
4. [ ] Design Firefly Controller for ephemeral runners

## References

- [Woodpecker Documentation](https://woodpecker-ci.org/docs/intro)
- [Woodpecker Forgejo Integration](https://woodpecker-ci.org/docs/administration/configuration/forges/forgejo)
- [Codeberg OAuth Apps](https://docs.codeberg.org/advanced/oauth/)
- [Firefly CI Spec](/knowledge/specs/firefly-ci-spec)
