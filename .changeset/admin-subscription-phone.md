---
"fitflow": patch
---

Show the customer phone number in the admin subscription views

The subscription detail page now shows `Тел:` under the delivery address, in the same way as the direct order data view. It uses the default address phone, which is the number copied into generated orders. If that is empty, it uses the profile phone and marks it „(от профила)“. The phone is a sanitized `tel:` link, and the inline new-address form is pre-filled with the same number. The subscriptions list also shows the profile phone in the „Клиент“ column, loaded by the existing profile query with no extra request.
