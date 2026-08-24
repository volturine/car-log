# Justfile for Car Log (SvelteKit + Node)

# Default goal
default: dev

# Install dependencies
install:
    @echo "Installing dependencies..."
    npm ci

# Run development server
dev:
    @echo "Starting development server..."
    npm run dev

# Format code
format:
    @echo "Formatting project..."
    npm run format

# Run Svelte and type checks
check:
    @echo "Running Svelte and type checks..."
    npm run check

# Run lint and formatting checks
lint:
    @echo "Running lint and formatting checks..."
    npm run lint

# Run tests
test:
    @echo "Running tests..."
    npm test

# Full verification gate -- must pass before any task is declared done
verify:
    @echo "Running full verification..."
    npm run check
    npm run lint
    npm test


# Build for production
prod:
    @echo "Building app..."
    npm run build
    @echo "Starting production server..."
    npm run start

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
