'use client';

import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { useMemo } from 'react';

interface CostBreakdownChartProps {
  breakdown: {
    fuel: number;
    toll: number;
    labor: number;
    other?: number;
  };
}

const COLORS = ['#3B82F6', '#F97316', '#10B981', '#8B5CF6'];

export function CostBreakdownChart({ breakdown }: CostBreakdownChartProps) {
  const data = useMemo(
    () => [
      { name: '燃油费', value: breakdown.fuel || 0 },
      { name: '路桥费', value: breakdown.toll || 0 },
      { name: '人工费', value: breakdown.labor || 0 },
      { name: '其他', value: breakdown.other || 0 },
    ],
    [breakdown]
  );

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={70}
          paddingAngle={3}
          label={({ name, percent }) => `${name} ${(((percent ?? 0) as number) * 100).toFixed(0)}%`}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}


