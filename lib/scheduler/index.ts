import { v4 as uuidv4 } from 'uuid';
import { Order, CleanedOrder } from '@/types/order';
import { VehicleConfig, CostMode } from '@/types/vehicle';
import {
  Trip,
  TripStop,
  ScheduleResult,
  ScheduleSummary,
  ScheduleProgress,
  ScheduleOptions,
} from '@/types/schedule';
import { parseConstraints } from '@/lib/parser/constraints';
import { geocodeAddress, batchGeocode } from '@/lib/amap/client';
import { haversineDistance, estimateRoadDistance, estimateDuration } from '@/lib/utils/haversine';
import { clusterOrders } from './clustering';
import { optimizeRoute, calculateTotalDistance, calculateSegmentDistances } from './routing';
import { packTrips, TempTrip } from './binPacking';
import { selectVehicle } from './vehicleSelection';

export type ProgressCallback = (progress: ScheduleProgress) => void;

/**
 * 调度选项的默认值
 */
const DEFAULT_OPTIONS: ScheduleOptions = {
  maxStops: 8,
  startTime: '06:00',
  deadline: '20:00',
  factoryDeadline: '17:00',
  unloadingMinutes: 30,
  costMode: 'mileage',
  showMarketReference: true,
};

/**
 * 主调度函数
 */
