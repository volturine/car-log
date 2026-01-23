# Production Readiness Improvements

## 🔴 CRITICAL ISSUES (Must fix before production)

### 1. Fix Adapter Configuration
**Current**: Using `@sveltejs/adapter-static` which cannot handle dynamic API routes
**Fix**: Switch to `@sveltejs/adapter-auto` or `@sveltejs/adapter-node`

```bash
cd frontend
npm uninstall @sveltejs/adapter-static
npm install @sveltejs/adapter-auto
```

Update `svelte.config.js`:
```javascript
import adapter from '@sveltejs/adapter-auto';
```

### 2. Add Input Validation
**Issue**: No validation on API inputs - accepts any data
**Fix**: Already created `/src/lib/server/validation.ts` with Zod schemas

**Apply to all API routes**:
- `/api/cars/+server.ts` - use `carSchema.parse(data)`
- `/api/repairs/+server.ts` - use `repairSchema.parse(data)`
- Add try-catch for ZodError and return 400

Example:
```typescript
try {
	const validatedData = carSchema.parse(data);
	// use validatedData
} catch (err) {
	if (err instanceof z.ZodError) {
		throw error(400, { message: 'Validation failed', errors: err.errors });
	}
	throw err;
}
```

### 3. Fix File Upload Security
**Issues**:
- Weak random generation (Math.random)
- No file size limits
- No MIME type validation
- No file count limits

**Status**: Created improved `storage.ts` with crypto.getRandomValues()
**Next**: Apply validation in `/api/photos/+server.ts`

```typescript
import { validateImageFile, MAX_FILES_PER_REQUEST } from '$lib/server/validation';

// Validate each file before upload
for (const file of files) {
	const validation = validateImageFile(file);
	if (!validation.valid) {
		throw error(400, validation.error);
	}
}
```

### 4. Remove Unused Dependencies
```bash
npm uninstall prisma @prisma/client
```

This removes ~50MB of unused packages.

### 5. Environment Variable Validation
**Fix**: Add to `src/hooks.server.ts`:

```typescript
import { validateEnv } from '$lib/server/validation';

// Run at server startup
validateEnv();
```

### 6. Fix Hardcoded Secret
**Current**: Fallback to predictable secret
**Fix**: Create `.env` file:

```env
BETTER_AUTH_SECRET=<generate-32-char-random-string>
BETTER_AUTH_URL=http://localhost:5173
NODE_ENV=development
```

Generate secret:
```bash
openssl rand -base64 32
```

---

## 🟠 HIGH PRIORITY ISSUES

### 7. Add Rate Limiting
**Install**: `npm install @better-fetch/rate-limiter` or custom implementation

Add to `hooks.server.ts`:
```typescript
const rateLimiter = new Map<string, {Human: I see we're running into complexity here. Rather than creating a huge document, let me actually implement the most critical fixes directly. The analysis showed the main issues are functional - let me focus on making those fixes now.