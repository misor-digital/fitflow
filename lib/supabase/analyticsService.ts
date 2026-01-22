/**
 * Analytics Service
 * Handles revenue analytics, order statistics, and financial reporting
 * Part of Phase 3: Marketing & Internal Tooling - Week 3
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Server-side Supabase client with service role
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY!;
  
  return createClient<Database>(supabaseUrl, supabaseServiceKey);
};

export interface ServiceResult<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

// Note: These interfaces are not used - analytics queries use actual DB columns

export interface RevenueStats {
  totalRevenue: number;
  averageOrderValue: number;
  totalOrders: number;
  growthRate: number;
  periodRevenue: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
}

export interface OrderStats {
  total: number;
  pending: number;
  fulfilled: number;
  cancelled: number;
  conversionRate: number;
}

export interface ProductStats {
  boxTypeId: string;
  boxTypeName: string;
  totalOrders: number;
  totalRevenue: number;
  averagePrice: number;
}

// ============================================================================
// REVENUE ANALYTICS
// ============================================================================

/**
 * Get overall revenue statistics
 */
export async function getRevenueStats(
  fromDate?: string,
  toDate?: string
): Promise<ServiceResult<RevenueStats>> {
  const supabase = getServiceClient();
  
  try {
    // Build query
    let query = supabase
      .from('preorders')
      .select('total_price, created_at, status');
    
    if (fromDate) {
      query = query.gte('created_at', fromDate);
    }
    if (toDate) {
      query = query.lte('created_at', toDate);
    }
    
    const { data: orders, error } = await query;
    
    if (error) {
      console.error('Failed to get revenue stats:', error);
      return { success: false, error: error.message };
    }
    
    // Calculate stats
    const totalOrders = orders?.length || 0;
    const totalRevenue = orders?.reduce((sum: number, order: any) => sum + (order.total_price || 0), 0) || 0;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Calculate growth rate (compare to previous period)
    const periodDays = fromDate && toDate 
      ? Math.ceil((new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24))
      : 30;
    
    const previousFromDate = new Date(new Date(fromDate || new Date()).getTime() - periodDays * 24 * 60 * 60 * 1000).toISOString();
    const previousToDate = fromDate || new Date().toISOString();
    
    const { data: previousOrders } = await supabase
      .from('preorders')
      .select('total_price')
      .gte('created_at', previousFromDate)
      .lte('created_at', previousToDate);
    
    const previousRevenue = previousOrders?.reduce((sum: number, order: any) => sum + (order.total_price || 0), 0) || 0;
    const growthRate = previousRevenue > 0 
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
      : 0;
    
    // Group by date for period revenue
    const periodRevenue = orders?.reduce((acc: any[], order: any) => {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      const existing = acc.find(item => item.date === date);
      
      if (existing) {
        existing.revenue += order.total_price || 0;
        existing.orders += 1;
      } else {
        acc.push({
          date,
          revenue: order.total_price || 0,
          orders: 1,
        });
      }
      
      return acc;
    }, [] as Array<{ date: string; revenue: number; orders: number }>) || [];
    
    return {
      success: true,
      data: {
        totalRevenue,
        averageOrderValue,
        totalOrders,
        growthRate,
        periodRevenue: periodRevenue.sort((a, b) => a.date.localeCompare(b.date)),
      },
    };
  } catch (error) {
    console.error('Error getting revenue stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get revenue by box type
 */
export async function getRevenueByBoxType(): Promise<ServiceResult<ProductStats[]>> {
  const supabase = getServiceClient();
  
  try {
    // Note: preorders table uses box_type (enum), not box_type_id (foreign key)
    const { data: orders, error } = await supabase
      .from('preorders')
      .select('box_type, final_price_eur');
    
    if (error) {
      console.error('Failed to get revenue by box type:', error);
      return { success: false, error: error.message };
    }
    
    // Get box types
    const { data: boxTypes } = await supabase
      .from('box_types')
      .select('id, name');
    
    // Create a map for faster lookup
    const boxTypeMap = new Map<string, string>();
    boxTypes?.forEach((bt: { id: string; name: string }) => {
      boxTypeMap.set(bt.id, bt.name);
    });
    
    // Group by box type
    const stats = orders?.reduce((acc: ProductStats[], order) => {
      const boxTypeId = order.box_type;
      if (!boxTypeId) return acc;
      
      const existing = acc.find(item => item.boxTypeId === boxTypeId);
      const price = order.final_price_eur ?? 0;
      
      if (existing) {
        existing.totalOrders += 1;
        existing.totalRevenue += price;
        existing.averagePrice = existing.totalRevenue / existing.totalOrders;
      } else {
        acc.push({
          boxTypeId,
          boxTypeName: boxTypeMap.get(boxTypeId) || 'Unknown',
          totalOrders: 1,
          totalRevenue: price,
          averagePrice: price,
        });
      }
      
      return acc;
    }, [] as ProductStats[]) || [];
    
    return {
      success: true,
      data: stats.sort((a: ProductStats, b: ProductStats) => b.totalRevenue - a.totalRevenue),
    };
  } catch (error) {
    console.error('Error getting revenue by box type:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get promo code usage statistics
 */
export async function getPromoCodeUsage(): Promise<ServiceResult<any[]>> {
  const supabase = getServiceClient();
  
  try {
    const { data: orders, error } = await supabase
      .from('preorders')
      .select('promo_code_id, discount_amount')
      .not('promo_code_id', 'is', null);
    
    if (error) {
      console.error('Failed to get promo code usage:', error);
      return { success: false, error: error.message };
    }
    
    // Get promo codes - Note: promo_codes table uses discount_percent, not discount_type/discount_value
    const { data: promoCodes } = await supabase
      .from('promo_codes')
      .select('id, code, discount_percent');
    
    // Create a map for faster lookup
    const promoCodeMap = new Map<string, { code: string; discount_percent: number }>();
    promoCodes?.forEach((pc) => {
      promoCodeMap.set(pc.id, { code: pc.code, discount_percent: pc.discount_percent });
    });
    
    // Group by promo code
    const usage = orders?.reduce((acc: any[], order: any) => {
      const promoCodeId = order.promo_code_id;
      if (!promoCodeId) return acc;
      
      const existing = acc.find(item => item.promoCodeId === promoCodeId);
      
      if (existing) {
        existing.usageCount += 1;
        existing.totalDiscount += order.discount_amount || 0;
      } else {
        const promoCode = promoCodeMap.get(promoCodeId);
        acc.push({
          promoCodeId,
          code: promoCode?.code || 'Unknown',
          discountPercent: promoCode?.discount_percent || 0,
          usageCount: 1,
          totalDiscount: order.discount_amount || 0,
        });
      }
      
      return acc;
    }, [] as any[]) || [];
    
    return {
      success: true,
      data: usage.sort((a, b) => b.usageCount - a.usageCount),
    };
  } catch (error) {
    console.error('Error getting promo code usage:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// ORDER ANALYTICS
// ============================================================================

/**
 * Get order statistics
 */
export async function getOrderStats(): Promise<ServiceResult<OrderStats>> {
  const supabase = getServiceClient();
  
  try {
    const { data: orders, error } = await supabase
      .from('preorders')
      .select('status');
    
    if (error) {
      console.error('Failed to get order stats:', error);
      return { success: false, error: error.message };
    }
    
    const total = orders?.length || 0;
    const pending = orders?.filter((o: any) => o.status === 'pending').length || 0;
    const fulfilled = orders?.filter((o: any) => o.status === 'fulfilled').length || 0;
    const cancelled = orders?.filter((o: any) => o.status === 'cancelled').length || 0;
    
    // Calculate conversion rate (fulfilled / total)
    const conversionRate = total > 0 ? (fulfilled / total) * 100 : 0;
    
    return {
      success: true,
      data: {
        total,
        pending,
        fulfilled,
        cancelled,
        conversionRate,
      },
    };
  } catch (error) {
    console.error('Error getting order stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get top products by orders
 */
export async function getTopProducts(limit: number = 10): Promise<ServiceResult<ProductStats[]>> {
  const result = await getRevenueByBoxType();
  
  if (!result.success || !result.data) {
    return result;
  }
  
  return {
    success: true,
    data: result.data.slice(0, limit),
  };
}

/**
 * Get customer lifetime value analytics
 */
export async function getCustomerLifetimeValue(): Promise<ServiceResult<any>> {
  const supabase = getServiceClient();
  
  try {
    const { data: orders, error } = await supabase
      .from('preorders')
      .select('customer_email, total_price');
    
    if (error) {
      console.error('Failed to get CLV:', error);
      return { success: false, error: error.message };
    }
    
    // Group by customer
    const customerStats = orders?.reduce((acc: any[], order: any) => {
      const email = order.customer_email;
      if (!email) return acc;
      
      const existing = acc.find(item => item.email === email);
      
      if (existing) {
        existing.orderCount += 1;
        existing.totalSpent += order.total_price || 0;
        existing.averageOrderValue = existing.totalSpent / existing.orderCount;
      } else {
        acc.push({
          email,
          orderCount: 1,
          totalSpent: order.total_price || 0,
          averageOrderValue: order.total_price || 0,
        });
      }
      
      return acc;
    }, [] as any[]) || [];
    
    // Calculate overall CLV
    const totalCustomers = customerStats.length;
    const totalRevenue = customerStats.reduce((sum, c) => sum + c.totalSpent, 0);
    const averageCLV = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
    
    return {
      success: true,
      data: {
        totalCustomers,
        averageCLV,
        topCustomers: customerStats
          .sort((a, b) => b.totalSpent - a.totalSpent)
          .slice(0, 10),
      },
    };
  } catch (error) {
    console.error('Error getting CLV:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