export async function scheduleOrders(
  cleanedOrders: CleanedOrder[],
  depotCoord: { lng: number; lat: number },
  vehicles: VehicleConfig[],
  options: Partial<ScheduleOptions> = {},
  onProgress?: ProgressCallback
): Promise<ScheduleResult> {
  const taskId = uuidv4();
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const reportProgress = (stage: number, stageName: string, percent: number, message: string) => {
    onProgress?.({
      taskId,
      stage,
      stageName,
      percent,
      message,
    });
  };

  try {
    // ===== 诊断日志 =====
    console.log('📊 调度开始 - 输入订单数:', cleanedOrders.length);
    console.log('📊 有效订单数:', cleanedOrders.filter(o => o.isValid).length);
    console.log('📊 无效订单原因:', cleanedOrders.filter(o => !o.isValid).map(o => ({
      row: o.rowIndex,
      errors: o.cleaningErrors,
      address: o.address?.substring(0, 20),
      weight: o.weightKg,
    })));

    // ===== 阶段 1: 解析约束 =====
    reportProgress(1, '解析运输要求', 10, '正在解析运输约束...');

    const ordersWithConstraints: Order[] = cleanedOrders
      .filter(o => o.isValid)
      .map(o => ({
        ...o,
        constraints: parseConstraints(o.requirementsRaw, o.packageSize),
        coordinates: null,
        geocodeSource: 'failed' as const,
        effectivePalletSlots: 1, // 暂时默认
      }));

    // 使用 deadline（默认20:00）作为默认时间窗结束时间，而不是 factoryDeadline（17:00）
    // factoryDeadline 应该只用于有特殊要求的订单
    const fallbackEndTime = opts.deadline;

    // 计算有效托盘位（考虑堆叠）并注入默认时间窗
    for (const order of ordersWithConstraints) {
      // 简化计算：按重量估算托盘位，不可堆叠则翻倍
      const basePallets = Math.ceil(order.weightKg / 1000); // 每吨约1个托盘位
      order.effectivePalletSlots = order.constraints.noStack ? basePallets * 2 : basePallets;

      if (!order.constraints.timeWindow) {
        order.constraints.timeWindow = {
          start: opts.startTime,
          end: fallbackEndTime,
        };
      }
    }

    reportProgress(1, '解析运输要求', 20, `已解析 ${ordersWithConstraints.length} 个订单的约束`);

    // ===== 阶段 2: 地址解析 =====
    reportProgress(2, '地址解析', 25, '正在获取地址坐标...');

    const addresses = ordersWithConstraints.map(o => o.address);
    const { results: geocodeResults, cacheHits } = await batchGeocode(addresses, (current, total, meta) => {
      const percent = 25 + Math.round((current / total) * 25);
      const cacheNote = meta && meta.cacheHits > 0 ? `（缓存 ${meta.cacheHits}）` : '';
      reportProgress(2, '地址解析', percent, `正在解析地址 ${current}/${total}${cacheNote}`);
    });

    // 更新订单坐标
    let geocodeSuccess = 0;
    for (const order of ordersWithConstraints) {
      const result = geocodeResults.get(order.address);
      if (result?.success) {
        order.coordinates = { lng: result.lng, lat: result.lat };
        order.geocodeSource = result.source;
        order.formattedAddress = result.formattedAddress;
        order.distanceFromDepot = haversineDistance(
          depotCoord.lat, depotCoord.lng,
          result.lat, result.lng
        );
        geocodeSuccess++;
      } else {
        order.geocodeSource = 'failed';
        order.cleaningWarnings.push('地址解析失败：' + (result?.error || '未知错误'));
      }
    }

    reportProgress(
      2,
      '地址解析',
      50,
      `地址解析完成，成功 ${geocodeSuccess}/${ordersWithConstraints.length}${cacheHits > 0 ? `（缓存命中 ${cacheHits}）` : ''
      }`
    );

    console.log('📍 地址解析结果:', {
      total: ordersWithConstraints.length,
      success: geocodeSuccess,
      failed: ordersWithConstraints.length - geocodeSuccess,
      failedAddresses: ordersWithConstraints
        .filter(o => !o.coordinates)
        .map(o => o.address?.substring(0, 30))
        .slice(0, 5),
    });

    // 过滤掉无法解析地址的订单
    const validOrders = ordersWithConstraints.filter(o => o.coordinates);
    const invalidOrders = ordersWithConstraints.filter(o => !o.coordinates);

    console.log('🚛 可排线订单数:', validOrders.length);

    // ===== 阶段 3 & 4: 执行调度策略（生成多方案） =====
    reportProgress(3, '执行调度算法', 55, '正在生成多套可选方案...');

    const strategyId = (options as any).strategyId || 'greedy';
    const { solverRegistry } = await import('./strategies/registry');
    const strategy = solverRegistry.get(strategyId) || solverRegistry.get('greedy')!;

    const schemes: any[] = [];

    // 方案 A: 成本优先 (允许自动升舱)
    const costFirstOutput = await strategy.solve({
      orders: validOrders as any,
      depot: depotCoord,
      vehicles,
      options: { ...opts, costMode: 'mileage' },
      onProgress: (p) => reportProgress(4, '生成：成本优先方案', 60 + p.percent * 0.1, p.message),
    });
    schemes.push({
      id: 'cost_optimized',
      name: '成本优先模式',
      tag: '省钱',
      description: '优先使用大车型合并订单，减少总台班数，降低单公里运费。',
      trips: costFirstOutput.trips,
      summary: generateSummary(costFirstOutput.trips, ordersWithConstraints, invalidOrders),
      score: 95
    });

    // 方案 B: 约束优先 (严格执行限小车，自动拆单)
    const strictOutput = await strategy.solve({
      orders: validOrders as any,
      depot: depotCoord,
      vehicles,
      options: { ...opts }, // 默认选项，包含我刚优化的自动拆单逻辑
      onProgress: (p) => reportProgress(4, '生成：严格拆单方案', 70 + p.percent * 0.1, p.message),
    });
    schemes.push({
      id: 'strict_constraint',
      name: '严格约束模式',
      tag: '稳健',
      description: '严格执行订单对车型的限制要求，超限订单自动拆分为多台小车。',
      trips: strictOutput.trips,
      summary: generateSummary(strictOutput.trips, ordersWithConstraints, invalidOrders),
      score: 88
    });

    // 方案 C: 时间窗安全 (留更多 Buffer)
    const safeOutput = await strategy.solve({
      orders: validOrders as any,
      depot: depotCoord,
      vehicles,
      options: { ...opts, unloadingMinutes: opts.unloadingMinutes + 15 },
      onProgress: (p) => reportProgress(4, '生成：时间充裕方案', 80 + p.percent * 0.1, p.message),
    });
    schemes.push({
      id: 'time_safe',
      name: '服务保障模式',
      tag: '推荐',
      description: '增加卸货和排队等待冗余时间，大幅降低迟到风险。',
      trips: safeOutput.trips,
      summary: generateSummary(safeOutput.trips, ordersWithConstraints, invalidOrders),
      score: 92
    });

    // 默认展示第一个方案
    const defaultScheme = schemes[0];

    reportProgress(5, '生成报告', 100, '多套方案排线完成！');

    return {
      taskId,
      status: 'completed',
      schemes,
      trips: defaultScheme.trips,
      summary: defaultScheme.summary,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      taskId,
      status: 'failed',
      schemes: [],
      trips: [],
      summary: createEmptySummary(),
      createdAt: new Date().toISOString(),
      error: (error as Error).message,
    };
  }
}

