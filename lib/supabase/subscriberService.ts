/**
 * Subscriber Service
 * Handles newsletter subscriber management and analytics
 * Part of Phase 3: Marketing & Internal Tooling
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Server-side Supabase client with service role
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY!;
  
  return createClient<Database>(supabaseUrl, supabaseServiceKey);
};

export interface Subscriber {
  id: string;
  email: string;
  status: 'pending' | 'subscribed' | 'unsubscribed';
  source: string;
  confirmed_at: string | null;
  created_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

export interface ListSubscribersParams {
  page?: number;
  limit?: number;
  status?: 'pending' | 'subscribed' | 'unsubscribed' | 'all';
  source?: string;
}

export interface ListSubscribersResult {
  success: boolean;
  error?: string;
  subscribers?: Subscriber[];
  total?: number;
}

export interface SearchSubscribersResult {
  success: boolean;
  error?: string;
  subscribers?: Subscriber[];
}

export interface SubscriberStats {
  total: number;
  subscribed: number;
  pending: number;
  unsubscribed: number;
  growthRate: number; // Percentage growth in last 30 days
  bySource: Array<{
    source: string;
    count: number;
  }>;
}

export interface ExportSubscribersResult {
  success: boolean;
  error?: string;
  csv?: string;
}

/**
 * List subscribers with pagination and filters
 */
export async function listSubscribers(
  params: ListSubscribersParams = {}
): Promise<ListSubscribersResult> {
  const supabase = getServiceClient();
  
  try {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;
    
    // Build query
    let query = supabase
      .from('newsletter_subscriptions')
      .select('*', { count: 'exact' });
    
    // Apply status filter
    if (params.status && params.status !== 'all') {
      query = query.eq('status', params.status);
    }
    
    // Apply source filter
    if (params.source) {
      query = query.eq('source', params.source);
    }
    
    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Failed to list subscribers:', error);
      return { success: false, error: error.message };
    }
    
    return {
      success: true,
      subscribers: data as Subscriber[],
      total: count || 0,
    };
  } catch (error) {
    console.error('Error listing subscribers:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Search subscribers by email
 */
export async function searchSubscribers(
  query: string
): Promise<SearchSubscribersResult> {
  const supabase = getServiceClient();
  
  try {
    const normalizedQuery = query.toLowerCase().trim();
    
    if (!normalizedQuery) {
      return { success: true, subscribers: [] };
    }
    
    const { data, error } = await supabase
      .from('newsletter_subscriptions')
      .select('*')
      .ilike('email', `%${normalizedQuery}%`)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) {
      console.error('Failed to search subscribers:', error);
      return { success: false, error: error.message };
    }
    
    return {
      success: true,
      subscribers: data as Subscriber[],
    };
  } catch (error) {
    console.error('Error searching subscribers:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Segment subscribers by filters
 */
export async function segmentSubscribers(
  source?: string,
  dateFrom?: string,
  dateTo?: string
): Promise<ListSubscribersResult> {
  const supabase = getServiceClient();
  
  try {
    let query = supabase
      .from('newsletter_subscriptions')
      .select('*', { count: 'exact' })
      .eq('status', 'subscribed');
    
    if (source) {
      query = query.eq('source', source);
    }
    
    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    
    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }
    
    query = query.order('created_at', { ascending: false });
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Failed to segment subscribers:', error);
      return { success: false, error: error.message };
    }
    
    return {
      success: true,
      subscribers: data as Subscriber[],
      total: count || 0,
    };
  } catch (error) {
    console.error('Error segmenting subscribers:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Export subscribers to CSV format
 */
export async function exportSubscribers(
  status?: 'pending' | 'subscribed' | 'unsubscribed' | 'all'
): Promise<ExportSubscribersResult> {
  const supabase = getServiceClient();
  
  try {
    let query = supabase
      .from('newsletter_subscriptions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Failed to export subscribers:', error);
      return { success: false, error: error.message };
    }
    
    // Generate CSV
    const headers = ['Email', 'Status', 'Source', 'Confirmed At', 'Created At'];
    const rows = (data as Subscriber[]).map(sub => [
      sub.email,
      sub.status,
      sub.source,
      sub.confirmed_at || '',
      sub.created_at,
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');
    
    return {
      success: true,
      csv,
    };
  } catch (error) {
    console.error('Error exporting subscribers:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get subscriber statistics
 */
export async function getSubscriberStats(): Promise<{
  success: boolean;
  error?: string;
  stats?: SubscriberStats;
}> {
  const supabase = getServiceClient();
  
  try {
    // Get total counts by status
    const { data: allSubscribers, error: allError } = await supabase
      .from('newsletter_subscriptions')
      .select('status, source, created_at');
    
    if (allError) {
      console.error('Failed to get subscriber stats:', allError);
      return { success: false, error: allError.message };
    }
    
    const total = allSubscribers?.length || 0;
    const subscribed = allSubscribers?.filter(s => s.status === 'subscribed').length || 0;
    const pending = allSubscribers?.filter(s => s.status === 'pending').length || 0;
    const unsubscribed = allSubscribers?.filter(s => s.status === 'unsubscribed').length || 0;
    
    // Calculate growth rate (last 30 days vs previous 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    
    const last30Days = allSubscribers?.filter(s => 
      new Date(s.created_at) >= thirtyDaysAgo && s.status === 'subscribed'
    ).length || 0;
    
    const previous30Days = allSubscribers?.filter(s => 
      new Date(s.created_at) >= sixtyDaysAgo && 
      new Date(s.created_at) < thirtyDaysAgo &&
      s.status === 'subscribed'
    ).length || 0;
    
    const growthRate = previous30Days > 0
      ? ((last30Days - previous30Days) / previous30Days) * 100
      : last30Days > 0 ? 100 : 0;
    
    // Count by source
    const sourceMap = new Map<string, number>();
    allSubscribers?.forEach(sub => {
      if (sub.status === 'subscribed') {
        const count = sourceMap.get(sub.source) || 0;
        sourceMap.set(sub.source, count + 1);
      }
    });
    
    const bySource = Array.from(sourceMap.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);
    
    return {
      success: true,
      stats: {
        total,
        subscribed,
        pending,
        unsubscribed,
        growthRate: Math.round(growthRate * 10) / 10,
        bySource,
      },
    };
  } catch (error) {
    console.error('Error getting subscriber stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get unique sources from subscribers
 */
export async function getSubscriberSources(): Promise<{
  success: boolean;
  error?: string;
  sources?: string[];
}> {
  const supabase = getServiceClient();
  
  try {
    const { data, error } = await supabase
      .from('newsletter_subscriptions')
      .select('source')
      .order('source');
    
    if (error) {
      console.error('Failed to get subscriber sources:', error);
      return { success: false, error: error.message };
    }
    
    const sources = [...new Set(data?.map(s => s.source) || [])];
    
    return {
      success: true,
      sources,
    };
  } catch (error) {
    console.error('Error getting subscriber sources:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
