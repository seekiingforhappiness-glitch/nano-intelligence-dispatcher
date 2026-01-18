'use client';

import { WarehouseManager } from '@/components/settings/WarehouseManager';
import Link from 'next/link';
import { Settings, Warehouse, Users, Truck, Clock, ChevronRight } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="border border-dark-700 rounded-xl p-6 bg-dark-900/60">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">系统设置</h1>
            <p className="text-dark-400 text-sm">全局配置与基础数据管理</p>
          </div>
        </div>
        <p className="text-dark-300 text-sm">
          在此管理仓库、账号权限等全局配置。车型配置和排线规则请在
          <Link href="/dashboard/tasks" className="text-primary hover:underline mx-1">任务调度</Link>
          页面中设置。
        </p>
      </div>

      {/* 快捷入口 */}
      <div className="grid gap-4 md:grid-cols-3">
        {SETTINGS_TILES.map(tile => (
          <Link
            key={tile.title}
            href={tile.href}
            className="group rounded-xl border border-dark-700 bg-dark-900/60 p-5 hover:border-primary/50 hover:bg-dark-800/60 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="p-2 bg-dark-800 rounded-lg group-hover:bg-primary/20 transition-colors">
                <tile.icon className="w-5 h-5 text-dark-400 group-hover:text-primary transition-colors" />
              </div>
              <ChevronRight className="w-4 h-4 text-dark-600 group-hover:text-primary transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-white mt-4 mb-1">{tile.title}</h3>
            <p className="text-dark-400 text-sm">{tile.desc}</p>
          </Link>
        ))}
      </div>

      {/* 仓库管理（内联展示） */}
      <WarehouseManager />
    </div>
  );
}

const SETTINGS_TILES = [
  {
    title: '仓库管理',
    desc: '配置发货仓库地址、时间窗口等信息。',
    href: '#warehouse',
    icon: Warehouse,
  },
  {
    title: '账号权限',
    desc: '管理操作员账号与角色权限。',
    href: '/admin/users',
    icon: Users,
  },
  {
    title: '任务调度配置',
    desc: '车型、时间窗、成本模式等排线参数。',
    href: '/dashboard/tasks',
    icon: Truck,
  },
];
