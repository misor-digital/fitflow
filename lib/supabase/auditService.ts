/**
 * Audit Service
 * Handles audit log queries and exports
 */

import { createClient } from '@supabase/supabase-js';

const getServiceClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
};

export interface ServiceResult<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

export interface AuditLogFilters {
  actorType?: string;
  action?: string;
  resourceType?: string;
  fromDate?: string;
  toDate?: string;
}

export interface AuditLog {
  id: string;
  actor_type: string;
  actor_id: string;
  actor_email: string;
  action: string;
  resource_type: string;
  resource_id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface PaginatedAuditLogs {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * List audit logs with pagination and filters
 */
export async function listAuditLogs(
  page: number = 1,
  limit: number = 20,
  filters?: AuditLogFilters
): Promise<ServiceResult<PaginatedAuditLogs>> {
  const supabase = getServiceClient();

  try {
    // Build query
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters?.actorType) {
      query = query.eq('actor_type', filters.actorType);
    }

    if (filters?.action) {
      query = query.ilike('action', `%${filters.action}%`);
    }

    if (filters?.resourceType) {
      query = query.ilike('resource_type', `%${filters.resourceType}%`);
    }

    if (filters?.fromDate) {
      query = query.gte('created_at', filters.fromDate);
    }

    if (filters?.toDate) {
      // Add one day to include the entire end date
      const endDate = new Date(filters.toDate);
      endDate.setDate(endDate.getDate() + 1);
      query = query.lt('created_at', endDate.toISOString());
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error listing audit logs:', error);
      return {
        success: false,
        error: 'Failed to list audit logs',
      };
    }

    const totalPages = count ? Math.ceil(count / limit) : 0;

    return {
      success: true,
      data: {
        logs: data || [],
        total: count || 0,
        page,
        limit,
        totalPages,
      },
    };
  } catch (err) {
    console.error('Error listing audit logs:', err);
    return {
      success: false,
      error: 'Failed to list audit logs',
    };
  }
}

/**
 * Search audit logs by query string
 */
export async function searchAuditLogs(
  query: string,
  filters?: AuditLogFilters
): Promise<ServiceResult<AuditLog[]>> {
  const supabase = getServiceClient();

  try {
    // Build base query
    let dbQuery = supabase
      .from('audit_logs')
      .select('*')
      .or(`actor_email.ilike.%${query}%,action.ilike.%${query}%,resource_id.ilike.%${query}%`);

    // Apply additional filters
    if (filters?.actorType) {
      dbQuery = dbQuery.eq('actor_type', filters.actorType);
    }

    if (filters?.resourceType) {
      dbQuery = dbQuery.ilike('resource_type', `%${filters.resourceType}%`);
    }

    if (filters?.fromDate) {
      dbQuery = dbQuery.gte('created_at', filters.fromDate);
    }

    if (filters?.toDate) {
      const endDate = new Date(filters.toDate);
      endDate.setDate(endDate.getDate() + 1);
      dbQuery = dbQuery.lt('created_at', endDate.toISOString());
    }

    dbQuery = dbQuery
      .order('created_at', { ascending: false })
      .limit(100);

    const { data, error } = await dbQuery;

    if (error) {
      console.error('Error searching audit logs:', error);
      return {
        success: false,
        error: 'Failed to search audit logs',
      };
    }

    return {
      success: true,
      data: data || [],
    };
  } catch (err) {
    console.error('Error searching audit logs:', err);
    return {
      success: false,
      error: 'Failed to search audit logs',
    };
  }
}

/**
 * Export audit logs to CSV or JSON
 */
export async function exportAuditLogs(
  filters?: AuditLogFilters,
  format: 'csv' | 'json' = 'csv'
): Promise<ServiceResult<string>> {
  const supabase = getServiceClient();

  try {
    // Build query
    let query = supabase
      .from('audit_logs')
      .select('*');

    // Apply filters
    if (filters?.actorType) {
      query = query.eq('actor_type', filters.actorType);
    }

    if (filters?.action) {
      query = query.ilike('action', `%${filters.action}%`);
    }

    if (filters?.resourceType) {
      query = query.ilike('resource_type', `%${filters.resourceType}%`);
    }

    if (filters?.fromDate) {
      query = query.gte('created_at', filters.fromDate);
    }

    if (filters?.toDate) {
      const endDate = new Date(filters.toDate);
      endDate.setDate(endDate.getDate() + 1);
      query = query.lt('created_at', endDate.toISOString());
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error exporting audit logs:', error);
      return {
        success: false,
        error: 'Failed to export audit logs',
      };
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        error: 'No audit logs found to export',
      };
    }

    if (format === 'json') {
      return {
        success: true,
        data: JSON.stringify(data, null, 2),
      };
    }

    // CSV format
    const headers = [
      'ID',
      'Actor Type',
      'Actor ID',
      'Actor Email',
      'Action',
      'Resource Type',
      'Resource ID',
      'Metadata',
      'Created At',
    ];

    const rows = data.map((log) => [
      log.id,
      log.actor_type,
      log.actor_id,
      log.actor_email,
      log.action,
      log.resource_type,
      log.resource_id,
      JSON.stringify(log.metadata || {}),
      log.created_at,
    ]);

    // Escape CSV values
    const escapeCsvValue = (value: unknown): string => {
      const str = String(value || '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map(escapeCsvValue).join(',')),
    ].join('\n');

    return {
      success: true,
      data: csvContent,
    };
  } catch (err) {
    console.error('Error exporting audit logs:', err);
    return {
      success: false,
      error: 'Failed to export audit logs',
    };
  }
}
