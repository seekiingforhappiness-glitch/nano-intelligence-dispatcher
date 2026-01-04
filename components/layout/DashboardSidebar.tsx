'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ClipboardList, Map, BarChart3, Settings, LayoutDashboard } from 'lucide-react';

const navItems = [
  { href: '/dashboard/tasks', label: '任务控制台', icon: ClipboardList },
  { href: '/dashboard/map', label: '调度图谱', icon: Map },
  { href: '/dashboard/analytics', label: '效能报告', icon: BarChart3 },
  { href: '/dashboard/settings', label: '后台设置', icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-dark-900 border-r border-dark-700 px-4 py-6 flex flex-col gap-6">
      <div className="flex items-center gap-3 px-2">
        <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
          <LayoutDashboard className="w-5 h-5 text-primary-400" />
        </div>
        <div>
          <p className="text-sm text-dark-400">纳米智能排线助手</p>
          <p className="font-semibold text-white">调度控制台</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active ? 'bg-primary-500/20 text-white border border-primary-500/40' : 'text-dark-300 hover:text-white hover:bg-dark-800'
              )}
            >
              <Icon className={cn('w-4 h-4', active ? 'text-primary-400' : 'text-dark-400')} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}


