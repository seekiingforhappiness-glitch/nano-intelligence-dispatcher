'use client';

import { useState } from 'react';
import { Settings2, Route, Target, Users, Plus, ChevronRight, Zap, MapPin, Truck } from 'lucide-react';
import Link from 'next/link';

// 策略类型标签页
type PolicyTab = 'resource' | 'route' | 'priority';

export default function PoliciesPage() {
    const [activeTab, setActiveTab] = useState<PolicyTab>('resource');

    return (
        <div className="space-y-6">
            {/* 页面标题 */}
            <div className="border border-dark-700 rounded-xl p-6 bg-dark-900/60">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-primary/20 rounded-lg">
                        <Settings2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">调度策略</h1>
                        <p className="text-dark-400 text-sm">配置智能排线规则，提升调度效率</p>
                    </div>
                </div>
                <p className="text-dark-300 text-sm">
                    通过资源固化、路线模板等策略，将特定车型、承运商绑定到指定区域或客户，实现精细化调度管理。
                </p>
            </div>

            {/* 标签页切换 */}
            <div className="flex gap-2 border-b border-dark-700 pb-3">
                <TabButton
                    active={activeTab === 'resource'}
                    onClick={() => setActiveTab('resource')}
                    icon={Target}
                    label="资源固化"
                    count={0}
                />
                <TabButton
                    active={activeTab === 'route'}
                    onClick={() => setActiveTab('route')}
                    icon={Route}
                    label="路线模板"
                    count={0}
                />
                <TabButton
                    active={activeTab === 'priority'}
                    onClick={() => setActiveTab('priority')}
                    icon={Zap}
                    label="优先级规则"
                    count={0}
                />
            </div>

            {/* 内容区域 */}
            {activeTab === 'resource' && <ResourceBindingSection />}
            {activeTab === 'route' && <RouteTemplateSection />}
            {activeTab === 'priority' && <PriorityRuleSection />}
        </div>
    );
}

// 标签按钮组件
function TabButton({
    active,
    onClick,
    icon: Icon,
    label,
    count
}: {
    active: boolean;
    onClick: () => void;
    icon: any;
    label: string;
    count: number;
}) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${active
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'text-dark-400 hover:bg-dark-800 hover:text-white border border-transparent'
                }`}
        >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
            {count > 0 && (
                <span className={`px-1.5 py-0.5 text-xs rounded-full ${active ? 'bg-primary/30' : 'bg-dark-700'
                    }`}>
                    {count}
                </span>
            )}
        </button>
    );
}

// ========== 资源固化策略 ==========
function ResourceBindingSection() {
    return (
        <div className="space-y-4">
            {/* 说明卡片 */}
            <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <Target className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                        <h3 className="text-white font-medium mb-1">资源固化策略</h3>
                        <p className="text-dark-400 text-sm">
                            将特定车型、承运商或司机绑定到指定区域或客户。例如：上海地区订单优先使用 A 承运商的冷链车。
                        </p>
                    </div>
                </div>
            </div>

            {/* 空状态 */}
            <EmptyState
                icon={Target}
                title="暂无资源固化策略"
                description="创建策略后，系统将在排线时自动应用资源绑定规则"
                actionLabel="新建策略"
            />
        </div>
    );
}

// ========== 路线模板 ==========
function RouteTemplateSection() {
    return (
        <div className="space-y-4">
            {/* 说明卡片 */}
            <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <Route className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                        <h3 className="text-white font-medium mb-1">路线模板</h3>
                        <p className="text-dark-400 text-sm">
                            预定义客户访问顺序，适用于固定配送线路。例如：每周一固定走"仓库→A客户→B客户→C客户"路线。
                        </p>
                    </div>
                </div>
            </div>

            {/* 空状态 */}
            <EmptyState
                icon={Route}
                title="暂无路线模板"
                description="创建模板后，可在排线时直接应用固定路线"
                actionLabel="新建模板"
            />
        </div>
    );
}

// ========== 优先级规则 ==========
function PriorityRuleSection() {
    return (
        <div className="space-y-4">
            {/* 说明卡片 */}
            <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                        <h3 className="text-white font-medium mb-1">优先级规则</h3>
                        <p className="text-dark-400 text-sm">
                            根据订单属性自动设置优先级。例如：VIP 客户订单自动标记为"加急"，优先安排配送。
                        </p>
                    </div>
                </div>
            </div>

            {/* 空状态 */}
            <EmptyState
                icon={Zap}
                title="暂无优先级规则"
                description="创建规则后，系统将自动为匹配的订单设置优先级"
                actionLabel="新建规则"
            />
        </div>
    );
}

// ========== 空状态组件 ==========
function EmptyState({
    icon: Icon,
    title,
    description,
    actionLabel
}: {
    icon: any;
    title: string;
    description: string;
    actionLabel: string;
}) {
    return (
        <div className="border border-dashed border-dark-600 rounded-xl p-8 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-dark-800 rounded-full flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-dark-500" />
            </div>
            <h3 className="text-white font-medium mb-1">{title}</h3>
            <p className="text-dark-400 text-sm mb-4 max-w-md">{description}</p>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg text-sm font-medium transition-colors">
                <Plus className="w-4 h-4" />
                {actionLabel}
            </button>
        </div>
    );
}
