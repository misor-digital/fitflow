import { NextResponse } from 'next/server';
import { getDeliveryPricing } from '@/lib/delivery/pricing';

/**
 * GET /api/delivery/pricing
 *
 * Public endpoint returning active delivery pricing for checkout UI.
 * Cached for 5 minutes at the CDN layer.
 */
export async function GET() {
  const pricing = await getDeliveryPricing();

  return NextResponse.json(
    {
      pricing: pricing.map((p) => ({
        method: p.deliveryMethod,
        priceEur: p.priceEur,
        label: p.labelBg,
      })),
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    },
  );
}
