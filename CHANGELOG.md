# fitflow

## 1.5.0

### Minor Changes

- 144d8d2: Admin back office documentation with in-app viewer and contextual help links

  - Add 11 Bulgarian markdown guides in `content/admin-docs/` covering all admin operations
  - Add `/admin/docs` page with sidebar navigation and styled markdown rendering
  - Add `remark-gfm` for proper table/GFM support in markdown pipelines
  - Add contextual `?` help links on all admin page headers linking to relevant docs section
  - Add "Документация" sidebar link visible to all staff roles
  - Include manual order generation timing guidance (3–5 days before send date)
  - Document placeholder pages (Analytics, Content) with planned scope

- 656ab9d: Add subscription frequency change to admin subscription detail page

  - Add `adminUpdateSubscriptionFrequency` data-layer function (skips ownership check, logs history with `changed_by: admin`)
  - Add `update_frequency` action to `PATCH /api/admin/subscription/[id]` with validation and Brevo contact sync
  - Add teal "⏱ Промени честота" button and frequency picker modal to `SubscriptionDetailView` (active subscriptions only)

- c687802: Admin orders: default to current delivery cycle with cycle selector dropdown

  - Add delivery cycle dropdown filter to admin orders page, defaulting to the current/upcoming cycle
  - Extend orders data layer with `cycleId` filter for `getOrdersPaginated` and `getOrdersCount`
  - Add `getDeliveryCyclesForDropdown` and `getCurrentCycleId` helpers with `CycleDropdownOption` type
  - Replace config-based delivery date banner with actual Speedy send date calculated from cycle delivery date
  - Show total vs eligible subscription breakdown in order generation preview

- e446ea4: Fix analytics event placement, add GA4 purchase event, and improve Meta CAPI coverage

  - Add GA4 `purchase` event (`trackGAPurchase`) — enables revenue reporting in Google Analytics
  - Move `ViewContent` from page-load on 3 pages to order funnel Step 1 with CAPI mirror
  - Move `InitiateCheckout` from Step 1 to Step 3 (checkout details) with `begin_checkout` + CAPI mirror
  - Remove stale `trackLead` and `trackGenerateLead` calls from the order flow
  - Add `trackFormSubmit` on thank-you page for GA4 form completion tracking
  - Create `POST /api/analytics/track` route for client-side CAPI event forwarding (PageView, ViewContent, InitiateCheckout)
  - Add CAPI PageView mirror alongside Facebook Pixel init in ConditionalScripts
  - Add `content_type: 'product'` to all Meta Purchase/Subscribe events (Pixel + CAPI)
  - Add `coupon` param, `item_brand: 'FitFlow'`, `item_list_id`/`item_list_name` to GA4 ecommerce events
  - Consolidate `funnel_step_${name}` into single `funnel_step` event with `step_name` parameter
  - Add `userId` → hashed `external_id` support and `Subscribe` type to CAPI infrastructure
  - Create `useScrollDepth` hook and wire to homepage, mystery box, and revealed box pages
  - Wire `trackSubscriptionPaused` and `trackSubscriptionCancelled` in account modals
  - Create `lib/analytics/cookies.ts` for `_fbp`/`_fbc` extraction

- 75bc9c6: Refactor Meta Pixel event hierarchy and add server-side CAPI for Purchase and Subscribe

  - Promote `Purchase` to primary conversion event on order completion; demote `Lead` to mid-funnel intent signal at Step 3
  - Fire `InitiateCheckout` when the order form mounts (Step 1)
  - Add server-side `Purchase` CAPI event in `/api/order` and custom `Subscribe` CAPI event in `/api/subscription` (Graph API v21.0)
  - Extract reusable `buildCapiUserData` helper for PII hashing across API routes
  - Deduplicate browser ↔ CAPI events via `capiEventId` passed through the order store to the thank-you page
  - Include `data_processing_options` on all CAPI events for GDPR compliance
  - Handle consent downgrade at runtime: revoke Meta Pixel consent, clear tracking cookies, and prompt page refresh
  - Skip analytics script rendering and CAPI calls in non-production environments
  - Update `meta-capi-setup.md` and `gdpr-cookie-consent.md` documentation

