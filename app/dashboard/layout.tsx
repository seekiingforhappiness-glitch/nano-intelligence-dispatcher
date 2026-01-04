import { ReactNode } from 'react';
import { SidebarNav } from '@/components/layout/SidebarNav';
import { TopBar } from '@/components/layout/TopBar';
import { getAdminFromCookies } from '@/lib/admin/requireAdmin';
import { redirect } from 'next/navigation';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const admin = getAdminFromCookies();
  if (!admin) {
    redirect('/admin/login');
  }

  return (
    <div className="min-h-screen bg-[#05070d] text-white flex">
      <SidebarNav />
      <div className="flex-1 flex flex-col">
        <TopBar user={{ username: admin.username, role: admin.role }} />
        <main className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-dark-900 via-dark-900 to-dark-800">
          {children}
        </main>
      </div>
    </div>
  );
}

