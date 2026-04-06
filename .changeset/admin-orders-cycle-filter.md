---
"fitflow": minor
---

Admin orders: default to current delivery cycle with cycle selector dropdown

- Add delivery cycle dropdown filter to admin orders page, defaulting to the current/upcoming cycle
- Extend orders data layer with `cycleId` filter for `getOrdersPaginated` and `getOrdersCount`
- Add `getDeliveryCyclesForDropdown` and `getCurrentCycleId` helpers with `CycleDropdownOption` type
- Replace config-based delivery date banner with actual Speedy send date calculated from cycle delivery date
- Show total vs eligible subscription breakdown in order generation preview
