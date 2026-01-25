# Customer Authentication & Portal - QA Checklist

## Overview
This checklist covers manual testing for the customer authentication system and customer portal.

**Important:** Before testing, you must apply the database migration:
```bash
# Apply the migration to add customer_user_id to preorders
supabase db push
# Or manually run: supabase/migrations/20260123000000_add_customer_user_id_to_preorders.sql
```

---

## Prerequisites
- [ ] Database migration `20260123000000_add_customer_user_id_to_preorders.sql` has been applied
- [ ] Environment variables are set:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SECRET_KEY`
  - `NEXT_PUBLIC_SITE_URL`
- [ ] Development server is running (`pnpm dev`)

---

## 1. Customer Registration

### Test Case 1.1: Successful Registration
- [ ] Navigate to `/account/register`
- [ ] Fill in all required fields:
  - Full name: "Test Customer"
  - Email: unique email (e.g., `test+{timestamp}@example.com`)
  - Phone: "+359 888 123 456" (optional)
  - Password: "TestPass123!" (min 8 chars)
  - Confirm password: "TestPass123!"
- [ ] Check "Marketing consent" checkbox
- [ ] Click "Регистрирай се"
- [ ] **Expected:** Redirected to `/account` dashboard
- [ ] **Expected:** Welcome message shows customer name

### Test Case 1.2: Registration Validation
- [ ] Try registering with password < 8 characters
  - **Expected:** Validation error
- [ ] Try registering with mismatched passwords
  - **Expected:** "Паролите не съвпадат" error
- [ ] Try registering with invalid email format
  - **Expected:** Validation error
- [ ] Try registering with existing email
  - **Expected:** "Този имейл адрес вече е регистриран" error

---

## 2. Customer Login

### Test Case 2.1: Successful Login
- [ ] Navigate to `/account/login`
- [ ] Enter valid credentials
- [ ] Click "Влез"
- [ ] **Expected:** Redirected to `/account` dashboard
- [ ] **Expected:** Session persists on page refresh

### Test Case 2.2: Login Validation
- [ ] Try logging in with incorrect password
  - **Expected:** "Невалиден имейл или парола" error
- [ ] Try logging in with non-existent email
  - **Expected:** "Невалиден имейл или парола" error
- [ ] Try accessing `/account` without logging in
  - **Expected:** Redirected to `/account/login?redirect=/account`

### Test Case 2.3: Already Logged In
- [ ] Log in successfully
- [ ] Navigate to `/account/login`
- [ ] **Expected:** Automatically redirected to `/account`

---

## 3. Password Reset Flow

### Test Case 3.1: Request Password Reset
- [ ] Navigate to `/account/forgot-password`
- [ ] Enter registered email address
- [ ] Click "Изпрати инструкции"
- [ ] **Expected:** Success message displayed
- [ ] **Expected:** Password reset email sent (check email/Supabase logs)

### Test Case 3.2: Reset Password
- [ ] Click reset link from email
- [ ] **Expected:** Redirected to `/account/reset-password` with session
- [ ] Enter new password (min 8 chars)
- [ ] Confirm new password
- [ ] Click "Промени паролата"
- [ ] **Expected:** Redirected to `/account/login?reset=success`
- [ ] Log in with new password
- [ ] **Expected:** Login successful

### Test Case 3.3: Expired Reset Link
- [ ] Try using an old/expired reset link
- [ ] **Expected:** "Сесията е изтекла" error

---

## 4. Customer Profile Management

### Test Case 4.1: View Profile
- [ ] Log in as customer
- [ ] Navigate to `/account/profile`
- [ ] **Expected:** Form pre-filled with current profile data
- [ ] **Expected:** Full name, phone, language, marketing consent visible

### Test Case 4.2: Update Profile
- [ ] Change full name to "Updated Name"
- [ ] Change phone to "+359 999 888 777"
- [ ] Change preferred language to "English"
- [ ] Toggle marketing consent
- [ ] Click "Запази промените"
- [ ] **Expected:** "Профилът е актуализиран успешно!" message
- [ ] Refresh page
- [ ] **Expected:** Changes persisted

### Test Case 4.3: Profile Validation
- [ ] Try saving with empty full name
  - **Expected:** Validation error
- [ ] Try saving with invalid phone format
  - **Expected:** Validation error

---

## 5. Preorder Management

### Test Case 5.1: View Preorders (Empty State)
- [ ] Log in as new customer (no preorders)
- [ ] Navigate to `/account/preorders`
- [ ] **Expected:** "Все още нямате поръчки" message
- [ ] **Expected:** "Направи поръчка" button visible

### Test Case 5.2: View Claimed Preorders
- [ ] Create a preorder while logged in (or manually link preorder to customer_user_id)
- [ ] Navigate to `/account/preorders`
- [ ] **Expected:** Preorder displayed with:
  - Order ID (e.g., FF-230126-ABC123)
  - Box type
  - Creation date
  - "Активна" status badge
  - "Детайли" button

### Test Case 5.3: Claim Unclaimed Preorder
- [ ] Create a preorder with customer's email (while logged out or before registration)
- [ ] Log in as customer
- [ ] Navigate to `/account/preorders`
- [ ] **Expected:** Yellow banner showing unclaimed preorders
- [ ] Click "Свържи" button
- [ ] **Expected:** "Поръчката е свързана успешно" message
- [ ] **Expected:** Preorder moved to "Моите поръчки" section

### Test Case 5.4: Claim Validation
- [ ] Try claiming preorder with different email
  - **Expected:** "Имейлът на поръчката не съвпада" error
- [ ] Try claiming already claimed preorder
  - **Expected:** "Тази поръчка вече е свързана с друг акаунт" error

---

## 6. Route Protection & Middleware

### Test Case 6.1: Protected Routes (Unauthenticated)
- [ ] Log out
- [ ] Try accessing `/account`
  - **Expected:** Redirected to `/account/login?redirect=/account`
- [ ] Try accessing `/account/profile`
  - **Expected:** Redirected to `/account/login?redirect=/account/profile`
- [ ] Try accessing `/account/preorders`
  - **Expected:** Redirected to `/account/login?redirect=/account/preorders`

### Test Case 6.2: Public Routes (Authenticated)
- [ ] Log in as customer
- [ ] Try accessing `/account/login`
  - **Expected:** Redirected to `/account`
- [ ] Try accessing `/account/register`
  - **Expected:** Redirected to `/account`

### Test Case 6.3: Staff vs Customer Separation
- [ ] Log in as staff user
- [ ] Try accessing `/account/login`
  - **Expected:** NOT redirected (staff can access)
- [ ] Log in as customer
- [ ] Try accessing `/staff/dashboard`
  - **Expected:** Access denied or redirected

---

## 7. Logout

### Test Case 7.1: Logout
- [ ] Log in as customer
- [ ] Navigate to `/account`
- [ ] Click "Излез от профила" button
- [ ] **Expected:** Redirected to home or login page
- [ ] Try accessing `/account`
  - **Expected:** Redirected to `/account/login`
- [ ] **Expected:** Session cleared (no cookies)

---

## 8. Security Tests

### Test Case 8.1: Session Storage
- [ ] Log in as customer
- [ ] Open browser DevTools > Application > Cookies
- [ ] **Expected:** Session stored in httpOnly cookies (not localStorage)
- [ ] **Expected:** Cookie names start with `sb-` (Supabase)

### Test Case 8.2: API Authorization
- [ ] Log out
- [ ] Try calling `GET /api/account/me` directly (e.g., via Postman/curl)
  - **Expected:** 401 Unauthorized
- [ ] Try calling `GET /api/account/preorders` without auth
  - **Expected:** 401 Unauthorized

### Test Case 8.3: RLS Enforcement
- [ ] Log in as Customer A
- [ ] Note Customer A's user_id
- [ ] Try to access Customer B's data via API (if possible)
  - **Expected:** Access denied by RLS

### Test Case 8.4: Input Validation
- [ ] Try SQL injection in email field: `test@example.com'; DROP TABLE customers; --`
  - **Expected:** Treated as literal string, no SQL execution
