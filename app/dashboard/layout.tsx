import { ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { MainLayout } from '@/components/layout/MainLayout';
import { getAdminFromCookies } from '@/lib/admin/requireAdmin';
import { redirect } from 'next/navigation';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const admin = getAdminFromCookies();
  if (!admin) {
    redirect('/admin/login');
  }

  return (
    <MainLayout
      sidebar={<Sidebar />}
      topbar={<TopBar user={{ username: admin.username, role: admin.role }} />}
    >
      {children}
    </MainLayout>
  );
}
