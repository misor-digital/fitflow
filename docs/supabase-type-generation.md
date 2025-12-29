# Supabase Type Generation

This document describes how to set up automatic TypeScript type generation from the Supabase database schema.

## Why Type Generation?

Currently, database types (like `BoxType` enum) are manually defined in `lib/supabase/types.ts`. This creates a sync burden - when you add a new box type to the database, you must also update the TypeScript type.

With type generation:
- **Database is the single source of truth**
- **Types are auto-generated**, not manually maintained
- **Changes to DB schema automatically update TypeScript types** (after regeneration)

## Setup

### 1. Install Supabase CLI

```bash
# Option A: Project-local install (recommended)
pnpm add -D supabase

# Option B: Global install via npm
npm install -g supabase

# Option C: Using Scoop (Windows)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### 2. Generate Types

After installing via pnpm, run:

```bash
# For remote Supabase project
pnpm exec supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/database.types.ts

# For local Supabase setup (if using `supabase start`)
pnpm exec supabase gen types typescript --local > lib/supabase/database.types.ts
```

### 3. Add to package.json Scripts

```json
{
  "scripts": {
    "db:types": "supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/database.types.ts",
    "prebuild": "pnpm db:types",
    "build": "next build"
  }
}
```

The `prebuild` script ensures types are regenerated before every build.

### 4. Update Type Imports

After generation, update `lib/supabase/types.ts` to import from the generated file:

```typescript
// lib/supabase/types.ts
import type { Database } from './database.types';

// Extract types from generated schema
export type BoxType = Database['public']['Enums']['box_type'];
export type Tables = Database['public']['Tables'];

// You can also extract table row types
export type PreorderRow = Tables['preorders']['Row'];
export type PreorderInsert = Tables['preorders']['Insert'];
```

## CI/CD Configuration

For automated builds, you'll need:

1. **Environment Variable**: Set `SUPABASE_ACCESS_TOKEN` in your CI environment
2. **Project ID**: Either hardcode in script or use `SUPABASE_PROJECT_ID` env var

Example GitHub Actions step:

```yaml
- name: Generate Supabase Types
  env:
    SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
  run: pnpm exec supabase gen types typescript --project-id ${{ secrets.SUPABASE_PROJECT_ID }} > lib/supabase/database.types.ts
```

## Current State

**Status**: Not yet implemented

The current codebase manually defines types in `lib/supabase/types.ts`. This works but requires manual updates when the database schema changes.

## TODO

- [ ] Install Supabase CLI as dev dependency
- [ ] Generate initial `database.types.ts`
- [ ] Update `lib/supabase/types.ts` to import from generated file
- [ ] Add `db:types` script to package.json
- [ ] Add `prebuild` hook
- [ ] Configure CI/CD with Supabase access token
- [ ] Remove manually defined types that are now auto-generated
