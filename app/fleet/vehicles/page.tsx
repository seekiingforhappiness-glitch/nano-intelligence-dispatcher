'use client';

import { useState, useEffect } from 'react';
import { Truck, Search, Plus, Filter, Loader2 } from 'lucide-react';

// 本地 Vehicle 类型定义（避免依赖 Prisma 生成的类型）
interface Vehicle {
    id: string;
    plateNumber: string;
    vehicleType?: string | null;
    capacityWeight?: number | null;
    capacityVolume?: number | null;
    status: string;
}

export default function VehiclesPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch('/api/fleet/vehicles')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setVehicles(data);
                setIsLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch vehicles', err);
                setIsLoading(false);
            });
    }, []);

    const filteredVehicles = vehicles.filter(v =>
        v.plateNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* 顶部标题 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Truck className="w-8 h-8 text-primary-400" />
                        车辆管理
                    </h1>
                    <p className="text-slate-400 mt-1">管理车辆资料、车型与运力状态</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-primary-500/25">
                    <Plus className="w-4 h-4" />
                    添加车辆
                </button>
            </div>

            {/* 列表区域 */}
            <div className="bg-card/50 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden">
                {/* 工具栏 */}
                <div className="p-4 border-b border-white/5 flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="搜索车牌号..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:border-primary-500/50 transition-colors"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-black/20 hover:bg-black/30 text-slate-300 rounded-xl transition-all border border-white/10">
                        <Filter className="w-4 h-4" />
                        <span>车型筛选</span>
                    </button>
                </div>

                {/* 表头 */}
                <div className="grid grid-cols-6 gap-4 p-4 border-b border-white/5 text-sm font-medium text-slate-400 bg-white/5">
                    <div className="col-span-1">车牌号码</div>
                    <div className="col-span-1">车型/长度</div>
                    <div className="col-span-1">载重/体积</div>
                    <div className="col-span-1">状态</div>
                    <div className="col-span-1 text-right">操作</div>
                </div>

                {/* 列表内容 */}
                <div className="divide-y divide-white/5 min-h-[200px] relative">
                    {isLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                        </div>
                    ) : filteredVehicles.length > 0 ? (
                        filteredVehicles.map((item, i) => (
                            <div key={item.id} className="grid grid-cols-6 gap-4 p-4 items-center hover:bg-white/5 transition-colors">
                                <div className="col-span-1 font-bold text-white font-mono bg-white/5 px-2 py-1 rounded w-fit">
                                    {item.plateNumber}
                                </div>
                                <div className="col-span-1 text-slate-300">
                                    {item.vehicleType || '未填'}
                                </div>
                                <div className="col-span-1 text-slate-400 text-sm">
                                    {item.capacityWeight ? `${item.capacityWeight}吨` : '-'} /
                                    {item.capacityVolume ? `${item.capacityVolume}方` : '-'}
                                </div>
                                <div className="col-span-1">
                                    {item.status === 'busy' && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                                            运输中
                                        </span>
                                    )}
                                    {(item.status === 'idle' || item.status === 'active') && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                            空闲
                                        </span>
                                    )}
                                    {item.status === 'maintenance' && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                                            维保中
                                        </span>
                                    )}
                                </div>
                                <div className="col-span-1 flex justify-end gap-3 text-sm">
                                    <button className="text-primary-400 hover:text-primary-300 transition-colors">详情</button>
                                    <button className="text-slate-400 hover:text-white transition-colors">编辑</button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                            <Truck className="w-12 h-12 mb-4 opacity-20" />
                            <p>暂无车辆数据</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
