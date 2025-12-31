# fitflow

## 0.3.1

### Patch Changes

- 885f931: TEST

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
