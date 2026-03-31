# Car Repair Log - Production Ready

A secure, multi-user car repair tracking application with authentication, database storage, and photo uploads.

## Features

- **User Authentication**: Better Auth with email/password
- **Database**: SQLite with Drizzle ORM
- **Secure Photo Storage**: File-based photo uploads with user isolation
- **Multi-User Support**: Each user has private access to their own cars and repairs
- **Full CRUD**: Cars, Repairs, Parts, and Photos
- **Analytics**: Track repair costs by brand and model
- **Calendar View**: Visualize repair schedules

## Tech Stack

- **Frontend**: SvelteKit 5, TypeScript, TailwindCSS
- **Backend**: SvelteKit Server Routes
- **Database**: SQLite + Drizzle ORM
- **Auth**: Better Auth
- **UI**: shadcn-svelte components

## Getting Started

### Prerequisites

- Node.js 18+ and Bun

### Installation

1. Navigate to the project root:

```bash
cd car-log
```

2. Install dependencies:

```bash
bun install
```

3. The database is already initialized. If you need to reset it:

```bash
bunx drizzle-kit push
```

### Running the Application

1. Start the development server:

```bash
bun run dev
```

2. Open your browser to `http://localhost:3000`

3. You'll be redirected to the login page. Create a new account by clicking "Register"

### Testing with Multiple Users

To test the multi-user functionality:

1. **Create First User**:
   - Go to `/auth/register`
   - Enter name, email, and password (min 8 characters)
   - You'll be logged in automatically

2. **Add Cars and Repairs**:
   - Click "Add New Car" to create vehicles
   - Select a car to view details
   - Add repairs with photos, parts, and labor costs

3. **Test with Second User**:
   - Sign out using the button in the sidebar
   - Register a new account with a different email
   - Add different cars and repairs
   - Verify you cannot see the first user's data

4. **Upload Photos**:
   - When creating/editing a repair, use the photo upload section
   - Photos are stored securely in `/uploads/{userId}/{repairId}/`
   - Each user can only access their own photos

5. **Test Features**:
   - **Analytics**: View repair statistics by brand/model
   - **Calendar**: See repairs on a monthly calendar
   - **Search**: Filter cars by brand, model, or license plate

## Project Structure

```
.
├── src/
│   ├── lib/
│   │   ├── server/           # Server-side code
│   │   │   ├── db/           # Database schema and client
│   │   │   ├── auth.ts       # Better Auth configuration
│   │   │   └── storage.ts    # Photo upload handling
│   │   ├── components/       # UI components
│   │   ├── hooks/            # Svelte state management
│   │   └── types.ts          # TypeScript types
│   └── routes/
│       ├── api/              # API endpoints
│       │   ├── auth/         # Authentication
│       │   ├── cars/         # Cars CRUD
│       │   ├── repairs/      # Repairs CRUD
│       │   └── photos/       # Photo upload/serve
│       ├── auth/             # Login/Register pages
│       └── +page.svelte      # Main app
├── uploads/                  # Photo storage (gitignored)
├── sqlite.db                 # SQLite database (gitignored)
└── drizzle/                  # Database migrations
```

## Security Features

- **Authentication**: Session-based auth with Better Auth
- **Authorization**: All API endpoints verify user ownership
- **Data Isolation**: Users can only access their own data
- **Secure File Storage**: Photos stored with user/repair ID isolation
- **SQL Injection Protection**: Drizzle ORM with parameterized queries
- **XSS Protection**: SvelteKit automatic escaping

## API Endpoints

All endpoints require authentication:

- `GET /api/cars` - List user's cars
- `POST /api/cars` - Create car
- `PUT /api/cars/[id]` - Update car
- `DELETE /api/cars/[id]` - Delete car
- `GET /api/repairs` - List user's repairs
- `GET /api/repairs?carId={id}` - List repairs for a car
- `POST /api/repairs` - Create repair
- `PUT /api/repairs/[id]` - Update repair
- `DELETE /api/repairs/[id]` - Delete repair
- `POST /api/photos` - Upload photos (multipart/form-data)
- `GET /api/photos/[id]` - Serve photo
- `DELETE /api/photos/[id]` - Delete photo

## Environment Variables

Create a `.env` file in the project root:

```env
BETTER_AUTH_SECRET=your-super-secret-key-change-this-in-production-min-32-chars
BETTER_AUTH_URL=http://localhost:3000
```

## Building for Production

```bash
bun run build
bun run preview
```

## Testing Scenarios

### Scenario 1: Basic User Flow

1. Register new user
2. Add 2-3 cars
3. Add repairs to each car
4. Upload photos to repairs
5. Add parts with costs
6. View analytics
7. Check calendar view

### Scenario 2: Multi-User Isolation

1. User A: Create account, add car "Toyota Camry"
2. User A: Add repair with photos
3. Sign out
4. User B: Create account, add car "Honda Civic"
5. User B: Verify cannot see User A's data
6. User B: Add repair with photos
7. Verify photos are isolated by user

### Scenario 3: Data Persistence

1. Add cars and repairs
2. Sign out
3. Close browser
4. Reopen and sign in
5. Verify all data persists

## Known Limitations

- Email verification is disabled (set `requireEmailVerification: true` for production)
- Photos stored on local filesystem (consider S3 for production)
- SQLite database (consider PostgreSQL for production scale)

## Next Steps for Production

1. Set up email service for verification
2. Configure cloud storage (S3, CloudFlare R2) for photos
3. Migrate to PostgreSQL for better concurrency
4. Add rate limiting
5. Set up proper logging and monitoring
6. Configure HTTPS
7. Add backup strategy for database and photos

## License

MIT
