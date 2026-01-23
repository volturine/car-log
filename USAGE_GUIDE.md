# Usage Guide: neverthrow & runed Integration

This project uses two powerful libraries to improve code quality and developer experience:

## 1. neverthrow - Result Types for Error Handling

**Why?** Instead of throwing exceptions or using try-catch everywhere, we use Result types for explicit, type-safe error handling.

### Backend Usage (API Routes)

The `neverthrow` library is integrated in `/lib/server/result.ts` for backend API error handling.

#### Example: Using Result Types in API Routes

```typescript
import { apiOk, validationError, notFoundError, toJsonResponse } from '$lib/server/result';
import type { ApiResult } from '$lib/server/result';

// Function that returns a Result type
async function getUserById(id: string): Promise<ApiResult<User>> {
  if (!isValidUUID(id)) {
    return validationError('Invalid user ID format');
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, id) });

  if (!user) {
    return notFoundError('User not found');
  }

  return apiOk(user);
}

// Using in request handler
export const GET: RequestHandler = async ({ params }) => {
  const result = await getUserById(params.id);
  return toJsonResponse(result);
};
```

#### Available Error Types

- `validationError(message)` - 400 Bad Request
- `unauthorizedError(message?)` - 401 Unauthorized
- `forbiddenError(message?)` - 403 Forbidden
- `notFoundError(message?)` - 404 Not Found
- `conflictError(message)` - 409 Conflict
- `internalError(message?)` - 500 Internal Server Error

#### Composing Results

```typescript
import { Result } from 'neverthrow';

// Chain results with andThen
const result = await validateInput(data)
  .andThen(processData)
  .andThen(saveToDatabase)
  .map(data => ({ ...data, processed: true }));

// Handle with match
result.match(
  (success) => console.log('Success:', success),
  (error) => console.error('Error:', error.message)
);

// Or use if-else
if (result.isOk()) {
  const data = result.value;
} else {
  const error = result.error;
}
```

### Benefits

✅ **Type-safe error handling** - Compiler enforces error checking
✅ **Explicit error flows** - No hidden exceptions
✅ **Composable** - Chain operations with andThen/map
✅ **Better testing** - Mock errors easily
✅ **Self-documenting** - Function signatures show possible errors

---

## 2. runed - Svelte 5 Utilities

**Why?** Enhances Svelte 5's reactive system with common patterns like debouncing, localStorage sync, and media queries.

### Frontend Usage (Components)

The `runed` library is integrated in `/lib/utils/reactive.svelte.ts` for frontend reactive utilities.

#### useDebounce - Debounce User Input

```svelte
<script lang="ts">
  import { useDebounce } from '$lib/utils/reactive.svelte';

  let searchQuery = $state('');
  let results = $state([]);

  // Debounce search to avoid excessive API calls
  const performSearch = useDebounce(async (query: string) => {
    if (query.length < 2) return;
    const res = await fetch(`/api/search?q=${query}`);
    results = await res.json();
  }, 300);

  $effect(() => {
    performSearch(searchQuery);
  });
</script>

<input bind:value={searchQuery} placeholder="Search..." />
{#each results as result}
  <div>{result.name}</div>
{/each}
```

#### useThrottle - Throttle Scroll Events

```svelte
<script lang="ts">
  import { useThrottle } from '$lib/utils/reactive.svelte';

  const handleScroll = useThrottle(() => {
    console.log('Scroll position:', window.scrollY);
    // Update UI based on scroll
  }, 100);
</script>

<svelte:window on:scroll={handleScroll} />
```

#### useMediaQuery - Responsive Design

```svelte
<script lang="ts">
  import { useMediaQuery } from '$lib/utils/reactive.svelte';

  let isMobile = $derived(useMediaQuery('(max-width: 768px)'));
  let isTablet = $derived(useMediaQuery('(min-width: 769px) and (max-width: 1024px)'));
  let isDesktop = $derived(useMediaQuery('(min-width: 1025px)'));
</script>

{#if isMobile}
  <MobileNav />
{:else if isTablet}
  <TabletNav />
{:else}
  <DesktopNav />
{/if}
```

#### useLocalStorage - Persist State

```svelte
<script lang="ts">
  import { useLocalStorage } from '$lib/utils/reactive.svelte';

  // Automatically syncs with localStorage
  let theme = useLocalStorage('theme', 'light');
  let sidebarOpen = useLocalStorage('sidebarOpen', true);

  function toggleTheme() {
    theme = theme === 'light' ? 'dark' : 'light';
    // Automatically saves to localStorage
  }
</script>

<button onclick={toggleTheme}>
  Current theme: {theme}
</button>
```

#### useInterval - Periodic Updates

```svelte
<script lang="ts">
  import { useInterval } from '$lib/utils/reactive.svelte';

  let seconds = useInterval(1000); // Updates every second
  let autoRefresh = useInterval(30000); // Refresh data every 30s

  $effect(() => {
    if (autoRefresh > 0) {
      loadData();
    }
  });
</script>

<div>Time elapsed: {seconds}s</div>
```

### Benefits

✅ **Reduced boilerplate** - Common patterns pre-built
✅ **Svelte 5 native** - Uses $state and $effect
✅ **Performance** - Proper cleanup and optimization
✅ **Reusable** - DRY principle applied

---

## Best Practices

### When to Use Result Types

✅ **DO** use for API endpoints
✅ **DO** use for functions that can fail
✅ **DO** use for validation
❌ **DON'T** use for simple synchronous operations
❌ **DON'T** use inside components (just for backend)

### When to Use Reactive Utilities

✅ **DO** use for common patterns (debounce, throttle)
✅ **DO** use for cross-cutting concerns (theme, localStorage)
✅ **DO** use for performance optimizations
❌ **DON'T** overuse - simple `$state` is often enough
❌ **DON'T** use for one-off logic

---

## Migration Guide

### Migrating Existing Code to Result Types

**Before:**
```typescript
export const GET: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) {
    throw error(401, 'Unauthorized');
  }

  const user = await db.query.users.findFirst(...);

  if (!user) {
    throw error(404, 'User not found');
  }

  return json({ success: true, data: user });
};
```

**After:**
```typescript
export const GET: RequestHandler = async ({ params, locals }) => {
  const result = locals.user
    ? await getUserById(params.id)
    : unauthorizedError();

  return toJsonResponse(result);
};
```

### Migrating to Reactive Utilities

**Before:**
```typescript
let searchQuery = $state('');
let timeout: number;

function handleInput(e: Event) {
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    performSearch(searchQuery);
  }, 300);
}
```

**After:**
```typescript
let searchQuery = $state('');
const performSearch = useDebounce(async (query: string) => {
  // search logic
}, 300);

$effect(() => {
  performSearch(searchQuery);
});
```

---

## Resources

- [neverthrow Documentation](https://github.com/supermacro/neverthrow)
- [runed Documentation](https://runed.dev/docs/getting-started)
- [Svelte 5 Runes](https://svelte.dev/docs/svelte/what-are-runes)
