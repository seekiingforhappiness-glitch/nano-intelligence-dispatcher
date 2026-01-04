'use client';

import { Download, Copy, AlertTriangle, CheckCircle, Truck, Route, Clock, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScheduleResult } from '@/types/schedule';

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
  const { summary, trips } = result;

  const handleCopySummary = () => {
    const text = generateSummaryText(result);
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      {/* 成功提示 */}
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
        <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
        <div>
          <p className="text-green-400 font-medium">排线完成！</p>
          <p className="text-green-400/70 text-sm">
            已为 {summary.totalOrders} 个订单生成 {summary.totalTrips} 个车次
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
      <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-4">
        <h4 className="text-white font-medium mb-3">车型分布</h4>
        <div className="flex flex-wrap gap-2">
          {Object.entries(summary.vehicleBreakdown).map(([type, count]) => (
            <div
              key={type}
              className="px-3 py-1.5 bg-dark-700 rounded-lg flex items-center gap-2"
            >
              <span className="text-dark-300">{type}</span>
              <span className="text-primary-400 font-medium">×{count}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-4 text-sm text-dark-400">
          <span>
            平均装载率(重量):{' '}
            <span className="text-primary-400">
              {Math.round(summary.avgLoadRateWeight * 100)}%
            </span>
          </span>
          <span>
            平均装载率(托盘):{' '}
            <span className="text-primary-400">
              {Math.round(summary.avgLoadRatePallet * 100)}%
            </span>
          </span>
        </div>
      </div>

      {/* 约束触发情况 */}
      <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-4">
        <h4 className="text-white font-medium mb-3">约束触发情况</h4>
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
      </div>

      {/* 风险提示 */}
      {(summary.riskOrders.length > 0 || summary.invalidOrders.length > 0) && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-400 font-medium">风险提示</p>
              {summary.riskOrders.length > 0 && (
                <p className="text-yellow-400/70 text-sm mt-1">
                  {summary.riskOrders.length} 单可能晚到：
                  {summary.riskOrders.slice(0, 5).join(', ')}
                  {summary.riskOrders.length > 5 && ' ...'}
                </p>
              )}
              {summary.invalidOrders.length > 0 && (
                <p className="text-yellow-400/70 text-sm mt-1">
                  {summary.invalidOrders.length} 单无法排线（地址解析失败）
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={onDownload}
          disabled={isDownloading}
          className={cn(
            'flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all',
            'bg-primary-500 hover:bg-primary-400 text-dark-900',
            isDownloading && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Download className="w-5 h-5" />
          {isDownloading ? '正在生成...' : '下载排线结果'}
        </button>

        <button
          onClick={handleCopySummary}
          className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all
            border border-dark-600 hover:border-primary-500/50 text-white hover:text-primary-400"
        >
          <Copy className="w-5 h-5" />
          复制汇总报告
        </button>
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
    primary: 'bg-primary-500/10 border-primary-500/30 text-primary-400',
    accent: 'bg-accent-500/10 border-accent-500/30 text-accent-400',
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    green: 'bg-green-500/10 border-green-500/30 text-green-400',
  };

  return (
    <div className={cn('rounded-xl p-4 border', colorClasses[color])}>
      <div className="flex items-center gap-2 mb-2 opacity-70">{icon}</div>
      <div className="text-2xl font-bold text-white">
        {value}
        {unit && <span className="text-sm font-normal text-dark-400 ml-1">{unit}</span>}
      </div>
      <div className="text-sm opacity-70">{label}</div>
    </div>
  );
}

function ConstraintBadge({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center justify-between p-2 bg-dark-700 rounded-lg">
      <span className="text-dark-300">{label}</span>
      <span className={cn('font-medium', count > 0 ? 'text-primary-400' : 'text-dark-500')}>
        {count}
      </span>
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


