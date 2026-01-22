/**
 * System Service
 * Handles system health checks and database statistics
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

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  database: {
    connected: boolean;
    responseTime: number;
  };
  tables: {
    [key: string]: number;
  };
  timestamp: string;
}

export interface DatabaseStats {
  tables: Array<{
    name: string;
    rowCount: number;
  }>;
  totalRecords: number;
}

/**
 * Get system health status
 */
export async function getSystemHealth(): Promise<ServiceResult<SystemHealth>> {
  const supabase = getServiceClient();
  const startTime = Date.now();

  try {
    // Test database connection with a simple query
    const { data, error } = await supabase
      .from('preorders')
      .select('id', { count: 'exact', head: true });

    const responseTime = Date.now() - startTime;
    const connected = !error;

    if (!connected) {
      return {
        success: true,
        data: {
          status: 'down',
          database: {
            connected: false,
            responseTime,
          },
          tables: {},
          timestamp: new Date().toISOString(),
        },
      };
    }

    // Get counts for key tables
    const tableCounts: { [key: string]: number } = {};
    const keyTables = [
      'preorders',
      'customers',
      'staff_users',
      'newsletter_subscriptions',
      'campaigns',
      'box_types',
      'promo_codes',
      'options',
      'audit_logs',
    ];

    for (const table of keyTables) {
      const { count, error: countError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      tableCounts[table] = countError ? 0 : (count || 0);
    }

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'down' = 'healthy';
    if (responseTime > 1000) {
      status = 'degraded';
    }

    return {
      success: true,
      data: {
        status,
        database: {
          connected: true,
          responseTime,
        },
        tables: tableCounts,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (err) {
    console.error('Error checking system health:', err);
    return {
      success: false,
      error: 'Failed to check system health',
    };
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<ServiceResult<DatabaseStats>> {
  const supabase = getServiceClient();

  try {
    const tables = [
      'preorders',
      'customers',
      'staff_users',
      'newsletter_subscriptions',
      'campaigns',
      'box_types',
      'promo_codes',
      'options',
      'audit_logs',
      'roles',
    ];

    const tableStats: Array<{ name: string; rowCount: number }> = [];
    let totalRecords = 0;

    for (const tableName of tables) {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      const rowCount = error ? 0 : (count || 0);
      tableStats.push({
        name: tableName,
        rowCount,
      });
      totalRecords += rowCount;
    }

    // Sort by row count descending
    tableStats.sort((a, b) => b.rowCount - a.rowCount);

    return {
      success: true,
      data: {
        tables: tableStats,
        totalRecords,
      },
    };
  } catch (err) {
    console.error('Error getting database stats:', err);
    return {
      success: false,
      error: 'Failed to get database statistics',
    };
  }
}
