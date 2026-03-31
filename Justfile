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
    @echo "Previewing production build..."
    bun run preview