- [ ] Try XSS in full name: `<script>alert('XSS')</script>`
  - **Expected:** Escaped/sanitized, no script execution

---

## 9. Error Handling

### Test Case 9.1: Network Errors
- [ ] Disconnect network
- [ ] Try logging in
  - **Expected:** "Грешка при влизане" error message
- [ ] Try loading profile
  - **Expected:** "Грешка при зареждане на профила" error message

### Test Case 9.2: Server Errors
- [ ] Temporarily break API route (e.g., invalid Supabase query)
- [ ] Try the affected operation
  - **Expected:** User-friendly error message (not raw error)

---

## 10. Cross-Browser & Responsive Testing

### Test Case 10.1: Browser Compatibility
- [ ] Test on Chrome
- [ ] Test on Firefox
- [ ] Test on Safari
- [ ] Test on Edge
- [ ] **Expected:** Consistent behavior across browsers

### Test Case 10.2: Mobile Responsive
- [ ] Test on mobile viewport (375px width)
- [ ] **Expected:** Forms and buttons usable
- [ ] **Expected:** No horizontal scroll
- [ ] **Expected:** Touch-friendly button sizes

---

## 11. Integration with Existing Features

### Test Case 11.1: Anonymous Preorder Flow
- [ ] Create preorder while logged out
- [ ] Complete preorder form
- [ ] **Expected:** Preorder created with `customer_user_id = NULL`
- [ ] Register/login with same email
- [ ] **Expected:** Preorder appears in "unclaimed" section

### Test Case 11.2: Staff Auth Not Affected
- [ ] Log in as staff user via `/staff/login`
- [ ] **Expected:** Staff login still works
- [ ] **Expected:** Staff dashboard accessible
- [ ] **Expected:** No interference with customer auth

---

## 12. Performance & UX

### Test Case 12.1: Loading States
- [ ] Observe loading indicators during:
  - Login
  - Registration
  - Profile load
  - Preorders load
- [ ] **Expected:** Spinner or loading text visible
- [ ] **Expected:** Buttons disabled during loading

### Test Case 12.2: Success Feedback
- [ ] Perform successful operations:
  - Registration
  - Login
  - Profile update
  - Preorder claim
- [ ] **Expected:** Clear success messages
- [ ] **Expected:** Appropriate redirects

---

## Known Issues / Notes

- **Type Generation:** The `claim_preorder_by_email` RPC function is not in generated types yet. Run `pnpm supabase:types` after applying migration to regenerate types.
- **Email Verification:** If Supabase email verification is enabled, test the email confirmation flow.
- **Password Strength:** Consider adding password strength indicator in UI.

---

## Sign-Off

- [ ] All critical test cases passed
- [ ] No security vulnerabilities found
- [ ] Performance acceptable
- [ ] Ready for production deployment

**Tested by:** _______________  
**Date:** _______________  
**Environment:** _______________  
**Notes:** _______________
