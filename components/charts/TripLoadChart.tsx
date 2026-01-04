'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface TripLoadChartProps {
  trips: Array<{ tripId: string; loadRateWeight: number; loadRatePallet: number }>;
}

export function TripLoadChart({ trips }: TripLoadChartProps) {
  const data = trips.map(trip => ({
    name: trip.tripId,
    weight: Math.round(trip.loadRateWeight * 100),
    pallet: Math.round(trip.loadRatePallet * 100),
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} />
        <YAxis unit="%" stroke="#94a3b8" />
        <Tooltip formatter={(value) => `${value}%`} />
        <Bar dataKey="weight" fill="#3B82F6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="pallet" fill="#10B981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}


