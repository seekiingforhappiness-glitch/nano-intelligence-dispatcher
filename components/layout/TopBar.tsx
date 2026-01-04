'use client';

import { usePathname } from 'next/navigation';
import { Bell, UserCircle2 } from 'lucide-react';

const pageTitleMap: Record<string, string> = {
  '/dashboard/tasks': '任务控制台',
  '/dashboard/map': '调度图谱',
  '/dashboard/analytics': '效能报告',
  '/dashboard/settings': '后台设置',
};

function resolveTitle(pathname: string): string {
  const match = Object.keys(pageTitleMap).find((key) => pathname.startsWith(key));
  return match ? pageTitleMap[match] : '控制中心';
}

interface TopBarProps {
  user?: {
    username: string;
    role: string;
  };
}

export function TopBar({ user }: TopBarProps) {
  const pathname = usePathname();

  return (
    <header className="h-16 border-b border-dark-700 bg-dark-900/80 backdrop-blur flex items-center justify-between px-6">
      <div>
        <p className="text-white text-lg font-semibold">{resolveTitle(pathname)}</p>
        <p className="text-dark-400 text-xs mt-0.5">实时掌握排线进度与效能表现</p>
      </div>
      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-full hover:bg-dark-700 text-dark-200">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary-400 rounded-full" />
        </button>
        <div className="flex items-center gap-2 text-sm text-dark-200">
          <UserCircle2 className="w-6 h-6 text-primary-300" />
          <div className="leading-tight">
            <p className="text-white text-sm font-medium">{user?.username || '管理员'}</p>
            <p className="text-dark-400 text-xs capitalize">{user?.role || 'admin'}</p>
          </div>
        </div>
      </div>
    </header>
  );
}


