"use client";

import { SummaryCards } from '@/components/charts/SummaryCards';
import { CostBreakdownChart } from '@/components/charts/CostBreakdownChart';
import { TripLoadChart } from '@/components/charts/TripLoadChart';
import { EfficiencyMetrics } from '@/components/charts/EfficiencyMetrics';
import { TripDetailTable } from '@/components/charts/TripDetailTable';
import { useTaskStore } from '@/store/useTaskStore';

export default function AnalyticsPage() {
  const { scheduleResult } = useTaskStore();

  if (!scheduleResult) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fade-in">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center animate-pulse-slow">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-4xl">📊</span>
            </div>
          </div>
          <div className="absolute inset-0 border border-primary/20 rounded-full animate-spin-slower" />
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="text-2xl font-bold text-white tracking-tight">等待数据输入</h2>
          <p className="text-slate-400">
            暂无调度结果数据。请前往 <span className="text-primary font-medium">任务控制台</span> 启动新的排线任务，系统将自动生成包括成本、效率及风险的多维度分析报告。
          </p>
        </div>
      </div>
    );
  }

  const { summary, trips } = scheduleResult;

  return (
    <div className="grid grid-cols-24 gap-6 pb-10">
      {/* 页面标题区 - Col Span 24 */}
      <div className="col-span-24 flex items-end justify-between mb-2">
        <div>
          <h2 className="text-2xl font-heading font-bold text-white tracking-tight flex items-center gap-3">
            <span className="w-1 h-8 bg-gradient-to-b from-primary to-blue-600 rounded-full" />
            效能分析报告
          </h2>
          <p className="text-slate-400 text-sm mt-1 ml-4 pl-0.5">
            基于 <span className="text-white font-mono">{summary.totalOrders}</span> 个订单的智能调度分析结果
          </p>
        </div>
        <div className="text-xs text-slate-500 font-mono bg-white/5 px-2 py-1 rounded border border-white/5">
          REPORT-ID: {new Date().getTime().toString(36).toUpperCase()}
        </div>
      </div>

      {/* 核心 KPI 卡片 - Col Span 24 */}
      <div className="col-span-24">
        <SummaryCards
          totalOrders={summary.totalOrders}
          totalTrips={summary.totalTrips}
          totalDistance={summary.totalDistance}
          totalCost={summary.totalCost}
          riskOrders={summary.riskOrders.length}
        />
      </div>

      {/* 效率指标 - Col Span 16 (Main) */}
      <div className="col-span-24 xl:col-span-16">
        <div className="glass-panel p-6 rounded-2xl h-full border-t border-white/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-sm bg-primary" />
            运营效率指标
          </h3>
          <EfficiencyMetrics
            totalOrders={summary.totalOrders}
            totalTrips={summary.totalTrips}
            totalDistance={summary.totalDistance}
            totalCost={summary.totalCost}
            trips={trips}
          />
        </div>
      </div>

      {/* 风险与异常 - Col Span 8 (Side) */}
      <div className="col-span-24 xl:col-span-8">
        <div className="glass-panel p-6 rounded-2xl h-full border-t border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-3xl" />
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-sm bg-yellow-500" />
            风险监控
          </h3>

          {summary.invalidOrders.length === 0 && summary.riskOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-emerald-400 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <span className="text-2xl">🛡️</span>
              </div>
              <span className="font-medium">系统运行状态良好</span>
              <span className="text-xs text-emerald-400/60">未发现异常订单</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 仪表盘摘要 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-bold text-yellow-500 text-glow-sm">{summary.riskOrders.length}</span>
                  <span className="text-xs text-yellow-200/70 mt-1">风险预警</span>
                </div>
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-bold text-red-500 text-glow-sm">{summary.invalidOrders.length}</span>
                  <span className="text-xs text-red-200/70 mt-1">调度失败</span>
                </div>
              </div>

              {/* 滚动列表 */}
              <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-2 pr-1">
                {summary.riskOrders.map((id) => (
                  <div key={`risk-${id}`} className="flex items-start gap-3 p-3 rounded bg-yellow-500/5 border border-yellow-500/10 hover:bg-yellow-500/10 transition-colors">
                    <span className="mt-0.5 text-yellow-500 text-xs">⚠️</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-yellow-200 font-mono">{id}</p>
                      <p className="text-xs text-yellow-500/60 mt-0.5">可能延误 (ETA &gt; Deadline)</p>
                    </div>
                  </div>
                ))}
                {summary.invalidOrders.map((id) => (
                  <div key={`invalid-${id}`} className="flex items-start gap-3 p-3 rounded bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-colors">
                    <span className="mt-0.5 text-red-500 text-xs">❌</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-red-200 font-mono">{id}</p>
                      <p className="text-xs text-red-500/60 mt-0.5">地址解析失败或数据缺失</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 成本与装载率图表 - Split 12/12 */}
      <div className="col-span-24 xl:col-span-8">
        <div className="glass-panel p-6 rounded-2xl h-80 border-t border-white/10">
          <p className="text-lg font-semibold mb-4 text-white">成本构成分析</p>
          <CostBreakdownChart breakdown={summary.costBreakdown} />
        </div>
      </div>
      <div className="col-span-24 xl:col-span-16">
        <div className="glass-panel p-6 rounded-2xl h-80 border-t border-white/10">
          <p className="text-lg font-semibold mb-4 text-white">车次装载率分布</p>
          <TripLoadChart
            trips={trips.map((trip) => ({
              tripId: trip.tripId,
              loadRateWeight: trip.loadRateWeight || 0,
              loadRatePallet: trip.loadRatePallet || 0,
            }))}
          />
        </div>
      </div>

      {/* 车次明细表格 - Col Span 24 */}
      <div className="col-span-24">
        <div className="glass-panel p-6 rounded-2xl min-h-[400px] border-t border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-sm bg-blue-500" />
              智能排线明细
            </h3>
            <div className="flex gap-2">
              {/* 可以在这里放导出按钮等 */}
            </div>
          </div>
          <TripDetailTable trips={trips} />
        </div>
      </div>
    </div>
  );
}
