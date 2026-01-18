'use client';

import { useMemo } from 'react';

interface SummaryCardsProps {
  totalOrders: number;
  totalTrips: number;
  totalDistance: number;
  totalCost: number;
  riskOrders: number;
}

export function SummaryCards({
  totalOrders,
  totalTrips,
  totalDistance,
  totalCost,
  riskOrders,
}: SummaryCardsProps) {
  const cards = useMemo(
    () => [
      { label: '总订单', value: totalOrders, unit: '单', icon: '📦' },
      { label: '总车次', value: totalTrips, unit: '趟', icon: '🚚' },
      { label: '总里程', value: `${totalDistance}`, unit: 'km', icon: '🛣️' },
      { label: '总成本', value: `¥${totalCost.toLocaleString()}`, icon: '💰' },
      { label: '风险订单', value: riskOrders, unit: '单', accent: riskOrders > 0, icon: '⚠️' },
    ],
    [riskOrders, totalCost, totalDistance, totalTrips, totalOrders]
  );

  return (
    <div className="grid gap-4 md:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`glass-card p-5 rounded-xl space-y-2 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 ${card.accent ? 'border-yellow-500/30' : ''
            }`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <p className="text-xs font-semibold uppercase tracking-widest">{card.label}</p>
            <span className="opacity-50 grayscale group-hover:grayscale-0 transition-all">{card.icon}</span>
          </div>
          <p className={`text-2xl font-bold tracking-tight ${card.accent ? 'text-yellow-400 text-glow-sm' : 'text-white'}`}>
            {card.value}
            {card.unit && <span className="text-xs font-normal text-slate-500 ml-1 align-baseline">{card.unit}</span>}
          </p>
          {card.accent && <div className="absolute inset-0 bg-yellow-500/5 animate-pulse-slow" />}
        </div>
      ))}
    </div>
  );
}


