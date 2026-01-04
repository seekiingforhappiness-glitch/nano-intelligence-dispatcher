"use client";

import { SummaryCards } from '@/components/charts/SummaryCards';
import { CostBreakdownChart } from '@/components/charts/CostBreakdownChart';
import { TripLoadChart } from '@/components/charts/TripLoadChart';
import { useTaskStore } from '@/store/useTaskStore';

export default function AnalyticsPage() {
  const { scheduleResult } = useTaskStore();

  if (!scheduleResult) {
  return (
      <div className="rounded-xl border border-dashed border-dark-700 p-6 text-dark-400 text-sm">
        暂无调度结果数据。请先在“任务控制台”完成一次排线任务，然后这里将展示成本、准时率等图表。
      </div>
    );
  }

  const { summary, trips } = scheduleResult;

  return (
    <div className="space-y-6">
      <SummaryCards
        totalOrders={summary.totalOrders}
        totalTrips={summary.totalTrips}
        totalDistance={summary.totalDistance}
        totalCost={summary.totalCost}
        riskOrders={summary.riskOrders.length}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-72 rounded-2xl border border-dark-700 bg-dark-900/60 p-4">
          <p className="text-lg font-semibold mb-2">成本构成</p>
          <CostBreakdownChart breakdown={summary.costBreakdown} />
        </div>
        <div className="h-72 rounded-2xl border border-dark-700 bg-dark-900/60 p-4">
          <p className="text-lg font-semibold mb-2">车次装载率</p>
          <TripLoadChart
            trips={trips.map((trip) => ({
              tripId: trip.tripId,
              loadRateWeight: trip.loadRateWeight || 0,
              loadRatePallet: trip.loadRatePallet || 0,
            }))}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-dark-700 bg-dark-900/60 p-4">
        <p className="text-lg font-semibold mb-2">风险与异常</p>
        {summary.invalidOrders.length === 0 && summary.riskOrders.length === 0 ? (
          <p className="text-dark-400 text-sm">本次任务未发现风险或失败的订单。</p>
        ) : (
          <ul className="space-y-2 text-sm text-dark-200">
            {summary.riskOrders.map((id) => (
              <li key={`risk-${id}`} className="text-yellow-300">
                ⚠️ 风险订单 {id}：可能晚到
              </li>
            ))}
            {summary.invalidOrders.map((id) => (
              <li key={`invalid-${id}`} className="text-red-300">
                ❌ {id} 无法排线（地址解析失败或数据缺失）
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
