'use client';

import { useState, useEffect } from 'react';
import { Users, Search, Plus, Filter, Phone, Loader2 } from 'lucide-react';
import { Driver } from '@prisma/client';

export default function DriversPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch('/api/fleet/drivers')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setDrivers(data);
                setIsLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch drivers', err);
                setIsLoading(false);
            });
    }, []);

    const filteredDrivers = drivers.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.phone?.includes(searchTerm)
    );

    return (
        <div className="space-y-6">
            {/* 顶部标题 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Users className="w-8 h-8 text-primary-400" />
                        司机管理
                    </h1>
                    <p className="text-slate-400 mt-1">管理车队司机信息、状态与考勤</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-primary-500/25">
                    <Plus className="w-4 h-4" />
                    添加司机
                </button>
            </div>

            {/* 统计卡片 */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {[
                    { label: '总司机数', value: drivers.length, color: 'text-white' },
                    { label: '工作中', value: drivers.filter(d => d.status === 'busy').length, color: 'text-green-400' },
                    { label: '空闲中', value: drivers.filter(d => d.status === 'active' || d.status === 'idle').length, color: 'text-blue-400' },
                    { label: '休息/请假', value: drivers.filter(d => d.status === 'inactive').length, color: 'text-slate-400' },
                ].map((stat, i) => (
                    <div key={i} className="bg-card/50 backdrop-blur-md border border-white/5 rounded-2xl p-4">
                        <p className="text-slate-400 text-sm">{stat.label}</p>
                        <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* 列表区域 */}
            <div className="bg-card/50 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden">
                {/* 工具栏 */}
                <div className="p-4 border-b border-white/5 flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="搜索司机姓名、手机号..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:border-primary-500/50 transition-colors"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-black/20 hover:bg-black/30 text-slate-300 rounded-xl transition-all border border-white/10">
                        <Filter className="w-4 h-4" />
                        <span>筛选</span>
                    </button>
                </div>

                {/* 表头 */}
                <div className="grid grid-cols-6 gap-4 p-4 border-b border-white/5 text-sm font-medium text-slate-400 bg-white/5">
                    <div className="col-span-1">司机姓名</div>
                    <div className="col-span-1">手机号</div>
                    <div className="col-span-1">执照类型</div>
                    <div className="col-span-1">状态</div>
                    <div className="col-span-1">加入时间</div>
                    <div className="col-span-1 text-right">操作</div>
                </div>

                {/* 列表内容 */}
                <div className="divide-y divide-white/5 min-h-[200px] relative">
                    {isLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                        </div>
                    ) : filteredDrivers.length > 0 ? (
                        filteredDrivers.map((driver) => (
                            <div key={driver.id} className="grid grid-cols-6 gap-4 p-4 items-center hover:bg-white/5 transition-colors">
                                <div className="col-span-1 font-medium text-white flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs text-slate-300">
                                        {driver.name.charAt(0)}
                                    </div>
                                    {driver.name}
                                </div>
                                <div className="col-span-1 text-slate-300 flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-slate-500" />
                                    {driver.phone || '-'}
                                </div>
                                <div className="col-span-1 text-slate-400 text-sm">{driver.licenseType || '普通'}</div>
                                <div className="col-span-1">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${driver.status === 'active' || driver.status === 'idle'
                                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                            : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                        }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${driver.status === 'active' || driver.status === 'idle' ? 'bg-green-400' : 'bg-slate-400'
                                            }`}></span>
                                        {driver.status === 'active' ? '空闲' : driver.status === 'busy' ? '运输中' : '离线'}
                                    </span>
                                </div>
                                <div className="col-span-1 text-slate-500 text-sm">{new Date(driver.createdAt).toLocaleDateString()}</div>
                                <div className="col-span-1 flex justify-end gap-3 text-sm">
                                    <button className="text-primary-400 hover:text-primary-300 transition-colors">编辑</button>
                                    <button className="text-red-400 hover:text-red-300 transition-colors">删除</button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                            <Users className="w-12 h-12 mb-4 opacity-20" />
                            <p>暂无司机数据</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
