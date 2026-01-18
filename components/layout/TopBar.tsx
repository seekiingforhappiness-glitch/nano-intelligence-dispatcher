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
    <div className="w-full flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.05] backdrop-blur-sm shadow-sm transition-all hover:bg-white/[0.05] hover:border-white/[0.08]">
      <div className="flex flex-col">
        <h1 className="text-slate-100 text-lg font-heading font-semibold tracking-tight text-glow-sm animate-fade-in flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-slow shadow-[0_0_8px_#3B82F6]" />
          {resolveTitle(pathname)}
        </h1>
      </div>

      <div className="flex items-center gap-5">
        <button className="relative p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-primary transition-colors focus:ring-1 focus:ring-primary/30 outline-none group">
          <Bell className="w-5 h-5 group-hover:drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]" />
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-black/50 shadow-[0_0_8px_#EF4444] animate-pulse" />
        </button>

        <div className="h-6 w-px bg-white/10" />

        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
              {user?.username || '管理员'}
            </p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold group-hover:text-primary transition-colors">
              {user?.role || 'SYSTEM ADMIN'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 border border-white/10 flex items-center justify-center text-slate-300 shadow-lg group-hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] group-hover:border-primary/50 transition-all relative">
            <UserCircle2 className="w-6 h-6" />
            <div className="absolute inset-0 rounded-full border border-white/5 group-hover:scale-110 transition-transform duration-500" />
          </div>
        </div>
      </div>
    </div>
  );
}


