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
      { label: '总订单', value: totalOrders, unit: '单' },
      { label: '总车次', value: totalTrips, unit: '趟' },
      { label: '总里程', value: `${totalDistance} km` },
      { label: '总成本', value: `¥${totalCost.toLocaleString()}` },
      { label: '风险订单', value: riskOrders, unit: '单', accent: riskOrders > 0 },
    ],
    [riskOrders, totalCost, totalDistance, totalTrips, totalOrders]
  );

  return (
    <div className="grid gap-4 md:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-dark-700 bg-dark-900/60 p-4 space-y-1"
        >
          <p className="text-xs uppercase tracking-wide text-dark-400">{card.label}</p>
          <p className={`text-2xl font-semibold ${card.accent ? 'text-yellow-400' : 'text-white'}`}>
            {card.value}
            {card.unit && <span className="text-base font-normal text-dark-400 ml-1">{card.unit}</span>}
          </p>
        </div>
      ))}
    </div>
  );
}


