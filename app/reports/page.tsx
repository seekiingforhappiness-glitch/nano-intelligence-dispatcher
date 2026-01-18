'use client';

import { useState } from 'react';
import { StatCard } from '@/components/dashboard/StatCard';
import { AlertBanner } from '@/components/dashboard/AlertBanner';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, LineChart, Line
} from 'recharts';
import {
    LayoutDashboard,
    TrendingUp,
    AlertOctagon,
    Map as MapIcon,
    Calendar,
    Download
} from 'lucide-react';

// Mock Data
const trendData = [
    { name: '48周', value: 4000, value2: 2400 },
    { name: '49周', value: 3000, value2: 1398 },
    { name: '50周', value: 2000, value2: 5800 },
    { name: '51周', value: 2780, value2: 3908 },
    { name: '52周', value: 1890, value2: 4800 },
    { name: '01周', value: 2390, value2: 3800 },
    { name: '02周', value: 3490, value2: 4300 },
];

const TABS = [
    { id: 'overview', label: '综合指标概览', icon: LayoutDashboard },
    { id: 'quality', label: '质量分析', icon: AlertOctagon },
    { id: 'business', label: '业务趋势', icon: TrendingUp },
    { id: 'geo', label: '区域分布', icon: MapIcon },
];

export default function ReportsPage() {
    const [activeTab, setActiveTab] = useState('overview');

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">运营分析报表</h1>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Calendar className="w-4 h-4" />
                        <span>数据更新时间: 2026-01-12 10:25:55</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-all border border-white/10">
                        <Download className="w-4 h-4" />
                        导出报表
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-black/20 rounded-xl border border-white/10 w-fit">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === tab.id
                                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }
            `}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="space-y-6">

                {/* Alerts Section (Always visible on Overview) */}
                {activeTab === 'overview' && (
                    <>
                        <AlertBanner
                            alerts={[
                                '「贴措单率」01周、02周没有持续恶化的客户。',
                                '「发件晚点率」01周、02周没有持续恶化的客户。',
                                '「计划内揽收率」在华东区域出现小幅度下滑，请关注。'
                            ]}
                        />

                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard
                                title="投诉率 (PPM)"
                                value="1,423.63"
                                unit="ppm"
                                trend={-79.61}
                                trendLabel="环比"
                                subValue="投诉量 7.00 票"
                            />
                            <StatCard
                                title="发件晚点率"
                                value="3.92"
                                unit="%"
                                trend={12.78}
                                trendLabel="环比"
                                subValue="晚点量 27,422 票"
                            />
                            <StatCard
                                title="计划内揽收率"
                                value="65.29"
                                unit="%"
                                trend={-0.63}
                                trendLabel="环比"
                                subValue="揽收量 75,544 票"
                            />
                            <StatCard
                                title="理赔金额"
                                value="70.04"
                                unit="万元"
                                trend={122.43}
                                trendLabel="环比"
                                subValue="涉及订单 74 票"
                            />
                        </div>

                        {/* Charts Row 1 */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Main Trend Chart */}
                            <div className="lg:col-span-2 bg-card/50 backdrop-blur-md border border-white/5 rounded-2xl p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-bold text-white">投诉率趋势</h3>
                                    <div className="flex gap-2">
                                        <span className="flex items-center gap-1 text-xs text-slate-400">
                                            <span className="w-2 h-2 rounded-full bg-primary-500"></span> 投诉量
                                        </span>
                                        <span className="flex items-center gap-1 text-xs text-slate-400">
                                            <span className="w-2 h-2 rounded-full bg-purple-500"></span> 投诉率
                                        </span>
                                    </div>
                                </div>

                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={trendData}>
                                            <defs>
                                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                            <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1e293b', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
                                                itemStyle={{ color: '#fff' }}
                                            />
                                            <Area type="monotone" dataKey="value" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorValue)" />
                                            <Line type="monotone" dataKey="value2" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Top 5 Lists */}
                            <div className="bg-card/50 backdrop-blur-md border border-white/5 rounded-2xl p-6 flex flex-col">
                                <h3 className="text-lg font-bold text-white mb-4">Top 5 投诉客户</h3>
                                <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                        ${i === 1 ? 'bg-yellow-500/20 text-yellow-500' :
                                                    i === 2 ? 'bg-slate-500/20 text-slate-400' :
                                                        i === 3 ? 'bg-orange-700/20 text-orange-700' : 'bg-slate-800 text-slate-600'}
                      `}>
                                                {i}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-white truncate">深圳市XX电子科技有限公司</p>
                                                <p className="text-xs text-slate-500">投诉量: {120 - i * 15} 票</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-red-400">{(5.2 - i * 0.5).toFixed(2)}%</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button className="w-full mt-4 py-2 text-sm text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                                    查看全部
                                </button>
                            </div>
                        </div>

                        {/* Detailed Grid Row */}
                        <div className="bg-card/50 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden">
                            <div className="p-6 border-b border-white/5 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-white">各行业指标详情</h3>
                                <div className="flex gap-2">
                                    <button className="text-xs px-3 py-1 rounded-full bg-primary-500/20 text-primary-400 border border-primary-500/20">工业设备</button>
                                    <button className="text-xs px-3 py-1 rounded-full bg-white/5 text-slate-400 border border-white/10 hover:text-white">消费电子</button>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-400">
                                    <thead className="bg-white/5 uppercase">
                                        <tr>
                                            <th className="px-6 py-4 font-medium text-slate-300">行业</th>
                                            <th className="px-6 py-4 font-medium text-slate-300">平均件量</th>
                                            <th className="px-6 py-4 font-medium text-slate-300">48周投诉率</th>
                                            <th className="px-6 py-4 font-medium text-slate-300">49周投诉率</th>
                                            <th className="px-6 py-4 font-medium text-slate-300">50周投诉率</th>
                                            <th className="px-6 py-4 font-medium text-slate-300">01周投诉率</th>
                                            <th className="px-6 py-4 font-medium text-slate-300">02周投诉率</th>
                                            <th className="px-6 py-4 font-medium text-slate-300">趋势</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {[1, 2, 3].map((row) => (
                                            <tr key={row} className="hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4 font-medium text-white flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                                    工业设备
                                                </td>
                                                <td className="px-6 py-4">1,219</td>
                                                <td className="px-6 py-4">1,727.61</td>
                                                <td className="px-6 py-4">3,177.97</td>
                                                <td className="px-6 py-4">2,738.23</td>
                                                <td className="px-6 py-4 font-bold text-white">6,980.80</td>
                                                <td className="px-6 py-4 text-green-400">1,423.63</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-0.5 items-end h-8">
                                                        {[40, 60, 55, 30, 80, 20].map((h, i) => (
                                                            <div key={i} style={{ height: `${h}%` }} className="w-1 bg-primary-500/50 rounded-t-sm hover:bg-primary-400 transition-colors"></div>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {/* Business Tab Content */}
                {activeTab === 'business' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-card/50 backdrop-blur-md border border-white/5 rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-white mb-6">业务量分布 (Top 10)</h3>
                            <div className="h-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={trendData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="name" stroke="#64748b" />
                                        <YAxis stroke="#64748b" />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        />
                                        <Bar dataKey="value" name="业务量" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="grid gap-4">
                            <StatCard
                                title="总业务量"
                                value="7,800,903"
                                unit="票"
                                trend={16.13}
                                trendLabel="环比"
                            />
                            <StatCard
                                title="总收入"
                                value="28,333.59"
                                unit="万元"
                                trend={14.75}
                                trendLabel="环比"
                            />
                            <div className="flex-1 bg-card/50 backdrop-blur-md border border-white/5 rounded-2xl p-6">
                                <h3 className="text-lg font-medium text-slate-300 mb-4">业务增长 Top 5 行业</h3>
                                <div className="space-y-3">
                                    {['通用设备及配件', '居家家居', '应用化工', '重工机械', '工程自动化'].map((industry, i) => (
                                        <div key={i} className="flex justify-between items-center text-sm">
                                            <span className="text-white flex items-center gap-2">
                                                <span className="text-green-400 font-mono">0{i + 1}</span>
                                                {industry}
                                            </span>
                                            <span className="text-green-400 font-medium">+{(20 - i * 3.5).toFixed(1)}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
