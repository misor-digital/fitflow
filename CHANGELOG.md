# fitflow

## 1.1.0

### Minor Changes

- ## 1.1.0

  ### Minor Changes

  - Post-launch improvements: delivery tracking, branded emails, customer orders, and admin tools.

    **Delivery confirmation**

    - Email reminders after shipping with one-click confirm link (signed token)
    - Daily cron auto-confirms unresponded deliveries
    - Admin indicators for reminder status and auto-confirm

    **Branded emails**

    - Shared email layout with FitFlow design tokens and Bulgarian labels
    - Auth emails (confirmation, password reset) sent via custom API routes instead of Supabase defaults
    - Code-controlled subscription templates replacing Brevo-hosted ones

    **Customer orders page**

    - Full order history under `/account/orders` with detail views and status timelines
    - Preorder detail page, cancel request button, guest preorder linking

    **Admin customers & order tools**

    - Paginated customers listing with stats cards, filters, and masked PII
    - Bulk order status updates and apply-promo-to-existing-order action

    **Auth**

    - Magic-link and passwordless registration flows
    - Password visibility toggle component

    **Performance**

    - Server-side caching (`unstable_cache` + tag invalidation)
    - 8s fetch timeout with graceful degradation
    - Batched auth lookups via `get_user_emails_by_ids` RPC
    - ISR for product pages

    **Fixes & housekeeping**

    - Lint cleanup, centralised order transitions, dropdown overflow fix, scroll fix on submit, updated docs

    **Migrations**: `create_order_price_history`, `add_delivery_confirmation`, `delivery_confirmation_rpc`, `increment_campaign_counters`, `get_user_emails_by_ids`

## 1.0.0

### Major Changes

- This changeset upgrades FitFlow from a preorder/landing implementation into a production-ready e-commerce and subscription platform.

  - **Orders**: new multi-step `/order` flow (guest + authenticated), order confirmation, and order tracking; new `/api/order` backend with server-side validation, pricing integrity, and rate limiting.
  - **Auth & Accounts**: Supabase Auth flows (register/login/reset/setup password) plus `/account` pages for profile management, security, and subscriptions.
  - **Subscriptions & Delivery cycles**: delivery cycle domain model, admin management UI, and generation logic to create subscription orders for eligible cycles.
  - **Admin panel**: staff-only dashboards for orders (including legacy preorders view), subscriptions, delivery cycles, promo codes (CRUD + per-user usage limits), settings, and email operations.
  - **Email platform (Brevo)**: transactional email foundation + contact sync, campaign engine building blocks, unsubscribe handling, A/B testing support, usage tracking, and monitoring endpoints/UI.
  - **Automation**: secure cron endpoint (`/api/cron/generate-orders`) with Vercel cron configuration and GitHub Actions fallback; persistent run results and admin notifications.
  - **Database & types**: large set of Supabase migrations and updated generated TypeScript types to support orders, addresses, subscriptions, delivery cycles/items, email logging/usage, promo usage tracking, and rate limiting.

## 0.3.3

### Patch Changes

- Remove preorder content and free delivery banner, clean up layout, and align box type definitions

## 0.3.2

### Patch Changes

- Add free delivery banner to preorder confirmation email

## 0.3.1

### Patch Changes

- Refactor release workflow: remove automated version bump, add manual versioning on stage, and automatic sync to dev after releases

## 0.3.0

### Minor Changes

- bc1a5bb: ### Euro Currency Support

  - Changed primary currency from BGN to Euro across the application
  - Updated price display components, preorder flow, and email templates for consistent Euro formatting

  ### CI/CD Workflow Improvements

  - Separated version workflow
  - Renamed prod-release workflow to prod-tag with enhanced configuration
  - Improved changeset detection to exclude README.md from triggering requirements
  - Updated git config to use repository admin identity for automated operations
  - Updated chore issue template naming

  ### Documentation Updates

  - Added comprehensive branch sync workflow and merge strategies
  - Added changeset decision table to release documentation
  - Added post-release branch sync instructions
  - Updated docs files after CI optimization

  ### UI Enhancements

  - Display app version from package.json in the footer

## 0.2.0

### Minor Changes

- 3fd5035: \## Features

  \- Add Supabase database integration with migrations for box types, promo codes, options, and site config

  \- Add email service with preorder confirmation templates

  \- Add promo codes system with validation API and discount functionality

  \- Add GDPR-compliant cookie consent system

  \- Add legal pages: Privacy Policy, Terms of Service, and Cookie Policy

  \- Add Google Analytics and Meta Pixel tracking integration

  \- Add Thank You page for preorder confirmations

  \- Add free delivery sliding banner

  \- Remove essential only reject button from cookie consent main banner

  \- Add personalization disclaimer to the preorder process

  \## Improvements

  \- Improve mobile responsiveness across all pages

  \- Enhance Step-4 UX with better layout and interactions

  \- Update About page, FAQ page, and header design

  \- Refactor preorder domain logic into shared lib/preorder module

  \- Move hardcoded business data to database

  \- Rename project from fitflow-nextjs to fitflow

  \## Developer Experience

  \- Add lint pre-push hook for code quality
