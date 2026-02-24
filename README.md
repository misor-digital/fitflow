# FitFlow — Next.js Application

A modern subscription box e-commerce platform for active women, built with Next.js 15, TypeScript, Tailwind CSS, Supabase, and Zustand.

## Features

- **Order System** — Multi-step order flow with guest checkout and authenticated checkout
- **Order Tracking** — Track orders by email + order number
- **Preorder Conversion** — Convert legacy preorders to full orders via token-based links
- **Authentication** — Supabase Auth with email/password, session management, password reset
- **Admin Panel** — Staff dashboard for orders, promo codes, analytics, content, and settings
- **Promo Codes** — Database-driven promotional discount codes with validation
- **Dynamic Pricing** — Box prices and currency conversion managed via database
- **Address Management** — Save, edit, and reuse shipping addresses
- **Email Notifications** — Transactional emails via Brevo (confirmation, contacts sync)
- **Analytics** — Google Analytics 4 + Meta Pixel + Meta Conversions API (server-side)
- **GDPR Compliance** — Cookie consent banner with granular preferences
- **Responsive Design** — Mobile-first approach
- **Type Safety** — Full TypeScript with Supabase-generated types

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL + Auth + RLS)
- **State Management**: Zustand with session persistence
- **Email**: Brevo (Sendinblue) transactional API
- **Analytics**: GA4 + Meta Pixel + Meta CAPI
- **Package Manager**: pnpm

## Project Structure

```
fitflow/
├── app/
│   ├── api/
│   │   ├── address/            # Address CRUD API
│   │   ├── admin/              # Admin API (orders, stats)
│   │   ├── auth/               # Auth helpers
│   │   ├── catalog/            # Box types, options, prices
│   │   ├── order/              # Order creation + tracking
│   │   ├── preorder/           # Legacy: link API only (preorder creation disabled)
│   │   └── promo/              # Promo code validation
│   ├── order/                  # Order flow (main customer journey)
│   │   ├── page.tsx            # Multi-step order page
│   │   ├── convert/            # Preorder-to-order conversion
│   │   ├── thank-you/          # Order confirmation
│   │   └── track/              # Order tracking by email
│   ├── admin/                  # Admin panel (staff only)
│   │   ├── analytics/          # Analytics dashboard
│   │   ├── content/            # Content management
│   │   ├── orders/             # Orders + legacy preorders view
│   │   ├── promo/              # Promo code management
│   │   ├── settings/           # Site configuration
│   │   └── staff/              # Staff management
│   ├── account/                # User account + profile
│   ├── auth/                   # Auth callback handler
│   ├── login/                  # Login page
│   ├── register/               # Registration page
│   ├── forgot-password/        # Password reset request
│   ├── reset-password/         # Password reset form
│   ├── setup-password/         # Initial password setup
│   ├── about/                  # About page
│   ├── faqs/                   # FAQ page
│   ├── cookies/                # Cookie policy
│   ├── privacy/                # Privacy policy
│   ├── terms/                  # Terms of service
│   ├── page.tsx                # Home / landing page
│   └── layout.tsx              # Root layout
├── components/
│   ├── order/                  # Order flow components
│   ├── admin/                  # Admin panel components
│   ├── Navigation.tsx          # Main navigation bar
│   ├── Footer.tsx              # Site footer
│   └── ...                     # Shared components
├── lib/
│   ├── analytics/              # GA4 + Meta tracking
│   ├── auth/                   # Auth DAL + session helpers
│   ├── consent/                # GDPR cookie consent
│   ├── constants/              # App constants + version
│   ├── data/                   # Database queries (catalog, prices, orders)
│   ├── email/                  # Email service + templates
│   ├── legal/                  # Legal content loaders
│   ├── order/                  # Order domain (types, validation, transform)
│   ├── catalog/                # Shared catalog domain (box types, pricing, validation)
│   ├── supabase/               # Supabase clients (browser, server, admin)
│   └── utils/                  # Shared utilities (rate limiting, sanitization)
├── store/
│   ├── authStore.ts            # Auth state (Zustand)
│   └── orderStore.ts           # Order form state (Zustand + sessionStorage)
├── supabase/
│   ├── schema.sql              # Complete schema reference (documentation only)
│   └── migrations/             # All database migrations (source of truth)
└── scripts/
    └── seed-super-admin.ts     # Seed initial super admin user
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- Supabase project (local or hosted)

### Installation

```bash
cd fitflow
pnpm install
```

### Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Brevo (email)
BREVO_API_KEY=your-brevo-api-key
BREVO_SENDER_EMAIL=info@fitflow.bg
BREVO_SENDER_NAME=FitFlow

# Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_META_PIXEL_ID=your-pixel-id
META_CAPI_ACCESS_TOKEN=your-capi-token
```

