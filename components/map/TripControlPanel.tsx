'use client';

import { memo } from 'react';
import { Layers, RotateCcw, Map as MapIcon, Truck } from 'lucide-react';
import { Trip } from '@/types/schedule';
import { ROUTE_COLORS } from './constants';

interface TripControlPanelProps {
  trips: Trip[];
  selectedTrips: Set<number>;
  isAllSelected: boolean;
  isPanelOpen: boolean;
  onToggleTrip: (idx: number) => void;
  onSelectAll: () => void;
  onResetView: () => void;
  onTogglePanel: () => void;
}

/**
 * 地图控制面板 - 独立组件便于 memo 优化
 */
export const TripControlPanel = memo(function TripControlPanel({
  trips,
  selectedTrips,
  isAllSelected,
  isPanelOpen,
  onToggleTrip,
  onSelectAll,
  onResetView,
  onTogglePanel,
}: TripControlPanelProps) {
  return (
    <div
      className={`absolute left-4 top-4 bottom-4 w-72 transition-transform duration-500 z-20 flex flex-col ${
        isPanelOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="bg-black/40 backdrop-blur-2xl flex-1 flex flex-col rounded-3xl border border-white/10 overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]">
        {/* Panel Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/20 rounded-xl border border-primary/30">
              <Layers className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">指挥中心</h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                Command Center
              </p>
            </div>
          </div>
          <button
            onClick={onResetView}
            className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all group"
            title="重置视角"
          >
            <RotateCcw className="w-4 h-4 group-active:rotate-180 transition-transform" />
          </button>
        </div>

        {/* Filter Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
          {trips.length > 0 ? (
            <>
              <button
                onClick={onSelectAll}
                className={`w-full px-4 py-3.5 rounded-2xl text-sm font-bold transition-all flex items-center justify-between group border ${
                  isAllSelected
                    ? 'bg-primary border-primary shadow-[0_8px_20px_rgba(59,130,246,0.3)] text-white'
                    : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:border-white/10 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2">
                  <MapIcon className="w-4 h-4 opacity-70" />
                  显示全部航线
                </span>
                <span className="text-xs bg-black/30 px-2 py-0.5 rounded-full text-white/80 font-mono tracking-tighter">
                  {trips.length}
                </span>
              </button>

              <div className="space-y-2.5">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider pl-1">
                  单车航线
                </p>
                {trips.map((trip, idx) => (
                  <TripItem
                    key={trip.tripId}
                    trip={trip}
                    idx={idx}
                    isSelected={isAllSelected || selectedTrips.has(idx)}
                    onToggle={() => onToggleTrip(idx)}
                  />
                ))}
              </div>
            </>
          ) : (
            <EmptyState />
          )}
        </div>

        {/* Panel Footer */}
        <div className="p-4 bg-white/5 border-t border-white/5">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <span>系统状态</span>
            <span className="flex items-center gap-1.5 text-emerald-500">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              实时更新
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

/**
 * 单个车次项 - memo 优化避免不必要重渲染
 */
const TripItem = memo(function TripItem({
  trip,
  idx,
  isSelected,
  onToggle,
}: {
  trip: Trip;
  idx: number;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];
  const stopCount = trip.stops?.length || 0;

  return (
    <button
      onClick={onToggle}
      className={`w-full px-3.5 py-3 rounded-2xl text-left transition-all border group relative overflow-hidden ${
        isSelected
          ? 'bg-white/10 border-white/10 text-white shadow-lg'
          : 'bg-transparent border-transparent text-slate-500 hover:bg-white/5 hover:text-slate-300'
      }`}
    >
      {/* Selected Indicator */}
      {isSelected && (
        <div
          className="absolute left-0 top-0 w-1 h-full"
          style={{ background: color }}
        ></div>
      )}

      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${
            isSelected ? 'border-white/20' : 'border-white/5 opacity-40'
          }`}
          style={{ backgroundColor: `${color}20` }}
        >
          <Truck
            className="w-5 h-5"
            style={{ color: isSelected ? color : '#64748b' }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center">
            <span className="font-bold text-sm truncate tracking-tight">
              {trip.tripId}
            </span>
            <span className="text-[10px] opacity-40 font-mono tracking-tighter">
              TRIP_{idx + 1}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px] opacity-60 mt-1 font-semibold uppercase tracking-tighter">
            <span className="flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-slate-400"></div> {stopCount} 站
            </span>
            <span className="flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-slate-400"></div>{' '}
              {(trip.totalDistance || 0).toFixed(1)} KM
            </span>
          </div>
        </div>
      </div>
    </button>
  );
});

/**
 * 空状态组件
 */
function EmptyState() {
  return (
    <div className="text-center py-20 text-slate-500">
      <div className="w-16 h-16 mx-auto mb-4 bg-white/5 rounded-3xl flex items-center justify-center border border-white/5">
        <MapIcon className="w-8 h-8 opacity-20" />
      </div>
      <p className="text-xs font-bold uppercase tracking-widest opacity-40">
        航线监测未就绪
      </p>
      <p className="text-[10px] opacity-30 mt-1">
        请先上传数据并生成调度方案
      </p>
    </div>
  );
}