- 755cd52: Add cycle-based promo code tracking for subscriptions

  - Add `default_max_cycles` column to `promo_codes` table (1 = first order only, NULL = unlimited)
  - Add `promo_max_cycles` and `promo_cycles_used` columns to `subscriptions` table with CHECK constraints
  - Backfill existing subscriptions: count promo-applied orders and clear exhausted promos
  - Add `default_max_cycles` field to promo code create/edit form and API with validation
  - Copy `default_max_cycles` from promo code to subscription at creation time
  - Check promo cycle eligibility during order generation (batch and single-subscription paths)
  - Automatically clear promo and reset price to base when cycles are exhausted
  - Add admin subscription promo management UI: apply new promo, update max cycles, or clear promo
  - Add `update_promo` action to admin subscription PATCH API with `apply`, `update_cycles`, and `clear` sub-actions
  - Display active subscription count on promo code edit/stats page

- 3e7a773: Add human-readable subscription numbers and subscription change email notifications

  - Add `subscription_number` column (`FF-SUB-DDMMYY-XXXXXX`) with DB migration, generator function, and backfill for existing rows
  - Display subscription number in customer subscription card, admin detail view, admin table, and admin customer page
  - Add subscription number to all existing email templates (created, paused, resumed, cancelled, delivery upcoming, conversion)
  - Add new email templates and notification senders for frequency change, address change, and preferences update
  - Wire change notification emails into user and admin subscription API routes (fire-and-forget)
  - Add subscription number search support in admin subscriptions table
  - Pass `delivery_method` from address to order insert during subscription order generation
  - Update `SubscriptionRow` type with `subscription_number` field
  - Update `schema.sql` with column definition, unique constraint, index, and generator function

### Patch Changes

- 9f1eb24: Add Meta domain verification meta tag for Facebook Business Manager domain ownership verification

## 1.4.0

### Minor Changes

- db9b62f: Address management, order-to-subscription conversion, and subscription delivery fixes

  - Add customer address CRUD page with home delivery and Speedy office support
  - Add admin address API and customer detail page with addresses, subscriptions, and orders
  - Add subscription address change via picker modal with history logging
  - Add Speedy office fields to addresses table and API routes
  - Add multi-step order-to-subscription conversion flow with guest auto-account creation via magic link
  - Add admin campaign page to filter eligible orders, preview recipients, and bulk-send conversion emails
  - Track conversion campaign send status and converted order count
  - Send post-conversion confirmation email and sync contact to Brevo
  - Extend subscription API with conversionToken, guest auto-account, onBehalfOfUserId, and campaign promo support
  - Add DB migrations for Speedy office address fields and order-subscription conversion tracking
  - Fix Speedy office address validation failure on subscription orders
  - Use per-subscription next delivery date instead of shared upcoming cycle
  - Archive preorder campaign from sidebar navigation
  - Normalize email templates to informal language with feminine forms

### Patch Changes

- e6bdcd7: Fix homepage box prices, delivery dates, and extract HowItWorks component

  - Fetch one-time box prices dynamically from catalog API instead of hardcoded values
  - Update delivery window from 1–5 to 15–20 in FAQs and Terms
  - Extract reusable HowItWorks component from duplicated markup
  - Fix one-time box CTA link routing to /order

- 35844f7: Add hover and active interactions to all buttons. Global `cursor: pointer` and `scale: 0.97` press feedback via `@layer base` in globals.css. Individual hover fixes for unstyled buttons in OrdersList, FAQ accordions, admin error pages, and dismiss buttons.

## 1.3.0

### Minor Changes

- Redesign hero section with orientation-aware layout

  - Replace single hero image with portrait/landscape variants toggled via CSS orientation media queries
  - Position CTA bottom-center in portrait, center-right in landscape with vw-based sizing
  - Add progressive object-position shift at narrower aspect ratios to keep product box visible
  - Add radial-gradient glow layer for smoother image-to-background transitions
  - Raise nav desktop/mobile breakpoint from md to lg for better tablet experience
  - Move OrderTrackingWidget from bottom-right to top-right

## 1.2.0

### Minor Changes

- Add dynamic feedback form system with admin builder, public submission pages, and response tracking

## 1.1.2

### Patch Changes

- Tiered order rate limits: higher for staff, relaxed in non-production environments

## 1.1.1

### Patch Changes

- Fix preorder conversion failing for subscription box types

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
