'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Truck, Map, BarChart3, Settings, ClipboardList } from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: '任务控制台', href: '/dashboard/tasks', icon: <ClipboardList className="w-4 h-4" /> },
  { label: '调度图谱', href: '/dashboard/map', icon: <Map className="w-4 h-4" /> },
  { label: '效能报告', href: '/dashboard/analytics', icon: <BarChart3 className="w-4 h-4" /> },
  { label: '后台设置', href: '/dashboard/settings', icon: <Settings className="w-4 h-4" /> },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-dark-900 border-r border-dark-700 flex flex-col">
      <div className="px-6 py-6 border-b border-dark-700 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center text-primary-400">
          <Truck className="w-5 h-5" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm">纳米智能排线助手</p>
          <p className="text-dark-400 text-xs">Nano Logistics Scheduler</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors',
                  active
                    ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40'
                    : 'text-dark-300 hover:text-white hover:bg-dark-700/60'
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
      </nav>

      <div className="px-4 py-4 text-xs text-dark-500 border-t border-dark-700">
        v1.0.0 · 江苏金发科技
      </div>
    </aside>
  );
}


