# Justfile for Car Log (SvelteKit + Bun)

# Default goal
default: dev

# Install dependencies
install:
    @echo "Installing dependencies..."
    bun install

# Run development server
dev:
    @echo "Starting development server..."
    bun run dev

# Format code
format:
    @echo "Formatting project..."
    bun run format

# Run Svelte and type checks
check:
    @echo "Running Svelte and type checks..."
    bun run check

# Run lint and formatting checks
lint:
    @echo "Running lint and formatting checks..."
    bun run lint

# Run tests
test:
    @echo "Running tests..."
    bun run test

# Full verification gate -- must pass before any task is declared done
verify:
    @echo "Running full verification..."
    bun run check
    bun run lint
    bun run test


# Build for production
prod:
    @echo "Building app..."
    bun run build
    @echo "Starting production server..."
    bun run start

# Local container stack (builds image)
deploy-dev:
    @echo "Starting local Docker stack..."
    docker compose --project-directory . -f docker/compose.yaml up -d --build

# Production deployment (requires .env with CAR_LOG_IMAGE + secrets)
deploy-prod:
    @echo "Deploying production stack..."
    docker compose --project-directory . -f docker/compose.production.yaml --env-file .env pull
    docker compose --project-directory . -f docker/compose.production.yaml --env-file .env up -d

# Production deployment with Tailscale Serve overlay (requires .env)
deploy-tailscale:
    @echo "Deploying production stack with Tailscale..."
    docker compose --project-directory . -f docker/compose.production.yaml -f docker/compose.tailscale.yaml --env-file .env pull
    docker compose --project-directory . -f docker/compose.production.yaml -f docker/compose.tailscale.yaml --env-file .env up -d

# Stop any running container stack
deploy-down:
    @echo "Stopping containers..."
    docker compose --project-directory . -f docker/compose.yaml down 2>/dev/null || true
    docker compose --project-directory . -f docker/compose.production.yaml --env-file .env down 2>/dev/null || true
