# OmniPay Finance

A standalone finance & payments admin app: authentication (email/password + email-OTP), a CardPointe (Fiserv) backed payments module — quotes → approvals → invoices → charge, customer payment profiles, transaction reporting — and a themeable React dashboard on top.

The repo is two independent apps you run side by side:

- **`server/`** — Bun + Express + Apollo GraphQL (auth/user) + a REST API (`/v1/finance/*`, payments)
- **`web/`** — Vite + React 18 dashboard

## ✨ Highlights

- **Auth** — email/password login, email-OTP signup (with optional first-company creation), forgot-password via OTP + reset, JWT bearer auth
- **Finance/payments** — CardPointe integration: quotes, approvals, invoices + charge, customer payment profiles, transaction import & reporting, collections, commissions, terminal status
- **GraphQL** for auth/user, **REST** (`/v1/finance/*`) for the payments module, both backed by MongoDB/Mongoose
- **Dashboard** — Redux Toolkit, React Router, Tailwind CSS; 14 switchable color themes (light + dark), collapsible desktop sidebar with a slide-in mobile drawer, in-app settings menu (edit profile, payment profile, theme, sign out)
- **SendGrid** transactional email for OTP codes and password resets

## 📋 Modules

| Module | Where (client) | Backed by | What it does |
|---|---|---|---|
| **Profile setup** | Avatar menu → *Edit profile* (`FinanceProfile.jsx`) | `update_user` mutation | Update first/last name; email is immutable |
| **Payment profile** | Avatar menu → *Payment profile* (`CardProfileModal.jsx`) | `GET/POST/DELETE /finance/cardpointe/my-profile` | View, create, update or delete the caller's own CardPointe stored-card profile (token, expiry, billing address, contact, card flags) |
| **Accounts** | `/connect/finance/accounts` | `GET/POST /finance/customers`, `PUT /finance/customers/:id`, `.../link-profile`, `.../import-profile` | Customer directory; link or import a CardPointe profile per customer |
| **Quotes** | `/connect/finance/quotes` | `GET/POST /finance/quotes`, `POST /finance/quotes/:id/convert` | Create a quote for a customer; converting it auto-charges the customer's stored card and records the transaction |
| **Approvals** | `/connect/finance/approvals` | `GET /finance/approvals` | Queue of quotes awaiting sign-off before they convert/charge |
| **Receivables** | `/connect/finance/receivables` | `GET /finance/transactions`, `.../import`, `/inquire/:retref`, `PUT /void/:retref`, `PUT /refund/:retref` | Imported/settled CardPointe transactions — inquire, void, refund |
| **Collections** | `/connect/finance/collections` | `GET/POST /finance/invoices`, `PUT /finance/invoices/:id`, `POST /finance/invoices/:id/charge`, `GET/POST /finance/collections` | Invoices — create, charge (auto-charges the stored card), track collection status |
| **Commission** | surfaced on Quotes / Financials | `GET /finance/commissions`, `database/Models/Commission.js` | Ledger of the revenue split recorded against each auto-charged quote — bookkeeping only; CardPointe deposits the full gross amount into the one merchant account, commission/net are recorded splits, not separate fund transfers |
| **Activity** | `/connect/finance/activity` | `FinanceActivity.jsx` | Rolled-up activity feed across approvals, invoices and transactions |
| **Financials** | `/connect/finance/financials` | `GET /finance/funding`, `GET /finance/merchant`, `GET /finance/txnsummary(/surcharge)`, `GET /finance/settlement(/surcharge)` | Financial summary + funding/deposit panel + merchant info panel |
| **Settings** | `/connect/finance/settings` | `GET /finance/gateway` | Business configuration — gateway connection status, merchant lookup, connection test |
| **Themes** | Avatar menu → *Theme* | `web/src/components/finance/themes.js` | 14 curated light/dark presets; see [🎨 Theming](#-theming) below |

## 🧱 Tech stack

| Layer  | Tech |
|--------|------|
| Server | Bun, Express 4, Apollo Server (GraphQL), Mongoose/MongoDB, JWT + bcryptjs, SendGrid |
| Client | Vite 6, React 18, Redux Toolkit, React Router 6, Tailwind CSS 3, react-icons |

## 📦 Prerequisites

- **Bun** ≥ 1.0 (`curl -fsSL https://bun.sh/install | bash`) — or Node.js ≥ 18 + npm if you'd rather not install Bun; a `package-lock.json` is committed alongside `bun.lock` in both apps.
- **MongoDB** reachable from the server — local `mongod` on `27017`, or an Atlas connection string.
- A **SendGrid** API key + verified sender if you want OTP/reset emails to actually send. Without it, signup/login still work but the email step fails silently (check server logs).
- **CardPointe/Fiserv** sandbox credentials only if you want to exercise the payments features beyond auth.

## 🚀 Quick start

Run the server and client in two terminals.

### 1. Server (API)

```bash
cd server
cp .env.example .env      # fill in JWT secrets, MONGO_DB_URL, SendGrid, CardPointe (see table below)
bun install                # or: npm install
bun run dev                # or: npm run dev
```

→ listens on `http://localhost:4101` (from `API_SERVER_PORT`) — GraphQL at `/graphql`, REST at `/v1/*`, health check at `/v1/health`.

### 2. Client (web)

```bash
cd web
echo "VITE_BASE_URL=http://localhost:4101" > .env
bun install                 # or: npm install
bun run dev                 # or: npm run dev
```

→ opens on `http://localhost:5173`.

There's no seed script — sign up at `http://localhost:5173/signup` to create your first user (and, optionally, your first company).

## 🔐 Environment variables (`server/.env`)

| Variable | Purpose |
|---|---|
| `NODE_ENV` | `development` / `production` |
| `APP_TITLE`, `APP_DOMAIN`, `APP_SUPPORT_EMAIL` | Used in outgoing email copy |
| `JWT_SECRET_KEY` / `REFRESH_JWT_SECRET_KEY` | Long random strings — sign the access/refresh tokens |
| `SENDGRID_API_KEY` / `SENDGRID_SENDER_EMAIL` | OTP + password-reset email delivery; sender must be verified in SendGrid |
| `CLIENT_BASE_URL` | The web app's origin — used for email links **and** as the only allowed CORS origin |
| `API_SERVER_PORT` | Port the API listens on (default `4101`) |
| `MONGO_DB_URL` | Mongo connection string. **Required** — the server fails loud at boot without it, and every query buffer-times-out if it's missing/unreachable |
| `CARDPOINTE_BASE_URL`, `CARDPOINTE_MERCHANT_ID`, `CARDPOINTE_SURCHARGE_MID`, `CARDPOINTE_USERNAME`, `CARDPOINTE_PASSWORD` | CardPointe/Fiserv REST API (transactions, profiles, reporting) |
| `BOLT_TERMINAL_URL`, `BOLT_AUTH_KEY` | CardPointe Bolt terminal API (card-present) |
| `CARDPOINTE_REPORTING_URL`, `CARDPOINTE_REPORTING_USERNAME`, `CARDPOINTE_REPORTING_PASSWORD` | CardPointe reporting portal |

The client only needs one variable, in `web/.env`:

| Variable | Purpose |
|---|---|
| `VITE_BASE_URL` | Base URL of the server (e.g. `http://localhost:4101`) — used for both the GraphQL endpoint and REST finance calls |

## 🗂️ Project structure

```
omnipay/
├── server/                       # Bun + Express + GraphQL (auth) + REST (finance)
│   ├── server.js                  # entry point — Apollo at /graphql, REST at /v1/*
│   ├── typeDefs/                  # GraphQL schema
│   ├── Resolvers/                 # GraphQL resolvers + auth middleware
│   ├── routes/v1/finance.js       # REST endpoints: quotes, invoices, customers, …
│   ├── database/Models/           # Mongoose models (User, Company, Finance, Commission, …)
│   ├── helper/context/            # JWT verification — GraphQL context + REST middleware
│   ├── services/ · utils/         # CardPointe client, email sender, shared helpers
│   └── .env.example
│
└── web/                           # Vite + React 18
    └── src/
        ├── pages/                 # Login, Signup, ForgotPassword
        ├── components/auth/       # shared auth UI (OTP input, resend timer, left panel)
        ├── components/finance/    # the dashboard: layout, sidebar, pages, themes.js
        ├── components/            # ProtectedRoute / PublicOnlyRoute (token-gated routing)
        ├── lib/graphqlClient.js   # fetch-based GraphQL client + query/mutation strings
        ├── lib/theme.js           # theme apply/persist helpers
        └── store/                 # Redux store (current user)
```

## 🧰 Scripts

| Location | Command | Description |
|---|---|---|
| `server/` | `bun run dev` / `start` | Run the API (`server.js`) |
| `server/` | `bun test` | Server test suite |
| `web/` | `bun run dev` / `start` | Vite dev server |
| `web/` | `bun run build` | Production build → `web/dist` |
| `web/` | `bun run preview` | Preview the production build locally |

(Swap `bun` for `npm` in any of the above if you're not using Bun.)

## 🔑 Auth flow

- **Sign up** — `signup_otp_send` emails a 6-digit code via SendGrid → `signup` verifies the code and creates the user (and a new company, if `company_name` is supplied — otherwise pass an existing `company_id` to join one) → returns a JWT.
- **Login** — `login` checks email/password (bcrypt) and returns a JWT. The client stores it in `localStorage` and sends it back as `Authorization: Bearer <token>` on every request (see `web/src/lib/graphqlClient.js`).
- **Forgot password** — `forgot_password` (emails a code) → `email_otp_verify` → `set_new_password`.
- The server also accepts the same JWT via an `access_token` httpOnly cookie set on login — the client actually uses the Bearer header; treat the cookie path as a Postman/service-to-service convenience.
- **Logout** clears the auth cookies server-side; the client drops its own `localStorage` token.
- A refresh token is issued alongside the access token, but the web client doesn't currently use it — a session lasts as long as the access token (see `signTokens` in `server/Resolvers/user.js`).

## 🌐 API

### GraphQL — `POST /graphql`

| Operation | Type | Notes |
|---|---|---|
| `signup_otp_send` | mutation | No auth |
| `signup` | mutation | No auth |
| `login` | mutation | No auth |
| `forgot_password` | mutation | No auth |
| `email_otp_verify` | mutation | No auth |
| `set_new_password` | mutation | No auth |
| `update_user` | mutation | Auth required |
| `logout` | mutation | Auth required |
| `me` / `user` / `users` | query | Auth required |

```bash
curl -s http://localhost:4101/graphql \
  -H "content-type: application/json" \
  -H "authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"query":"{ me { id email firstname lastname role } }"}'
```

### REST — `/v1/finance/*` (all require `Authorization: Bearer <token>`, or Basic auth with the CardPointe service credentials)

Grouped by area — the full list of ~45 routes lives in `server/routes/v1/finance.js`:

- **Quotes & approvals** — `GET/POST /finance/quotes`, `GET /finance/quotes/:id`, `POST /finance/quotes/:id/convert`, `GET /finance/approvals`
- **Invoices & collections** — `GET/POST /finance/invoices`, `PUT /finance/invoices/:id`, `POST /finance/invoices/:id/charge`, `GET/POST /finance/collections`
- **Customers & payment profiles** — `GET/POST /finance/customers`, `PUT /finance/customers/:id`, `POST /finance/customers/:id/link-profile`, `GET/POST/DELETE /finance/cardpointe/my-profile`
- **Transactions & reporting** — `GET /finance/transactions`, `POST /finance/transactions/import`, `GET /finance/txnsummary`, `GET /finance/settlement`, `PUT /finance/void/:retref`, `PUT /finance/refund/:retref`, `GET /finance/reporting/search`
- **Terminal & gateway** — `GET /finance/terminal/list`, `GET /finance/terminal/status/:hsn`, `GET /finance/gateway`, `GET /finance/merchant`
- **Commissions** — `GET /finance/commissions`

`GET /v1/health` — status probe (no auth), reports Mongo connection state.

## 🎨 Theming

The dashboard ships 14 color themes (`web/src/components/finance/themes.js`) — 9 light, 5 dark — switchable from the avatar menu in the top bar (**Theme**). Picking one sets `data-theme` on `<html>`, which drives CSS-variable overrides in `web/src/components/finance/finance.css` (surfaces, text, borders, brand accent, sidebar) and persists to `localStorage`. Dark themes also toggle Tailwind's `dark` class for the few components that use `dark:` utilities. The sidebar collapses to a slide-in drawer with a backdrop below 860px.

## 🩺 Troubleshooting

- **Mongo connection / queries hang** — `MONGO_DB_URL` must be set before starting the server; `database/util/index.js` fails loud at boot if it's missing, and every query will buffer-timeout if Mongo is unreachable.
- **CORS error in the browser** — the server only allows the exact origin in `CLIENT_BASE_URL` (trailing slash stripped). A mismatch shows up as a CORS error, not a 401.
- **"Invalid email or password" on a fresh install** — there's no seed data; sign up first at `/signup`.
- **OTP email never arrives** — check `SENDGRID_API_KEY` / `SENDGRID_SENDER_EMAIL`; the sender must be a verified identity in SendGrid or sends are rejected.
- **`bun: command not found`** — `export PATH="$HOME/.bun/bin:$PATH"`, or just use `npm install` / `npm run dev` instead (both apps have a `package-lock.json` committed).
