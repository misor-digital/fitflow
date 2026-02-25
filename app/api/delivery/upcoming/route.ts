import { NextResponse } from 'next/server';
import { getDeliveryConfigMap, getUpcomingCycle } from '@/lib/data';
import {
  getDeliveryConfig,
  calculateNextDeliveryDate,
  isFirstDelivery,
  formatMonthYear,
} from '@/lib/delivery';

// ============================================================================
// GET /api/delivery/upcoming — Public: Next delivery date
// ============================================================================

export async function GET(): Promise<NextResponse> {
  try {
    // 1. Load config + upcoming cycle
    const [configMap, upcomingCycle] = await Promise.all([
      getDeliveryConfigMap(),
      getUpcomingCycle(),
    ]);

    const config = getDeliveryConfig(configMap);

    // 2. Build response
    if (upcomingCycle) {
      const response = NextResponse.json({
        cycle: {
          id: upcomingCycle.id,
          deliveryDate: upcomingCycle.delivery_date,
          title: upcomingCycle.title ?? `${formatMonthYear(upcomingCycle.delivery_date)} кутия`,
        },
        isFirstDelivery: isFirstDelivery(config),
        nextDeliveryDate: upcomingCycle.delivery_date,
      });

      response.headers.set(
        'Cache-Control',
        'public, s-maxage=300, stale-while-revalidate=600',
      );
      return response;
    }

    // 3. No upcoming cycle — derive from config
    const nextDate = calculateNextDeliveryDate(config);
    const nextDateStr = nextDate.toISOString().split('T')[0];

    const response = NextResponse.json({
      cycle: null,
      isFirstDelivery: isFirstDelivery(config),
      nextDeliveryDate: nextDateStr,
    });

    response.headers.set(
      'Cache-Control',
      'public, s-maxage=300, stale-while-revalidate=600',
    );
    return response;
  } catch (error) {
    console.error('Error fetching upcoming delivery:', error);
    return NextResponse.json(
      { error: 'Грешка при зареждане на информация за доставка.' },
      { status: 500 },
    );
  }
}
