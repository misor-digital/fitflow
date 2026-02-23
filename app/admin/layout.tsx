import { requireStaff } from '@/lib/auth';
import AdminSidebar from './AdminSidebar';

/**
 * Admin layout with sidebar.
 * 
 * NOTE: requireStaff() here is a CONVENIENCE check for the layout shell only.
 * Each page MUST also call requireStaff() with specific roles — layouts don't
 * re-render on client navigation, so this check alone is insufficient.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireStaff();

  return (
    <div className="min-h-screen flex">
      <AdminSidebar
        userName={session.profile.full_name}
        userRole={session.profile.staff_role!}
      />
      <main className="flex-1 bg-gray-50">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
