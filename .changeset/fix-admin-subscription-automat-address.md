---
"fitflow": patch
---

Fix Speedy automat addresses showing as an empty „До адрес“ in the admin subscription view

The admin subscription detail page checked only for `speedy_office`, so subscriptions delivering to a Speedy automat showed the „До адрес“ badge with no address text (pickup rows have no street fields). The „Адрес“ field and the address picker now show a „Speedy автомат“ badge with the automat name and address. Badges come from a map typed by delivery method, so TypeScript flags any delivery method that has no badge.

Address formatting now lives in shared helpers in `lib/order/format` (`formatAddressOneLine`, `formatAddressDisplay`, `speedyPointName`, `isSpeedyPickup`). The admin and account address managers, the subscription address-changed email and the admin orders delivery column now use them instead of their own copies, with unchanged output. An empty Speedy pickup point name now falls back to „Speedy офис“ / „Speedy автомат“ instead of showing blank.
