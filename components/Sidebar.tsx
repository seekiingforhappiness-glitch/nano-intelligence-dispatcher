'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Package,
    Truck,
    Map,
    BarChart3,
    Settings,
    Upload,
    Users,
    ClipboardList,
    ChevronDown,
    ChevronRight,
    LogOut,
    Settings2,
    Target,
    Route
} from 'lucide-react';
import { clsx } from 'clsx';
import { useState, useEffect } from 'react';

interface MenuItem {
    name: string;
    icon: any;
    href: string;
    subItems?: { name: string; href: string; icon?: any }[];
}

const menuItems: MenuItem[] = [
    {
        name: '工作台',
        icon: LayoutDashboard,
        href: '/dashboard',
        subItems: [
            { name: '任务调度', href: '/dashboard/tasks', icon: ClipboardList },
            { name: '调度图谱', href: '/dashboard/map', icon: Map },
            { name: '效能报告', href: '/dashboard/analytics', icon: BarChart3 },
        ]
    },
    {
        name: '调度策略',
        icon: Settings2,
        href: '/dashboard/policies',
        subItems: [
            { name: '资源固化', href: '/dashboard/policies', icon: Target },
            { name: '路线模板', href: '/dashboard/policies?tab=route', icon: Route },
        ]
    },
    {
        name: '订单中心',
        icon: Package,
        href: '/orders',
        subItems: [
            { name: '订单列表', href: '/orders' },
            { name: '导入订单', href: '/orders/import', icon: Upload },
        ]
    },
    {
        name: '运力管理',
        icon: Truck,
        href: '/fleet',
        subItems: [
            { name: '车辆管理', href: '/fleet/vehicles', icon: Truck },
            { name: '司机管理', href: '/fleet/drivers', icon: Users },
        ]
    },
    { name: '报表分析', icon: BarChart3, href: '/reports' },
    { name: '系统设置', icon: Settings, href: '/dashboard/settings' },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [expandedItems, setExpandedItems] = useState<string[]>([]);

    useEffect(() => {
        const activeItem = menuItems.find(item =>
            item.href === pathname ||
            item.subItems?.some(sub => pathname === sub.href || pathname.startsWith(sub.href + '/'))
        );
        if (activeItem && !expandedItems.includes(activeItem.href)) {
            setExpandedItems(prev => [...prev, activeItem.href]);
        }
    }, [pathname, expandedItems]);

    const toggleExpand = (href: string) => {
        setExpandedItems(prev =>
            prev.includes(href)
                ? prev.filter(h => h !== href)
                : [...prev, href]
        );
    };

    const isActive = (href: string) => pathname === href;
    const isParentActive = (item: MenuItem) => {
        if (pathname === item.href) return true;
        if (item.subItems) {
            return item.subItems.some(sub => pathname === sub.href || pathname.startsWith(sub.href + '/'));
        }
        return pathname.startsWith(item.href + '/');
    };

    return (
        <div className="h-full flex flex-col bg-[#0f1623]/80 backdrop-blur-xl">
            {/* Logo Area */}
            <div className="h-16 flex items-center px-6 border-b border-white/[0.08] bg-black/10">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                    <Truck className="w-5 h-5 text-white" />
                </div>
                <span className="ml-3 text-lg font-heading font-bold text-white tracking-wide text-glow-sm">
                    NANO<span className="text-primary">TECH</span>
                </span>
            </div>

            {/* Main Navigation */}
            <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto custom-scrollbar">
                {menuItems.map((item) => {
                    const parentActive = isParentActive(item);
                    const hasSubItems = item.subItems && item.subItems.length > 0;
                    const isExpanded = expandedItems.includes(item.href);

                    return (
                        <div key={item.href} className="mb-1">
                            {/* Parent Item */}
                            <div
                                className={clsx(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer group select-none relative overflow-hidden",
                                    parentActive
                                        ? "bg-primary/10 text-primary border border-primary/20 shadow-[inset_0_0_10px_rgba(59,130,246,0.1)]"
                                        : "text-slate-400 hover:bg-white/5 hover:text-slate-200 hover:border hover:border-white/5 border border-transparent"
                                )}
                                onClick={() => {
                                    if (hasSubItems) {
                                        toggleExpand(item.href);
                                    }
                                }}
                            >
                                {parentActive && (
                                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary shadow-[0_0_10px_#3B82F6]" />
                                )}

                                <item.icon className={clsx("w-5 h-5 transition-colors", parentActive ? "text-primary drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]" : "text-slate-500 group-hover:text-slate-300")} />

                                {hasSubItems ? (
                                    <>
                                        <span className={clsx("font-medium text-sm flex-1", parentActive && "text-glow-sm")}>{item.name}</span>
                                        {isExpanded ? (
                                            <ChevronDown className="w-4 h-4 text-slate-500 transition-transform duration-200" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4 text-slate-500 transition-transform duration-200" />
                                        )}
                                    </>
                                ) : (
                                    <Link href={item.href} className={clsx("font-medium text-sm flex-1 block", parentActive && "text-glow-sm")}>
                                        {item.name}
                                    </Link>
                                )}
                            </div>

                            {/* Sub Items */}
                            {hasSubItems && isExpanded && (
                                <div className="ml-5 mt-1 space-y-0.5 border-l border-white/10 pl-3 relative">
                                    {item.subItems!.map((sub) => (
                                        <Link
                                            key={sub.href}
                                            href={sub.href}
                                            className={clsx(
                                                "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-all relative overflow-hidden",
                                                isActive(sub.href)
                                                    ? "text-primary bg-primary/10 font-medium border border-primary/20"
                                                    : "text-slate-500 hover:text-slate-200 hover:bg-white/5 border border-transparent"
                                            )}
                                        >
                                            {sub.icon && <sub.icon className="w-4 h-4 opacity-70" />}
                                            <span className={clsx(isActive(sub.href) && "text-glow-sm")}>{sub.name}</span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            {/* Quick Action */}
            <div className="p-4 border-t border-white/[0.08] bg-black/10">
                <Link href="/dashboard/tasks">
                    <button className="w-full relative group overflow-hidden flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-blue-600 text-white py-2.5 px-4 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-[0.98]">
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />
                        <ClipboardList className="w-4 h-4 relative z-10" />
                        <span className="relative z-10">快速开始排线</span>
                    </button>
                </Link>
            </div>

            {/* User Profile */}
            <div className="p-4 border-t border-white/[0.08] bg-black/20">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group border border-transparent hover:border-white/5">
                    <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-slate-300 shadow-inner group-hover:border-primary/50 transition-colors">
                        <Users className="w-5 h-5 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200 group-hover:text-white truncate transition-colors">Admin User</p>
                        <p className="text-xs text-slate-500 group-hover:text-slate-400 truncate transition-colors">admin@nano.com</p>
                    </div>
                    <LogOut className="w-4 h-4 text-slate-600 group-hover:text-red-400 transition-colors" />
                </div>
            </div>
        </div>
    );
}
