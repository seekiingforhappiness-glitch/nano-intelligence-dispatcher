'use client';

import { AdvancedSettings } from '@/components';
import { WarehouseManager } from '@/components/settings/WarehouseManager';
import { defaultVehicles } from '@/config';
import { useState } from 'react';
import Link from 'next/link';
import { useTaskStore } from '@/store/useTaskStore';

export default function SettingsPage() {
  const [vehicles, setVehicles] = useState(defaultVehicles);
  const [options, setOptions] = useState({
    maxStops: 8,
    startTime: '06:00',
    deadline: '20:00',
    factoryDeadline: '17:00',
    costMode: 'mileage',
  });
  const { setError: setTaskStoreError } = useTaskStore();

  return (
    <div className="space-y-6">
      <div className="border border-dark-700 rounded-xl p-6 bg-dark-900/60">
        <p className="text-lg font-semibold mb-2">系统设置</p>
        <p className="text-dark-300 text-sm">
          全局车辆配置、默认规则等将在此集中管理。当前展示为预览版，暂未持久化，保存后将在下次排线中应用。
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-dark-400">
          <button
            className="px-3 py-1.5 rounded-md border border-dark-600 hover:border-primary-500/60 transition-colors"
            onClick={() => {
              setOptions({
                maxStops: 8,
                startTime: '06:00',
                deadline: '20:00',
                factoryDeadline: '17:00',
                costMode: 'mileage',
              });
              setVehicles(defaultVehicles);
              setTaskStoreError(null);
            }}
          >
            恢复默认配置
          </button>
          <Link
            href="/admin/users"
            className="px-3 py-1.5 rounded-md border border-dark-600 hover:border-primary-500/60 transition-colors"
          >
            打开后台账号管理
          </Link>
        </div>
      </div>

      <AdvancedSettings
        options={options}
        onOptionsChange={setOptions}
        vehicles={vehicles}
        onVehiclesChange={setVehicles}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {SETTINGS_TILES.map(tile => (
          <Link
            key={tile.title}
            href={tile.href}
            className="rounded-xl border border-dark-700 bg-dark-900/60 p-4 hover:border-primary-500/60 transition-colors"
          >
            <h3 className="text-lg font-semibold mb-2">{tile.title}</h3>
            <p className="text-dark-400 text-sm">{tile.desc}</p>
          </Link>
        ))}
      </div>

      <WarehouseManager />
    </div>
  );
}

const SETTINGS_TILES = [
  {
    title: '车型配置',
    desc: '管理可用车型、载重、成本参数，并同步到排线任务。',
    href: '/dashboard/tasks',
  },
  {
    title: '规则与时窗',
    desc: '定制时间窗、堆叠规则与成本模式，影响调度策略。',
    href: '/dashboard/tasks',
  },
  {
    title: '管理员账号',
    desc: '在后台账号模块中维护操作员与权限。',
    href: '/admin/users',
  },
];

