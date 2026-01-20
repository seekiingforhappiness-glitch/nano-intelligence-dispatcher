'use client';

import { Download, Copy, AlertTriangle, CheckCircle, Truck, Route, Clock, DollarSign, Star, Info } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ScheduleResult } from '@/types/schedule';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface ResultDashboardProps {
  result: ScheduleResult;
  onDownload: () => void;
  isDownloading?: boolean;
}

export function ResultDashboard({
  result,
  onDownload,
  isDownloading = false,
}: ResultDashboardProps) {
  const { schemes } = result;
  const [activeSchemeId, setActiveSchemeId] = useState<string>(schemes?.[0]?.id || 'cost_optimized');

  // 当前激活的方案
  const activeScheme = schemes?.find(s => s.id === activeSchemeId) || {
    summary: result.summary,
    trips: result.trips,
    name: '默认方案',
    description: '基础调度方案'
  };

  const { summary, trips } = activeScheme;

  const handleCopySummary = () => {
    const text = generateSummaryText(result);
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      {/* 方案选择 Tabs */}
      {schemes && schemes.length > 1 && (
        <div className="bg-dark-900/40 border border-white/5 p-1.5 rounded-2xl flex gap-1">
          {schemes.map((scheme) => (
            <button
              key={scheme.id}
              onClick={() => setActiveSchemeId(scheme.id)}
              className={cn(
                "flex-1 flex flex-col items-center py-3 px-4 rounded-xl transition-all relative overflow-hidden",
                activeSchemeId === scheme.id
                  ? "bg-primary/10 border border-primary/20 text-white shadow-[0_0_20px_rgba(59,130,246,0.15)]"
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                {scheme.tag && (
                  <Badge variant="tech" className={cn(
                    "px-1.5 py-0 text-[10px]",
                    scheme.tag === '推荐' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' :
                      scheme.tag === '省钱' ? 'bg-amber-500/20 text-amber-400 border-amber-500/20' :
                        'bg-blue-500/20 text-blue-400 border-blue-500/20'
                  )}>
                    {scheme.tag}
                  </Badge>
                )}
                <span className="font-bold text-sm">{scheme.name}</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] opacity-70">
                <span className="flex items-center gap-1"><Truck className="w-3 h-3" />{scheme.summary.totalTrips}趟</span>
                <span className="flex items-center gap-1 font-mono">¥{scheme.summary.totalCost.toLocaleString()}</span>
              </div>
              {activeSchemeId === scheme.id && (
                <div className="absolute top-0 right-0 p-1">
                  <Star className="w-3 h-3 text-primary fill-primary" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* 方案说明区 */}
      <Card variant="outline" className="p-4 bg-primary/5 border-primary/10">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h5 className="text-white font-medium text-sm leading-tight">方案策略导读</h5>
            <p className="text-slate-400 text-xs mt-1 leading-relaxed">
              {activeScheme.description}
            </p>
          </div>
        </div>
      </Card>

      {/* 成功提示 */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
        <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" />
        <div>
          <p className="text-emerald-400 font-medium">排线智能调度完成 - [{activeScheme.name}]</p>
          <p className="text-emerald-400/70 text-sm">
            系统已成功为 <span className="text-white font-mono mx-1">{summary.totalOrders}</span> 个订单生成 <span className="text-white font-mono mx-1">{summary.totalTrips}</span> 个最优车次方案
          </p>
        </div>
      </div>

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={<Truck className="w-5 h-5" />}
          label="总订单"
          value={summary.totalOrders}
          unit="单"
          color="primary"
        />
        <MetricCard
          icon={<Route className="w-5 h-5" />}
          label="总车次"
          value={summary.totalTrips}
          unit="趟"
          color="accent"
        />
        <MetricCard
          icon={<Clock className="w-5 h-5" />}
          label="总里程"
          value={summary.totalDistance}
          unit="km"
          color="blue"
        />
        <MetricCard
          icon={<DollarSign className="w-5 h-5" />}
          label="总成本"
          value={`¥${summary.totalCost.toLocaleString()}`}
          color="green"
        />
      </div>

      {/* 车型分布 */}
      <Card variant="glass" className="p-5">
        <h4 className="text-white font-medium mb-3 flex items-center gap-2">
          <Truck className="w-4 h-4 text-primary" />
          车型分布详情
        </h4>
        <div className="flex flex-wrap gap-2">
          {Object.entries(summary.vehicleBreakdown).map(([type, count]) => (
            <Badge key={type} variant="tech" className="px-3 py-1.5 text-sm">
              <span className="text-slate-300 mr-2">{type}</span>
              <span className="text-white font-bold">× {count}</span>
            </Badge>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-6 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <span>平均重量装载率:</span>
            <div className="h-1.5 w-16 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${summary.avgLoadRateWeight * 100}%` }} />
            </div>
            <span className="text-primary font-mono">{Math.round(summary.avgLoadRateWeight * 100)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span>平均托盘装载率:</span>
            <div className="h-1.5 w-16 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${summary.avgLoadRatePallet * 100}%` }} />
            </div>
            <span className="text-emerald-500 font-mono">{Math.round(summary.avgLoadRatePallet * 100)}%</span>
          </div>
        </div>
      </Card>

      {/* 约束触发情况 */}
      <Card variant="glass" className="p-5">
        <h4 className="text-white font-medium mb-3">约束规则触发统计</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
          <ConstraintBadge
            label="飞翼车要求"
            count={summary.constraintsSummary.flyingWingRequired}
          />
          <ConstraintBadge
            label="周末不收"
            count={summary.constraintsSummary.weekendExcluded}
          />
          <ConstraintBadge
            label="不可堆叠"
            count={summary.constraintsSummary.noStackOrders}
          />
          <ConstraintBadge
            label="必须排最后"
            count={summary.constraintsSummary.mustBeLastOrders}
          />
          <ConstraintBadge
            label="单独配送"
            count={summary.constraintsSummary.singleTripOrders}
          />
        </div>
      </Card>

      {/* 风险提示 */}
      {(summary.riskOrders.length > 0 || summary.invalidOrders.length > 0) && (
        <Card variant="outline" className="p-4 border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-400 font-medium">调度风险预警</p>
              {summary.riskOrders.length > 0 && (
                <p className="text-yellow-400/80 text-sm mt-1">
                  <span className="font-bold">{summary.riskOrders.length}</span> 单可能存在延误风险：
                  <span className="opacity-80 ml-1">{summary.riskOrders.slice(0, 5).join(', ')}</span>
                  {summary.riskOrders.length > 5 && ' ...'}
                </p>
              )}
              {summary.invalidOrders.length > 0 && (
                <p className="text-yellow-400/80 text-sm mt-1">
                  <span className="font-bold">{summary.invalidOrders.length}</span> 单地址解析失败，无法自动排线
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* 操作按钮 */}
      <div className="flex flex-wrap gap-3 pt-2">
        <Button
          onClick={onDownload}
          isLoading={isDownloading}
          className="px-6"
        >
          <Download className="w-4 h-4 mr-2" />
          下载排线结果 (Excel)
        </Button>

        <Button
          variant="secondary"
          onClick={handleCopySummary}
          className="px-6"
        >
          <Copy className="w-4 h-4 mr-2" />
          复制汇总报告
        </Button>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  unit,
  color = 'primary',
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  color?: 'primary' | 'accent' | 'blue' | 'green';
}) {
  const colorClasses = {
    primary: 'bg-primary/10 border-primary/20 text-primary',
    accent: 'bg-orange-500/10 border-orange-500/20 text-orange-500',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
    green: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500',
  };

  return (
    <Card className={cn('p-5 border flex flex-col justify-between h-28', colorClasses[color])}>
      <div className="flex justify-between items-start">
        <div className="opacity-80">{icon}</div>
        <div className="text-xs font-medium opacity-60 uppercase tracking-wider">{label}</div>
      </div>
      <div className="text-3xl font-bold font-mono tracking-tight text-white mt-2">
        {value}
        {unit && <span className="text-sm font-normal text-slate-400 ml-1.5">{unit}</span>}
      </div>
    </Card>
  );
}

function ConstraintBadge({ label, count }: { label: string; count: number }) {
  if (count === 0) {
    return (
      <div className="flex items-center justify-between p-2.5 bg-white/5 border border-white/5 rounded-lg opacity-60">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-600">-</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between p-2.5 bg-primary/10 border border-primary/20 rounded-lg shadow-[0_0_10px_rgba(59,130,246,0.1)]">
      <span className="text-slate-200">{label}</span>
      <span className="font-bold text-primary">{count}</span>
    </div>
  );
}

function generateSummaryText(result: ScheduleResult): string {
  const { summary } = result;
  const lines = [
    '📊 纳米智能排线 - 调度汇总报告',
    `生成时间: ${new Date().toLocaleString()}`,
    '',
    '【基本统计】',
    `总订单数: ${summary.totalOrders} 单`,
    `总车次数: ${summary.totalTrips} 趟`,
    `总里程: ${summary.totalDistance} km`,
    `总时长: ${summary.totalDuration} 小时`,
    `总成本: ¥${summary.totalCost}`,
    '',
    '【装载率】',
    `平均装载率(重量): ${Math.round(summary.avgLoadRateWeight * 100)}%`,
    `平均装载率(托盘): ${Math.round(summary.avgLoadRatePallet * 100)}%`,
    '',
    '【车型分布】',
    ...Object.entries(summary.vehicleBreakdown).map(([t, c]) => `${t}: ${c} 趟`),
    '',
    '【约束触发】',
    `飞翼车要求: ${summary.constraintsSummary.flyingWingRequired}`,
    `周末不收: ${summary.constraintsSummary.weekendExcluded}`,
    `不可堆叠: ${summary.constraintsSummary.noStackOrders}`,
    `必须排最后: ${summary.constraintsSummary.mustBeLastOrders}`,
    `单独配送: ${summary.constraintsSummary.singleTripOrders}`,
  ];

  if (summary.riskOrders.length > 0) {
    lines.push('', '⚠️ 风险订单:', ...summary.riskOrders);
  }

  return lines.join('\n');
}


