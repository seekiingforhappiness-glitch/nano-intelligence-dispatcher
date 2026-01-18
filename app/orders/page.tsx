'use client';

import { useState, useEffect } from 'react';
import { Package, Search, Filter, Plus, Upload, Download, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function OrdersPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [orders, setOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch('/api/orders')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setOrders(data);
                }
            })
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, []);

    const filteredOrders = orders.filter(order =>
        order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.address?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* 顶部标题与操作 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Package className="w-8 h-8 text-primary-400" />
                        订单管理
                    </h1>
                    <p className="text-slate-400 mt-1">管理所有运输订单，查看状态与进度</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/orders/import">
                        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-500 hover:to-accent-500 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-primary-500/25">
                            <Upload className="w-4 h-4" />
                            导入订单
                        </button>
                    </Link>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-all border border-white/10">
                        <Download className="w-4 h-4" />
                        导出
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 rounded-xl font-medium transition-all border border-primary-500/20">
                        <Plus className="w-4 h-4" />
                        新建
                    </button>
                </div>
            </div>

            {/* 筛选工具栏 */}
            <div className="bg-card/50 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="搜索订单号、客户名称、地址..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:border-primary-500/50 transition-colors"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-black/20 hover:bg-black/30 text-slate-300 rounded-xl transition-all border border-white/10">
                        <Filter className="w-4 h-4" />
                        <span>筛选</span>
                    </button>
                    {/* 状态 Tab */}
                    <div className="flex p-1 bg-black/20 rounded-xl border border-white/10">
                        <button className="px-3 py-1 bg-primary-500/20 text-primary-300 rounded-lg text-sm font-medium">全部</button>
                        <button className="px-3 py-1 text-slate-400 hover:text-white rounded-lg text-sm transition-colors">待排线</button>
                        <button className="px-3 py-1 text-slate-400 hover:text-white rounded-lg text-sm transition-colors">运输中</button>
                        <button className="px-3 py-1 text-slate-400 hover:text-white rounded-lg text-sm transition-colors">已完成</button>
                    </div>
                </div>
            </div>

            {/* 订单列表 */}
            <div className="bg-card/50 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden min-h-[400px]">
                {/* Table Header */}
                <div className="grid grid-cols-7 gap-4 p-4 border-b border-white/5 text-sm font-medium text-slate-400 bg-white/5">
                    <div className="col-span-1">订单号</div>
                    <div className="col-span-2">客户信息</div>
                    <div className="col-span-1">货物详情</div>
                    <div className="col-span-1">收货地址</div>
                    <div className="col-span-1">状态</div>
                    <div className="col-span-1 text-right">操作</div>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
                    </div>
                ) : filteredOrders.length > 0 ? (
                    <div className="divide-y divide-white/5">
                        {filteredOrders.map((order) => (
                            <div key={order.id} className="grid grid-cols-7 gap-4 p-4 items-center hover:bg-white/5 transition-colors text-sm">
                                <div className="col-span-1 font-mono text-slate-300 truncate" title={order.order_number}>{order.order_number}</div>
                                <div className="col-span-2">
                                    <div className="text-white font-medium truncate" title={order.customer_name}>{order.customer_name || '-'}</div>
                                    <div className="text-slate-500 text-xs truncate max-w-[200px]" title={order.requirements}>{order.requirements}</div>
                                </div>
                                <div className="col-span-1 text-slate-300">
                                    {order.weight ? `${order.weight}kg` : '-'} / {order.quantity}件
                                </div>
                                <div className="col-span-1 text-slate-400 truncate" title={order.address}>{order.address}</div>
                                <div className="col-span-1">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
                                        待排线
                                    </span>
                                </div>
                                <div className="col-span-1 flex justify-end gap-2">
                                    <button className="text-primary-400 hover:text-primary-300 transition-colors">详情</button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* Empty State */
                    <div className="p-12 flex flex-col items-center justify-center text-center h-64">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                            <Package className="w-8 h-8 text-slate-600" />
                        </div>
                        <h3 className="text-lg font-medium text-white mb-2">暂无订单数据</h3>
                        <p className="text-slate-500 max-w-sm mb-6">目前还没有任何订单，您可以点击右上角的&quot;导入订单&quot;按钮开始导入数据。</p>
                        <Link href="/orders/import">
                            <button className="px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-medium transition-colors">
                                立即导入
                            </button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
