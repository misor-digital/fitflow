import { NextResponse } from 'next/server';
import {
  getCurrentRevealedCycle,
  getCycleItems,
  getUpcomingCycles,
  getDeliveryConfigMap,
} from '@/lib/data';
import { getDeliveryConfig } from '@/lib/delivery';

// ============================================================================
// GET /api/delivery/current - Public: Current revealed box
// ============================================================================

export async function GET(): Promise<NextResponse> {
  try {
    // 1. Check if revealed box feature is enabled
    const configMap = await getDeliveryConfigMap();
    const config = getDeliveryConfig(configMap);

    if (!config.revealedBoxEnabled) {
      return NextResponse.json(
        { error: 'not_available' },
        { status: 404 },
      );
    }

    // 2. Load current revealed cycle
    const cycle = await getCurrentRevealedCycle();
    if (!cycle) {
      return NextResponse.json(
        { error: 'not_available' },
        { status: 404 },
      );
    }

    // 3. Load cycle items + upcoming cycle (for "available until")
    const [items, upcomingCycles] = await Promise.all([
      getCycleItems(cycle.id),
      getUpcomingCycles(),
    ]);

    // Pick the first cycle whose cutoff hasn't passed
    const now = new Date();
    const upcomingCycle = upcomingCycles.find(c => !c.order_cutoff_at || new Date(c.order_cutoff_at) > now) ?? null;

    // 4. Build response
    const response = NextResponse.json({
      cycle: {
        id: cycle.id,
        deliveryDate: cycle.delivery_date,
        title: cycle.title,
        description: cycle.description,
      },
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        imageUrl: item.image_url,
        category: item.category,
      })),
      availableUntil: upcomingCycle?.delivery_date ?? null,
    });

    response.headers.set(
      'Cache-Control',
      'public, s-maxage=300, stale-while-revalidate=600, stale-if-error=86400',
    );
    return response;
  } catch (error) {
    console.error('Error fetching current revealed box:', error);
    return NextResponse.json(
      { error: 'Грешка при зареждане на текущата кутия.' },
      { status: 500 },
    );
  }
}
