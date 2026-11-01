---
"fitflow": minor
---

Compare Speedy pickup and drop-off prices per order in the dispatch panel

A new „Изчисли цени (N)“ button in `/admin/dispatch` runs Speedy's price calculation for every order without a waybill, in both sender modes, without creating anything. The „Марж“ column is split into „Pick up“ and „Drop off“ sub-columns. After the calculation they are highlighted and show the estimated margin per order, with the better option in bold and Speedy errors shown as ⚠ with the reason. A totals row compares both modes for the whole cycle, subtracting the configured pickup visit fee, and shows the total for the selected modes. A warning appears when the cycle would mix pickup and drop-off. Estimates stay in the browser only and are cleared on refresh or cycle change.

Each order without a waybill has a „Pick up / Drop off“ toggle that preselects the cheaper mode after the calculation. Single and bulk waybill creation now send the chosen mode per order (`senderMode` / `senderModes`), falling back to the configured mode. Once a waybill exists, only its actual margin is shown, under the mode it was created with. The new `POST /api/admin/speedy/calculate/bulk` route prices up to 50 orders per request with limited parallel calls. The order-to-shipment mapping that was copied in three routes now lives in one shared helper.
