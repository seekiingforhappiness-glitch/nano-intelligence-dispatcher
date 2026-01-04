'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ClipboardList, Map, BarChart3, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard/tasks', label: '任务控制台', icon: ClipboardList },
  { href: '/dashboard/map', label: '调度图谱', icon: Map },
  { href: '/dashboard/analytics', label: '效能报告', icon: BarChart3 },
  { href: '/dashboard/settings', label: '后台设置', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full md:w-64 bg-dark-900 border-r border-dark-700/60">
      <div className="p-6 border-b border-dark-700/60">
        <p className="text-xs uppercase tracking-widest text-dark-500">纳米智调</p>
        <h1 className="text-xl font-bold text-white mt-1">排线驾驶舱</h1>
      </div>
      <nav className="p-4 space-y-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                active
                  ? 'bg-primary-500/10 text-primary-200 border border-primary-500/40'
                  : 'text-dark-300 hover:text-white hover:bg-dark-800/80'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}


