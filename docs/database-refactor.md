# Database Refactor - Moving Hardcoded Data to Supabase

## Overview

This document describes the refactoring of FitFlow to move hardcoded business data from code constants to Supabase (Postgres) database tables.

## What Was Moved

### 1. Box Types / Plans (`box_types` table)
- **Before**: Hardcoded in `lib/promo/promoService.ts` as `BOX_PRICES_EUR`
- **After**: Database table with full configuration
- **Fields**: id, name, description, price_eur, is_subscription, is_premium, frequency, sort_order, is_enabled

### 2. Promo Codes (`promo_codes` table)
- **Before**: Hardcoded in `lib/promo/promoService.ts` as `PROMO_CODES`
- **After**: Database table with validation rules
- **Fields**: code, discount_percent, starts_at, ends_at, max_uses, current_uses, is_enabled

### 3. Options (`options` table)
- **Before**: Hardcoded in multiple files (step-2, step-4, templates.ts)
- **After**: Single database table for all option sets
- **Option Sets**: sports, colors, flavors, dietary, sizes
- **Fields**: id, option_set_id, label, value, sort_order, is_enabled

### 4. Site Config (`site_config` table)
- **Before**: Hardcoded `EUR_TO_BGN_RATE = 1.9558`
- **After**: Key-value config table
- **Fields**: key, value, description, value_type

## New Files Created

### Migrations
- `supabase/migrations/20241228120000_create_box_types.sql`
- `supabase/migrations/20241228120001_create_promo_codes.sql`
- `supabase/migrations/20241228120002_create_options.sql`
- `supabase/migrations/20241228120003_create_site_config.sql`

### Data Access Layer
- `lib/data/catalog.ts` - Box types, options, site config, price calculation
- `lib/data/promo.ts` - Promo code validation and management
- `lib/data/index.ts` - Module exports

### API Routes
- `app/api/catalog/route.ts` - Fetch catalog data for frontend
- `app/api/promo/validate/route.ts` - Validate promo codes

### Types
- `lib/supabase/database.types.ts` - Updated with new table types

## Modified Files

### Updated to Use DB
- `app/api/preorder/route.ts` - Uses DB-backed price calculation
- `lib/email/templates.ts` - Consolidated label maps (fallbacks)
- `lib/promo/promoService.ts` - Deprecated, delegates to lib/data

## Deployment Checklist

### 1. Apply Migrations
```bash
# Connect to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
supabase db push
```

### 2. Verify Data
```sql
-- Check box types
SELECT * FROM box_types ORDER BY sort_order;

-- Check promo codes
SELECT * FROM promo_codes;

-- Check options
SELECT * FROM options ORDER BY option_set_id, sort_order;

-- Check site config
SELECT * FROM site_config;
```

### 3. Regenerate Types (Optional)
```bash
supabase gen types typescript --project-id YOUR_PROJECT_REF > lib/supabase/database.types.ts
```

### 4. Verify RLS Policies
```sql
-- Test anon read access
SET ROLE anon;
SELECT * FROM box_types WHERE is_enabled = true;
SELECT * FROM options WHERE is_enabled = true;
SELECT * FROM site_config;

-- Promo codes should NOT be readable by anon
SELECT * FROM promo_codes; -- Should return empty or error
```

### 5. Smoke Test Steps

1. **Homepage**: Verify prices display correctly
2. **Step 1**: Select a box type, verify price updates
3. **Step 2**: Verify all options (sports, colors, flavors, dietary) load
4. **Step 4**: Apply promo code, verify discount calculation
5. **Submit Order**: Complete a test preorder, verify:
   - Promo code is validated server-side
   - Price is calculated server-side
   - Promo usage count increments
   - Email contains correct pricing

## API Usage

### Fetch All Catalog Data
```typescript
const response = await fetch('/api/catalog');
const { boxTypes, options, labels, eurToBgnRate } = await response.json();
```

### Fetch Prices with Promo
```typescript
const response = await fetch('/api/catalog?type=prices&promoCode=FITFLOW10');
const { prices, discountPercent } = await response.json();
```

### Validate Promo Code
```typescript
const response = await fetch('/api/promo/validate?code=FITFLOW10');
const { valid, discountPercent } = await response.json();
```

## Security Notes

1. **Promo codes** are NOT readable by anon/authenticated users - validation goes through API
2. **Price calculation** is always done server-side - never trust client values
3. **RLS policies** ensure only enabled items are visible to public
4. **Service role** is required for admin operations (updating prices, managing promos)

## Rollback Plan

If issues occur:

1. The old hardcoded values are preserved as fallbacks in:
   - `lib/email/templates.ts` (label maps)
   - `lib/promo/promoService.ts` (BOX_PRICES_EUR constant)

2. To fully rollback:
   - Revert `app/api/preorder/route.ts` to use `lib/promo` instead of `lib/data`
   - The deprecated functions in `lib/promo/promoService.ts` will still work

## Frontend Components Updated

All frontend components have been updated to fetch data from the API instead of using hardcoded constants:

- `app/page.tsx` - Promo code validation via `/api/promo/validate`
- `app/step-1/page.tsx` - Prices fetched from `/api/catalog?type=prices`
- `app/step-2/page.tsx` - Options fetched from `/api/catalog?type=all`
- `app/step-4/page.tsx` - Catalog data and prices from API
- `components/PriceDisplay.tsx` - Self-contained formatPrice function
- `components/Navigation.tsx` - Discount percent fetched from `/api/promo/validate`

### Components Not Changed (No Business Data)
- `app/step-3/page.tsx` - Contact form only
- `app/thank-you/preorder/page.tsx` - Confirmation page only
- `app/about/page.tsx` - Static content
- `app/faqs/page.tsx` - Static FAQ content (could be moved to DB in future)
- `components/Footer.tsx` - Static links
- `components/SlidingBanner.tsx` - Static promotional text
- `components/PromoDiscountPrompt.tsx` - Receives discount as prop

## Future Improvements

1. Add admin UI for managing box types, promo codes, and options
2. Add caching layer (Redis) for frequently accessed catalog data
3. Add audit logging for price/promo changes
4. Consider moving FAQs to database if they need frequent updates