/**
 * 解析时间字符串为分钟
 */
function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

/**
 * 格式化分钟为时间字符串
 */
function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = Math.round(minutes % 60);
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * 生成调度汇总
 */
function generateSummary(
  trips: Trip[],
  allOrders: Order[],
  invalidOrders: Order[]
): ScheduleSummary {
  const vehicleBreakdown: Record<string, number> = {};
  for (const trip of trips) {
    vehicleBreakdown[trip.vehicleType] = (vehicleBreakdown[trip.vehicleType] || 0) + 1;
  }

  const totalCost = trips.reduce((sum, t) => sum + t.estimatedCost, 0);
  const totalDistance = trips.reduce((sum, t) => sum + t.totalDistance, 0);
  const totalDuration = trips.reduce((sum, t) => sum + t.totalDuration, 0);

  const riskOrders = trips
    .flatMap(t => t.stops.filter(s => !s.isOnTime).map(s => s.order.orderId));

  const costBreakdown = trips.reduce((acc, t) => {
    if (t.costBreakdown) {
      acc.fuel += t.costBreakdown.fuel;
      acc.toll += t.costBreakdown.toll;
      acc.labor += t.costBreakdown.labor;
      acc.dropCharges += t.costBreakdown.dropCharges;
      acc.returnEmpty += t.costBreakdown.returnEmpty;
      acc.other += t.costBreakdown.other;
    } else {
      // 兼容性逻辑
      acc.fuel += t.estimatedCost * 0.4;
      acc.toll += t.estimatedCost * 0.3;
      acc.labor += t.estimatedCost * 0.3;
    }
    return acc;
  }, { fuel: 0, toll: 0, labor: 0, dropCharges: 0, returnEmpty: 0, other: 0 });

  return {
    totalOrders: allOrders.length,
    totalTrips: trips.length,
    totalDistance: Math.round(totalDistance),
    totalDuration: Math.round(totalDuration * 10) / 10,
    totalCost: Math.round(totalCost),
    costBreakdown: {
      fuel: Math.round(costBreakdown.fuel),
      toll: Math.round(costBreakdown.toll),
      labor: Math.round(costBreakdown.labor),
      dropCharges: Math.round(costBreakdown.dropCharges),
      returnEmpty: Math.round(costBreakdown.returnEmpty),
      other: Math.round(costBreakdown.other),
    },
    avgLoadRateWeight: trips.length > 0
      ? trips.reduce((sum, t) => sum + t.loadRateWeight, 0) / trips.length
      : 0,
    avgLoadRatePallet: trips.length > 0
      ? trips.reduce((sum, t) => sum + t.loadRatePallet, 0) / trips.length
      : 0,
    vehicleBreakdown,
    riskOrders,
    invalidOrders: invalidOrders.map(o => o.orderId),
    constraintsSummary: {
      flyingWingRequired: allOrders.filter(o => o.constraints.requiredVehicleType === '飞翼').length,
      weekendExcluded: allOrders.filter(o => o.constraints.excludeSunday || o.constraints.excludeSaturday).length,
      noStackOrders: allOrders.filter(o => o.constraints.noStack).length,
      mustBeLastOrders: allOrders.filter(o => o.constraints.mustBeLast).length,
      singleTripOrders: allOrders.filter(o => o.constraints.singleTripOnly).length,
    },
  };
}

/**
 * 创建空汇总
 */
function createEmptySummary(): ScheduleSummary {
  return {
    totalOrders: 0,
    totalTrips: 0,
    totalDistance: 0,
    totalDuration: 0,
    totalCost: 0,
    costBreakdown: { fuel: 0, toll: 0, labor: 0, dropCharges: 0, returnEmpty: 0, other: 0 },
    avgLoadRateWeight: 0,
    avgLoadRatePallet: 0,
    vehicleBreakdown: {},
    riskOrders: [],
    invalidOrders: [],
    constraintsSummary: {
      flyingWingRequired: 0,
      weekendExcluded: 0,
      noStackOrders: 0,
      mustBeLastOrders: 0,
      singleTripOrders: 0,
    },
  };
}

export { clusterOrders } from './clustering';
export { optimizeRoute } from './routing';
export { packTrips } from './binPacking';
export { selectVehicle } from './vehicleSelection';


