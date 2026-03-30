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

# Run linters and type checks
check:
    bun run check && bun run lint

# Run tests (if script exists)
test:
    @echo "No test script configured in package.json"

# Full verification gate -- must pass before any task is declared done
verify: format check


# Build for production
prod:
    @echo "Building app..."
    bun run build
    @echo "Previewing production build..."
    bun run preview
