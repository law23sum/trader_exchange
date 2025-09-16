# Trade Exchange — Auth + Dashboards
Now includes Sign in / Sign up and role-based dashboards.

## Accounts (seeded)
- user@example.com / password (USER)
- trader@example.com / password (TRADER)

## Run
### Backend
cd backend
npm i
npm run seed
npm run dev   # http://localhost:4000

Reset database (delete all data)
- cd backend && npm run reset-db
- Optional: re-seed with demo data via `npm run seed`

### Frontend
cd frontend
npm i
npm run dev   # http://localhost:5173

### Mock mode (no backend required)
If you cannot run the backend locally, you can enable a mock API to sign in and browse demo data:

Create `frontend/.env.local` with:

VITE_MOCK=1

Then start the frontend. Sign in/up will work entirely in the browser, and core pages will show demo data.

Optional: if your backend runs on a different host/port, set `VITE_API_BASE` to bypass the dev proxy:

Create `frontend/.env.local` with:

VITE_API_BASE=http://127.0.0.1:4001

Then start the frontend. Auth pages use this base for API requests.

### Common Pages
- /about — About Trade Exchange
- /how-it-works — How the marketplace flow works
- /pricing — Plans and tiers (demo)
- /become-a-provider — Provider onboarding CTA
- /help — Help & FAQ
- /contact — Contact form (demo)
- /safety — Trust & safety guidelines
- /terms — Terms of Service (placeholder)
- /privacy — Privacy Policy (placeholder)

### Messaging & AI
- Backend: Conversations and messages are stored in SQLite. Endpoints:
  - GET /api/conversations, POST /api/conversations
  - GET /api/conversations/:id/messages, POST /api/conversations/:id/messages
  - Simple AI replies for conversations with kind='AI'. Replace logic in `backend/src/ai.js`.
- Frontend: Routes `/messages` and `/messages/:id` for list + chat.

## Java Backend (optional, fullstack alt for trader profile)
You can also run a Java Spring Boot service that writes trader profiles into the same SQLite DB used by the Node backend.

### Run Java service
cd java-backend
mvn spring-boot:run   # http://localhost:8080

The service uses the DB at `../backend/trade.db` by default. Configure in `java-backend/src/main/resources/application.yml`.

### Endpoints (parity with Node)
- GET /api/trader/profile — requires `Authorization: Bearer <token>` (uses `sessions` + `users` tables), returns current provider profile.
- POST /api/trader/profile — same body as Node; upserts a provider row and links to the user.

### Use from the frontend
Set a custom API base (to target Java instead of Node):

Create `frontend/.env.local` with:

VITE_API_BASE=http://127.0.0.1:8080

Restart Vite. The app will use the Java endpoints for profile actions while still sharing the same DB.

### Flow
- Home page shows Sign in / Sign up.
- After auth:
  - USER → /dashboard/user (favorites, history, categories)
  - TRADER → /dashboard/trader (your listings, tips)


## Updated flow
- Home page shows **Sign in / Sign up** cards and popular categories.
- After **Sign in**:
  - USER → `/dashboard/user` (favorites, history, categories)
  - TRADER → `/dashboard/trader` (details + listings)
- Selecting a tier on a trader leads to **Confirm** → **Checkout**, which records a purchase in history.


### Google login
This build includes a **demo** Google login button that calls `/api/auth/google` and returns a mock account (`google_user@example.com`). For real OAuth, wire an auth provider and exchange the ID token on the backend.
