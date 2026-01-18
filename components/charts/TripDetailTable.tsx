'use client';

import { useState } from 'react';

interface TripData {
    tripId: string;
    vehicleType?: string;
    stops?: Array<{
        order?: {
            weightKg?: number;
            customerName?: string;
        };
        eta?: string;
    }>;
    totalDistance?: number;
    loadRateWeight?: number;
    estimatedCost?: number;
}

interface TripDetailTableProps {
    trips: TripData[];
}

export function TripDetailTable({ trips }: TripDetailTableProps) {
    const [sortField, setSortField] = useState<string>('tripId');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [expandedTrip, setExpandedTrip] = useState<string | null>(null);

    // 计算车次统计数据
    const tripStats = trips.map((trip) => {
        const stopCount = trip.stops?.length || 0;
        const totalWeight = trip.stops?.reduce(
            (sum, s) => sum + (s.order?.weightKg || 0), 0
        ) || 0;
        const loadRate = (trip.loadRateWeight || 0) * 100;

        return {
            ...trip,
            stopCount,
            totalWeight,
            loadRate,
        };
    });

    // 排序
    const sortedTrips = [...tripStats].sort((a, b) => {
        let aVal: any, bVal: any;
        switch (sortField) {
            case 'tripId':
                aVal = a.tripId;
                bVal = b.tripId;
                break;
            case 'stopCount':
                aVal = a.stopCount;
                bVal = b.stopCount;
                break;
            case 'totalWeight':
                aVal = a.totalWeight;
                bVal = b.totalWeight;
                break;
            case 'loadRate':
                aVal = a.loadRate;
                bVal = b.loadRate;
                break;
            case 'distance':
                aVal = a.totalDistance || 0;
                bVal = b.totalDistance || 0;
                break;
            default:
                aVal = a.tripId;
                bVal = b.tripId;
        }
        if (typeof aVal === 'string') {
            return sortDir === 'asc'
                ? aVal.localeCompare(bVal)
                : bVal.localeCompare(aVal);
        }
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    };

    const SortIcon = ({ field }: { field: string }) => (
        <span className="ml-1 text-dark-500">
            {sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
    );

    return (
        <div className="w-full">
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="tech-border-b bg-white/[0.02]">
                            <th
                                className="text-left py-3 px-4 text-slate-400 font-medium cursor-pointer hover:text-white transition-colors"
                                onClick={() => handleSort('tripId')}
                            >
                                车次 <SortIcon field="tripId" />
                            </th>
                            <th className="text-left py-3 px-4 text-slate-400 font-medium">
                                车型
                            </th>
                            <th
                                className="text-center py-3 px-4 text-slate-400 font-medium cursor-pointer hover:text-white transition-colors"
                                onClick={() => handleSort('stopCount')}
                            >
                                订单数 <SortIcon field="stopCount" />
                            </th>
                            <th
                                className="text-right py-3 px-4 text-slate-400 font-medium cursor-pointer hover:text-white transition-colors"
                                onClick={() => handleSort('totalWeight')}
                            >
                                总重量 <SortIcon field="totalWeight" />
                            </th>
                            <th
                                className="text-right py-3 px-4 text-slate-400 font-medium cursor-pointer hover:text-white transition-colors"
                                onClick={() => handleSort('loadRate')}
                            >
                                装载率 <SortIcon field="loadRate" />
                            </th>
                            <th
                                className="text-right py-3 px-4 text-slate-400 font-medium cursor-pointer hover:text-white transition-colors"
                                onClick={() => handleSort('distance')}
                            >
                                里程 <SortIcon field="distance" />
                            </th>
                            <th className="text-right py-3 px-4 text-slate-400 font-medium">
                                成本
                            </th>
                            <th className="text-center py-3 px-4 text-slate-400 font-medium">
                                详情
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedTrips.map((trip) => (
                            <>
                                <tr
                                    key={trip.tripId}
                                    className={`border-b border-white/[0.05] hover:bg-white/[0.05] transition-colors ${expandedTrip === trip.tripId ? 'bg-white/[0.05]' : 'bg-transparent'}`}
                                >
                                    <td className="py-3 px-4 font-mono font-medium text-primary-400">
                                        {trip.tripId}
                                    </td>
                                    <td className="py-3 px-4 text-slate-300">
                                        {trip.vehicleType || '标准车'}
                                    </td>
                                    <td className="py-3 px-4 text-center text-slate-300">
                                        {trip.stopCount}
                                    </td>
                                    <td className="py-3 px-4 text-right text-slate-300">
                                        {trip.totalWeight.toFixed(0)} kg
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <div className="flex justify-end">
                                            <div className={`px-2 py-0.5 rounded text-xs font-mono font-medium ${trip.loadRate >= 80
                                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                : trip.loadRate >= 50
                                                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                }`}>
                                                {trip.loadRate.toFixed(0)}%
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-right text-slate-300">
                                        {(trip.totalDistance || 0).toFixed(0)} km
                                    </td>
                                    <td className="py-3 px-4 text-right font-mono text-slate-300">
                                        ¥{(trip.estimatedCost || 0).toFixed(0)}
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <button
                                            onClick={() => setExpandedTrip(
                                                expandedTrip === trip.tripId ? null : trip.tripId
                                            )}
                                            className="text-primary hover:text-primary-300 text-xs px-2 py-1 rounded hover:bg-primary/20 transition-colors"
                                        >
                                            {expandedTrip === trip.tripId ? '收起' : '展开'}
                                        </button>
                                    </td>
                                </tr>
                                {expandedTrip === trip.tripId && (
                                    <tr key={`${trip.tripId}-detail`}>
                                        <td colSpan={8} className="bg-black/20 p-4 border-b border-white/[0.05] animate-fade-in shadow-inner">
                                            <div className="text-xs">
                                                <div className="font-medium text-slate-400 mb-3 flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                    配送站点详情
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {trip.stops?.map((stop, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="flex items-center gap-3 bg-white/[0.03] rounded-lg px-3 py-2 border border-white/[0.05]"
                                                        >
                                                            <span className="w-6 h-6 rounded bg-primary/20 text-primary text-xs font-mono flex items-center justify-center border border-primary/30">
                                                                {idx + 1}
                                                            </span>
                                                            <span className="text-slate-300 truncate font-medium">
                                                                {stop.order?.customerName || `站点 ${idx + 1}`}
                                                            </span>
                                                            <div className="ml-auto flex flex-col items-end">
                                                                <span className="text-slate-500 text-[10px]">ETA</span>
                                                                <span className="text-slate-300 font-mono text-xs">
                                                                    {stop.eta || '--'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </>
                        ))}
                    </tbody>
                </table>
            </div>

            {trips.length === 0 && (
                <div className="text-center py-12 text-slate-500 flex flex-col items-center">
                    <span className="text-2xl mb-2 opacity-50">📭</span>
                    暂无车次数据
                </div>
            )}
        </div>
    );
}
