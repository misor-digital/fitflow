import type { CatalogData, PriceInfo } from '@/lib/catalog';
import type { DeliveryCycleRow } from '@/lib/supabase/types';

// ============================================================================
// Conversion Source Type
// ============================================================================

export interface SubscriptionConversionSource {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  customerFullName: string;
  customerPhone: string | null;
  userId: string | null;
  boxType: string;
  wantsPersonalization: boolean;
  sports: string[] | null;
  colors: string[] | null;
  flavors: string[] | null;
  dietary: string[] | null;
  sizeUpper: string | null;
  sizeLower: string | null;
  conversionToken: string;
  campaignPromoCode: string | null;
}

// ============================================================================
// Component Props
// ============================================================================

export interface SubscriptionConversionFlowProps {
  source: SubscriptionConversionSource;
  priceInfo: PriceInfo;
  catalogData: CatalogData;
  boxTypeNames: Record<string, string>;
  upcomingCycle: DeliveryCycleRow | null;
}
