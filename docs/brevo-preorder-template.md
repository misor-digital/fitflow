# Brevo Template: Preorder Conversion Email

> **Template name**: `preorder-conversion`
> **Template ID env var**: `BREVO_TEMPLATE_PREORDER_CONVERSION`
> **Config path**: `EMAIL_CONFIG.templates.preorderConversion`

## Setup Instructions

1. Open the Brevo dashboard → **Campaigns** → **Templates**
2. Create a new template using the **Drag & Drop Editor**
3. Name it `preorder-conversion`
4. Copy the Template ID and set it in your environment:
   ```
   BREVO_TEMPLATE_PREORDER_CONVERSION=<template_id>
   ```

---

## Required Template Parameters

These parameters are populated per-recipient by `buildPreorderConversionRecipients()`.

| Parameter | Brevo Syntax | Type | Example |
|-----------|-------------|------|---------|
| Full Name | `{{ params.FULL_NAME }}` | string | "Иван Петров" |
| Box Type | `{{ params.BOX_TYPE }}` | string | "Класик" |
| Conversion URL | `{{ params.CONVERSION_URL }}` | string | `https://fitflow.bg/order/convert?token=abc123` |
| Promo Code | `{{ params.PROMO_CODE }}` | string or null | "EARLY20" |
| Original Price (EUR) | `{{ params.ORIGINAL_PRICE_EUR }}` | number or null | 39.90 |
| Final Price (EUR) | `{{ params.FINAL_PRICE_EUR }}` | number or null | 31.92 |

### Parameter mapping (recipient-builder → Brevo)

The `recipient-builder.ts` stores params as camelCase. The campaign engine merges
campaign-level params with per-recipient params when sending. Brevo templates
access them via `{{ params.PARAM_NAME }}` (uppercase).

To bridge camelCase → UPPER_SNAKE, configure the Brevo template to use the
camelCase keys directly:

- `{{ params.fullName }}` → Recipient's full name
- `{{ params.boxType }}` → Box type display name
- `{{ params.conversionUrl }}` → Personalised conversion link
- `{{ params.promoCode }}` → Promo code (may be null)
- `{{ params.originalPriceEur }}` → Original price in EUR (may be null)
- `{{ params.finalPriceEur }}` → Final price after discount in EUR (may be null)

---

## Template Design Guidelines (Bulgarian)

### Subject Line

```
🎁 Вашата FitFlow кутия е готова — завършете поръчката!
```

### Header Section

- FitFlow logo (use hosted image URL from `/public/storage/`)
- Headline: **Вашата предварителна поръчка е готова**

### Body Section

1. **Personalised greeting**:
   ```
   Здравейте, {{ params.fullName }}!
   ```

2. **Box type mention**:
   ```
   Вашата кутия "{{ params.boxType }}" е подготвена и ви очаква.
   ```

3. **Price section** (conditional on promo):
   - If `{{ params.promoCode }}` exists:
     ```
     Оригинална цена: €{{ params.originalPriceEur }}  (strikethrough)
     Цена с отстъпка: €{{ params.finalPriceEur }}
     Промо код: {{ params.promoCode }}
     ```
   - If no promo:
     ```
     Цена: €{{ params.finalPriceEur }}
     ```

4. **CTA Button**:
   - Text: **Завършете поръчката**
   - Link: `{{ params.conversionUrl }}`
   - Style: Brand green (#22c55e), white text, large, centered

### Promo Discount Section (Conditional)

If `{{ params.promoCode }}` is not null, show a highlighted box:
```
🏷️ Вашият промо код: {{ params.promoCode }}
   Използвайте го при завършване на поръчката за отстъпка!
```

### Footer Section

- Brevo handles unsubscribe links automatically (`{{ unsubscribe }}`)
- Legal text: "Получавате този имейл, защото сте направили предварителна поръчка на fitflow.bg"
- Contact: info@fitflow.bg

---

## Testing

1. Create a campaign via `POST /api/admin/campaigns` with `type: 'preorder-conversion'`
2. Send a test email via `POST /api/admin/campaigns/:id/send-test` with your email
3. Verify all parameters render correctly in the received email
4. Check that the CTA button links to a valid conversion URL
5. Verify promo code section shows/hides correctly based on whether promoCode is null

---

## Brevo Conditional Display

Use Brevo's template language for conditional sections:

```html
{% if params.promoCode %}
  <!-- Show promo discount section -->
{% endif %}

{% if params.originalPriceEur %}
  <!-- Show strikethrough original price -->
{% endif %}
```
