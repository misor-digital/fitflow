# GDPR Cookie Consent System

## Overview

This document describes the GDPR-compliant cookie consent system implemented for FitFlow.

## Architecture

### File Structure

```
lib/
├── consent/
│   ├── index.ts           # Public exports
│   ├── types.ts           # TypeScript types and constants
│   └── consentStore.ts    # Zustand store for consent state
├── legal/
│   └── index.ts           # Legal document utilities

components/
├── CookieConsentBanner.tsx    # Main consent banner + preferences modal
├── CookieSettingsButton.tsx   # Button to reopen preferences
├── ConditionalScripts.tsx     # Consent-gated script loading
└── LegalContent.tsx           # Legal document renderer

app/
├── terms/page.tsx         # Terms of Service page
├── privacy/page.tsx       # Privacy Policy page
└── cookies/page.tsx       # Cookie Policy page (with settings button)

content/legal/
├── terms.md               # Terms content (source of truth)
├── privacy-policy.md      # Privacy policy content
└── cookie-policy.md       # Cookie policy content
```

## Consent State Model

```typescript
interface ConsentPreferences {
  necessary: true;      // Always true, cannot be disabled
  analytics: boolean;   // Opt-in for analytics cookies
  marketing: boolean;   // Opt-in for marketing cookies
}

interface ConsentRecord {
  preferences: ConsentPreferences;
  timestamp: string;    // ISO timestamp when consent was given
  version: number;      // Policy version for re-prompting
}
```

### Versioning

The `CONSENT_VERSION` constant in `lib/consent/types.ts` should be incremented whenever the cookie policy changes significantly. This will trigger a re-prompt for all users.

## Cookie Categories

### 1. Necessary (Always On)
- Session cookies for authentication
- CSRF protection tokens
- Essential functionality cookies
- **Cannot be disabled by user**

### 2. Analytics (Opt-in)
- Google Analytics
- Performance monitoring
- Usage statistics
- **Requires explicit consent**

### 3. Marketing (Opt-in)
- Facebook Pixel
- Google Ads
- Retargeting cookies
- **Requires explicit consent**

## User Actions

The consent banner provides three actions:

1. **Accept All** - Enables all cookie categories
2. **Reject Non-Essential** - Only necessary cookies (default)
3. **Customize** - Opens preferences modal for granular control

## GDPR Compliance Features

### ✅ Implemented

1. **Prior Consent Required**
   - No analytics/marketing scripts load before consent
   - `ConditionalScripts` component checks consent state before rendering

2. **Explicit Opt-in**
   - Non-essential cookies default to OFF
   - User must actively enable them

3. **Granular Control**
   - Users can enable/disable each category independently
   - Preferences modal allows fine-grained control

4. **Easy Withdrawal**
   - Cookie settings button on /cookies page
   - Can change preferences at any time

5. **Consent Record**
   - Timestamp stored with consent
   - Version tracking for policy changes

6. **Clear Information**
   - Link to cookie policy in banner
   - Descriptions for each cookie category

7. **No Cookie Walls**
   - Site is fully functional with only necessary cookies
   - No content blocked for rejecting cookies

### ⚠️ Considerations & Tradeoffs

1. **LocalStorage vs Cookies**
   - Consent is stored in localStorage, not a cookie
   - Pros: Simpler, no server-side handling needed
   - Cons: Not shared across subdomains

2. **Script Unloading**
   - Once scripts are loaded, they cannot be unloaded without page refresh
   - If user revokes consent, scripts won't load on next visit
   - Consider adding a page refresh prompt on consent change

3. **Third-Party Cookies**
   - We control when scripts load, but not what cookies they set
   - Third-party scripts (GA, FB) set their own cookies
   - Document this in cookie policy

4. **Server-Side Tracking**
   - This system only controls client-side scripts
   - Server-side analytics would need separate handling

## Usage

### Adding New Tracking Scripts

Edit `app/layout.tsx` to add tracking IDs:

```tsx
<ConditionalScripts 
  googleAnalyticsId="G-XXXXXXXXXX"
  facebookPixelId="XXXXXXXXXXXXXXX"
  googleAdsId="AW-XXXXXXXXXX"
/>
```

### Checking Consent in Components

```tsx
'use client';
import { useConsentStore } from '@/lib/consent';

function MyComponent() {
  const { hasConsent } = useConsentStore();
  
  if (hasConsent('analytics')) {
    // Track something
  }
}
```

### Updating Cookie Policy Version

When the cookie policy changes significantly:

1. Update `content/legal/cookie-policy.md`
2. Increment `CONSENT_VERSION` in `lib/consent/types.ts`
3. All users will be re-prompted for consent

## Legal Pages

Legal pages are server-rendered from markdown files in `content/legal/`:

- `/terms` → `content/legal/terms.md`
- `/privacy` → `content/legal/privacy-policy.md`
- `/cookies` → `content/legal/cookie-policy.md`

### Updating Legal Content

1. Edit the markdown file in `content/legal/`
2. Changes are reflected immediately (no rebuild needed in dev)
3. Update the "Last Updated" date in the page component if needed

## Testing Checklist

- [x] Banner appears on first visit
- [x] "Accept All" enables all categories and hides banner
- [x] "Reject Non-Essential" keeps only necessary and hides banner
- [x] Preferences modal allows individual toggles
- [x] Consent persists across page refreshes
- [x] Scripts only load after consent is given
- [x] Cookie settings button on `/cookies` page reopens modal
- [x] Incrementing CONSENT_VERSION re-prompts users
- [x] Legal pages render correctly from markdown
- [x] Footer links work correctly

## Future Improvements

1. **Consent Analytics** - Track consent rates (with consent!)
2. **A/B Testing** - Test different banner designs
3. **Geo-targeting** - Show banner only in EU
4. **Cookie Scanning** - Automated cookie inventory
5. **Consent Proof** - Server-side consent logging for audits
