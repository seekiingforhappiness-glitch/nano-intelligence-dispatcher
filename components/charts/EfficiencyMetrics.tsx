'use client';

import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { Zap, DollarSign, Truck, Package, ClipboardList, MapPin } from 'lucide-react';

interface EfficiencyMetricsProps {
    totalOrders: number;
    totalTrips: number;
    totalDistance: number;
    totalCost: number;
    trips: Array<{
        stops?: Array<{
            order?: {
                weightKg?: number;
            };
            eta?: string;
            deadline?: string;
        }>;
        vehicleType?: string;
        loadRateWeight?: number;
    }>;
}

export function EfficiencyMetrics({
    totalOrders,
    totalTrips,
    totalDistance,
    totalCost,
    trips,
}: EfficiencyMetricsProps) {
    // 计算配送效率 (订单/100km)
    const deliveryEfficiency = totalDistance > 0
        ? ((totalOrders / totalDistance) * 100).toFixed(2)
        : '0';

    // 计算平均每单成本
    const avgCostPerOrder = totalOrders > 0
        ? (totalCost / totalOrders).toFixed(0)
        : '0';

    // 计算平均每公里成本
    const avgCostPerKm = totalDistance > 0
        ? (totalCost / totalDistance).toFixed(1)
        : '0';

    // 计算平均车次装载率
    const avgLoadRate = trips.length > 0
        ? (trips.reduce((sum, t) => sum + (t.loadRateWeight || 0), 0) / trips.length * 100).toFixed(1)
        : '0';

    // 计算平均每车次订单数
    const avgOrdersPerTrip = totalTrips > 0
        ? (totalOrders / totalTrips).toFixed(1)
        : '0';

    // 计算平均里程
    const avgDistancePerTrip = totalTrips > 0
        ? (totalDistance / totalTrips).toFixed(0)
        : '0';

    const metrics = [
        {
            label: '配送效率',
            value: deliveryEfficiency,
            unit: '单/100km',
            icon: Zap,
            color: 'from-blue-500 to-cyan-500',
            textColor: 'text-cyan-400'
        },
        {
            label: '平均每单成本',
            value: `¥${avgCostPerOrder}`,
            unit: '',
            icon: DollarSign,
            color: 'from-green-500 to-emerald-500',
            textColor: 'text-emerald-400'
        },
        {
            label: '平均公里成本',
            value: `¥${avgCostPerKm}`,
            unit: '/km',
            icon: Truck,
            color: 'from-orange-500 to-amber-500',
            textColor: 'text-amber-400'
        },
        {
            label: '平均装载率',
            value: avgLoadRate,
            unit: '%',
            icon: Package,
            color: 'from-purple-500 to-pink-500',
            textColor: 'text-pink-400'
        },
        {
            label: '平均每车订单',
            value: avgOrdersPerTrip,
            unit: '单',
            icon: ClipboardList,
            color: 'from-indigo-500 to-violet-500',
            textColor: 'text-violet-400'
        },
        {
            label: '平均车次里程',
            value: avgDistancePerTrip,
            unit: 'km',
            icon: MapPin,
            color: 'from-teal-500 to-green-500',
            textColor: 'text-green-400'
        },
    ];

    return (
        <div className="h-full">
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                {metrics.map((metric, idx) => (
                    <Card
                        key={idx}
                        variant="glass-hover"
                        className="relative overflow-hidden p-4 group border-white/5 hover:bg-white/10 transition-colors"
                    >
                        <div className={`absolute inset-0 bg-gradient-to-br ${metric.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-2">
                                <metric.icon className={cn("w-5 h-5 transition-colors", metric.textColor)} />
                            </div>

                            <div className="text-2xl font-bold text-white font-mono tracking-tight group-hover:scale-105 transition-transform origin-left">
                                {metric.value}
                                <span className="text-xs text-slate-500 ml-1 font-sans font-normal">{metric.unit}</span>
                            </div>

                            <div className="text-xs text-slate-400 mt-1 font-medium">{metric.label}</div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
