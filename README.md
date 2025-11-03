# Trade Exchange

Trade Exchange connects customers with vetted traders and walks both sides through a consistent journey: discover → consult → book → deliver → review. The UI and backend in this repo have been tuned to support that end‑to‑end flow.

## Quick Start

| Service  | Command | Notes |
|----------|---------|-------|
| **Backend** (Spring Boot) | `cd backend && mvn spring-boot:run` | Requires Java 17+ and Maven. The service uses SQLite (`backend/trade.db`) and auto‑seeds demo data on first run. Listens on `http://localhost:8080`. |
| **Frontend** (Vite + React) | `cd frontend && npm install && npm run dev` | Requires Node 18+. The dev server proxies API calls to `http://localhost:8080` by default. |

Open `http://localhost:5173` after both services start.

### Demo Accounts

| Role  | Email | Password |
|-------|-------|----------|
| Customer | `user@example.com`   | `password` |
| Trader   | `trader@example.com` | `password` |
| Milo Provider | `milo@tradeexchange.com` | `password` |
| Admin (optional) | `admin@example.com` | `password` |

These users are seeded by `DataSeeder` on backend startup. Feel free to sign up additional accounts through the UI; they will be stored in the same SQLite database.

## Environment Configuration

Create `frontend/.env.local` to override defaults:

```ini
# Point the frontend at a custom backend host/port
VITE_API_BASE=http://localhost:8080

# Enable mock mode (no backend). Useful for rapid UI work or CI smoke checks.
VITE_MOCK=1

# Stripe publishable key (required for inline card entry during checkout)
VITE_STRIPE_PK=pk_test_1234567890
```

When `VITE_MOCK=1`, sign in/up, search, consultations, orders, and reviews all run against the in‑browser mock defined in `src/mock/api.js`.

The backend reads its database location from `SPRING_DATASOURCE_URL`. To use a different file or an in‑memory database:

```bash
SPRING_DATASOURCE_URL=jdbc:sqlite:/tmp/trade.db mvn spring-boot:run
```

## Workflow Overview

1. **Discover** – Customers search (`/results`) with instant metrics. Cards surface “Schedule consult” and “View details”.
2. **Consult** – Trader detail pages embed messaging and an optional consultation form that records requested date/time and context.
3. **Book & Pay** – Checkout captures service details, schedules, and contact information, then writes an order via `/api/checkout`.
4. **Deliver** – Traders manage incoming orders from their dashboard, can approve/discuss, and log completion notes with proof links.
5. **Review** – Customers see their bookings on `/dashboard/user`, leave ratings, and revisit traders or categories.

The shared `JourneyStepper` component appears on every stage to keep users oriented.

## Debugging & Tooling

### Inspecting Data

- **Orders**: `SELECT * FROM orders;` inside `backend/trade.db`. Use `sqlite3 backend/trade.db` for quick checks.
- **Users & sessions**: `users`, `sessions`, and `players` tables store auth info and trader metadata.

### Useful Backend Commands

```bash
# Run with verbose SQL logging
SPRING_JPA_SHOW_SQL=true mvn spring-boot:run

# Rebuild the project
mvn clean package

# Execute backend unit tests (if present)
mvn test
```

Backend logs surface on stdout; look for Spring Boot INFO lines for route registration and data seeding.

### Useful Frontend Commands

```bash
# Type-check (if TypeScript is added in the future)
npm run typecheck

# Production build (used as a smoke test in this repo)
npm run build
```

Vite automatically reloads on file changes. If you see stale module errors, restart `npm run dev` to clear the module graph.

## API Highlights

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/checkout` | POST | Records a paid order with schedule, address, tasks, and contact info. Returns `{ orderId, txId }`. |
| `/api/orders/mine` | GET | Returns orders belonging to the authenticated customer. Powers the user dashboard. |
| `/api/orders/{id}/review` | POST | Stores a review and recomputes the provider rating. |
| `/api/trader/orders` | GET | Lists orders scoped to the trader’s provider ID. |
| `/api/trader/orders/{id}/action` | POST | Allows `approve`, `discuss`, or `complete` actions. |
| `/api/trader/orders/{id}/complete-with-details` | POST | Adds completion notes/photo links and flags the order complete. |

See `backend/src/main/java/com/tradeexchange/api/OrdersController.java` for the full API surface.

## Adding New Traders or Listings

1. Sign in as a trader and visit `/dashboard/trader`.
2. Update profile fields and portrait session details – they persist via `/api/trader/profile`.
3. Use the listings management endpoints (`/api/trader/listings`) to create new offerings (currently callable via API or future admin tooling).

## Mock Mode vs Live Backend

| Capability | Live Backend | Mock Mode |
|------------|--------------|-----------|
| Auth & roles | ✅ SQLite-backed | ✅ LocalStorage-backed |
| Search data | ✅ `/api/players`, `/api/listings` | ✅ in-memory demo data |
| Consult + orders | ✅ persists to `orders` table | ✅ stored in LocalStorage |
| Reviews & ratings | ✅ updates `provider_reviews` + `players.rating` | ✅ stored in LocalStorage |

Mock mode is perfect for UI prototyping; switch back to the live backend before final QA to ensure SQLite and server logic behave as expected.

## Testing the Full Flow

1. Start backend & frontend.
2. Sign in as `user@example.com`.
3. Search for a trader, schedule a consult, then proceed to checkout and submit.
4. Sign in as `trader@example.com` (photography) or `milo@tradeexchange.com` (math tutor), approve the new order, add completion notes, and mark complete.
5. Sign back in as the user, open `/dashboard/user`, locate the booking, and submit a review.

Following those five steps exercises all major endpoints and surfaces issues quickly.

---
Happy trading! If you run into problems, check the backend logs first (they log seeded data and SQL errors) and verify your frontend `.env.local` matches the running backend host.
