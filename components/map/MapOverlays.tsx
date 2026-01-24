'use client';

import { memo } from 'react';
import { Trip } from '@/types/schedule';

interface MapOverlaysProps {
  trips: Trip[];
}

/**
 * 地图覆盖层组件 - 图例和统计信息
 * 使用 memo 优化，仅在 trips 变化时重新渲染
 */
export const MapOverlays = memo(function MapOverlays({ trips }: MapOverlaysProps) {
  const totalStops = trips.reduce((acc, t) => acc + (t.stops?.length || 0), 0);

  return (
    <>
      {/* Floating Legend (Bottom Right) */}
      <div className="absolute bottom-8 right-8 z-10 bg-black/40 backdrop-blur-2xl px-6 py-4 rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col gap-3">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">
          数据图例
        </h4>
        <div className="flex items-center gap-6 text-[11px] font-bold text-slate-300">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-lg bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
            <span>中央仓库</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-white border-2 border-slate-500 shadow-[0_0_10px_rgba(255,255,255,0.3)]"></div>
            <span>配送站点</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-1.5 bg-gradient-to-r from-blue-500/10 via-white to-blue-500/10 rounded-full"></div>
            <span>流动航线</span>
          </div>
        </div>
      </div>

      {/* Environment Stats Overlay (Top Right) */}
      <div className="absolute top-8 right-8 z-10 flex gap-4">
        <StatCard label="活跃航线" value={trips.length} unit="ROUTES" color="emerald" />
        <StatCard label="覆盖点位" value={totalStops} unit="STOPS" color="primary" />
      </div>
    </>
  );
});

/**
 * 统计卡片组件
 */
function StatCard({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: 'emerald' | 'primary';
}) {
  const colorClass = color === 'emerald' ? 'text-emerald-500' : 'text-primary';

  return (
    <div className="bg-black/40 backdrop-blur-xl px-5 py-3 rounded-2xl border border-white/10 shadow-2xl">
      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-black text-white font-mono">{value}</span>
        <span className={`text-[10px] ${colorClass} font-bold`}>{unit}</span>
      </div>
    </div>
  );
}