### Development

```bash
pnpm dev          # Start dev server (default port 3000)
pnpm dev --port 4000  # Custom port
```

### Production

```bash
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
```

## Pages & Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page with CTA to order flow |
| `/order` | Multi-step order page (box → personalization → details → confirm) |
| `/order/track` | Track order by email + order number |
| `/order/convert?token=...` | Convert legacy preorder to order |
| `/order/thank-you` | Order confirmation page |
| `/login` | Login |
| `/register` | Registration |
| `/account` | User profile |
| `/account/edit` | Edit profile |
| `/account/security` | Change password |
| `/admin` | Admin dashboard |
| `/admin/orders` | Orders management |
| `/admin/orders/legacy` | Legacy preorders view |
| `/admin/promo` | Promo code management |
| `/about`, `/faqs` | Info pages |

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/order` | Create a new order |
| `GET` | `/api/order/track` | Track order by email + order number |
| `POST` | `/api/preorder/link` | Link historical preorder to account |
| `GET/POST` | `/api/address` | Address CRUD |
| `GET` | `/api/catalog/prices` | Box prices with optional promo |
| `GET` | `/api/catalog/options` | Form options (sports, colors, etc.) |
| `GET` | `/api/promo/validate` | Validate promo code |
| `GET/POST` | `/api/admin/*` | Admin endpoints (staff only) |

## Database

The database is managed via Supabase with PostgreSQL and Row Level Security (RLS).

**Tables**: `orders`, `order_status_history`, `preorders` (legacy), `box_types`, `promo_codes`, `options`, `site_config`, `user_profiles`, `addresses`, `rate_limits`

**Key functions**: `generate_order_id()`, `calculate_box_prices()`, `check_rate_limit()`, `increment_promo_usage()`, `enforce_single_default_address()`, `ensure_default_on_delete()`

See [supabase/schema.sql](supabase/schema.sql) for the complete schema reference. Migrations in `supabase/migrations/` are the source of truth.

## Architecture Notes

### Order Flow
1. Customer selects box type → personalizes (optional) → enters details + address → confirms
2. Guest checkout supported (no account required)
3. Authenticated users can save/reuse addresses
4. Server-side price validation prevents client-side manipulation
5. Order creation is atomic: validate → insert → promo increment → email → analytics

### Preorder → Order Conversion
Legacy preorders can be converted to full orders via token-based links. The conversion flow prefills order data from the preorder, and the customer completes the shipping address step.

## Scripts

```bash
pnpm dev             # Start development server
pnpm build           # Build for production
pnpm start           # Start production server
pnpm lint            # Run ESLint
```

## Documentation

Additional docs are in the `docs/` directory:
- [Auth Setup](docs/auth-setup.md)
- [Email Setup](docs/email-setup.md)
- [GDPR Cookie Consent](docs/gdpr-cookie-consent.md)
- [Meta CAPI Setup](docs/meta-capi-setup.md)
- [Database Refactor](docs/database-refactor.md)
- [Releases](docs/releases.md)
- [Rollback](docs/rollback.md)

## License

This project is private and proprietary.

---

**Built with care for FitFlow**
