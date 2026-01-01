/**
 * Catalog API Route
 * Provides box types, options, and pricing data to client components
 * All data is fetched from Supabase and cached
 */

import { NextResponse } from 'next/server';
import {
  getBoxTypes,
  getOptions,
  getColors,
  getOptionLabels,
  getAllBoxPricesMap,
} from '@/lib/data';
import type { PriceInfo } from '@/lib/preorder';
import type { OptionSetId } from '@/lib/supabase';

/**
 * GET /api/catalog
 * Returns catalog data for the frontend
 * 
 * Query params:
 * - type: 'boxTypes' | 'options' | 'prices' | 'all'
 * - optionSet: 'sports' | 'colors' | 'flavors' | 'dietary' | 'sizes' (when type=options)
 * - promoCode: string (when type=prices, for calculating discounted prices)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const optionSet = searchParams.get('optionSet') as OptionSetId | null;
    const promoCode = searchParams.get('promoCode');

    switch (type) {
      case 'boxTypes': {
        const boxTypes = await getBoxTypes();
        return NextResponse.json({ boxTypes });
      }

      case 'options': {
        if (!optionSet) {
          return NextResponse.json(
            { error: 'optionSet parameter required' },
            { status: 400 }
          );
        }
        
        if (optionSet === 'colors') {
          const colors = await getColors();
          return NextResponse.json({ options: colors });
        }
        
        const options = await getOptions(optionSet);
        return NextResponse.json({ options });
      }

      case 'labels': {
        if (!optionSet) {
          return NextResponse.json(
            { error: 'optionSet parameter required' },
            { status: 400 }
          );
        }
        const labels = await getOptionLabels(optionSet);
        return NextResponse.json({ labels });
      }

      case 'prices': {
        // Use optimized single-query function
        const pricesMap = await getAllBoxPricesMap(promoCode);
        
        // Transform to expected format
        const prices: Record<string, {
          originalPriceEur: number;
          originalPriceBgn: number;
          finalPriceEur: number;
          finalPriceBgn: number;
          discountPercent: number;
          discountAmountEur: number;
          discountAmountBgn: number;
        }> = {};

        const boxTypes: Record<string, string> = {};

        for (const [boxTypeId, priceInfo] of Object.entries(pricesMap) as [string, PriceInfo][]) {
          prices[boxTypeId] = {
            originalPriceEur: priceInfo.originalPriceEur,
            originalPriceBgn: priceInfo.originalPriceBgn,
            finalPriceEur: priceInfo.finalPriceEur,
            finalPriceBgn: priceInfo.finalPriceBgn,
            discountPercent: priceInfo.discountPercent,
            discountAmountEur: priceInfo.discountAmountEur,
            discountAmountBgn: priceInfo.discountAmountBgn,
          };
          boxTypes[boxTypeId] = priceInfo.boxTypeName;
        }

        return NextResponse.json({ prices, boxTypes });
      }

      case 'all':
      default: {
        const [boxTypes, sports, colors, flavors, dietary, sizes] = await Promise.all([
          getBoxTypes(),
          getOptions('sports'),
          getColors(),
          getOptions('flavors'),
          getOptions('dietary'),
          getOptions('sizes'),
        ]);

        // Build label maps
        const sportLabels = sports.reduce((acc, o) => { acc[o.id] = o.label; return acc; }, {} as Record<string, string>);
        const flavorLabels = flavors.reduce((acc, o) => { acc[o.id] = o.label; return acc; }, {} as Record<string, string>);
        const dietaryLabels = dietary.reduce((acc, o) => { acc[o.id] = o.label; return acc; }, {} as Record<string, string>);
        const colorLabels = colors.reduce((acc, c) => { acc[c.hex] = c.label; return acc; }, {} as Record<string, string>);
        const sizeLabels = sizes.reduce((acc, o) => { acc[o.id] = o.label; return acc; }, {} as Record<string, string>);

        // Build box type map
        const boxTypeNames = boxTypes.reduce((acc, bt) => { acc[bt.id] = bt.name; return acc; }, {} as Record<string, string>);

        return NextResponse.json({
          boxTypes,
          boxTypeNames,
          options: {
            sports,
            colors,
            flavors,
            dietary,
            sizes,
          },
          labels: {
            sports: sportLabels,
            colors: colorLabels,
            flavors: flavorLabels,
            dietary: dietaryLabels,
            sizes: sizeLabels,
          },
        });
      }
    }
  } catch (error) {
    console.error('Error in catalog API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch catalog data' },
      { status: 500 }
    );
  }
}
