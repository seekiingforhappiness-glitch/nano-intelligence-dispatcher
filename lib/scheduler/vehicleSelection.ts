import { VehicleConfig, CostBreakdown, CostMode } from '@/types/vehicle';
import { TempTrip } from './binPacking';

/**
 * 车型选择结果
 */
export interface VehicleSelectionResult {
  vehicle: VehicleConfig;
  cost: number;
  costBreakdown: CostBreakdown;
  loadRateWeight: number;
  loadRatePallet: number;
  reason: string;
}

/**
 * 为车次选择最优车型
 * 
 * 🎯 优化目标（按优先级）：
 * 1. 装载率在 90%-110% 区间内（最佳效率区间）
 * 2. 单位成本（元/吨公里）最低
 * 3. 优先使用大车（载重大的车型加分）
 * 
 * 业务逻辑：总成本最优 = 尽可能使用大车装满，而非多辆小车
 */
export function selectVehicle(
  trip: TempTrip,
  vehicles: VehicleConfig[],
  distance: number,
  costMode: CostMode = 'mileage'
): VehicleSelectionResult {
  // 过滤可用车型
  let availableVehicles = vehicles.filter(v => v.enabled);

  // 如果有车型约束，进一步过滤
  if (trip.requiredVehicleType) {
    availableVehicles = availableVehicles.filter(
      v => v.category === trip.requiredVehicleType || v.name === trip.requiredVehicleType
    );
  }

  // 过滤满足容量要求的车型（至少能装下）
  const suitableVehicles = availableVehicles.filter(
    v => v.maxWeightKg >= trip.totalWeightKg && v.palletSlots >= trip.totalPalletSlots
  );

  if (suitableVehicles.length === 0) {
    // 兜底：没有合适的车型，选择最大的
    const maxVehicle = availableVehicles.reduce(
      (max, v) => (v.maxWeightKg > max.maxWeightKg ? v : max),
      availableVehicles[0] || vehicles[0]
    );

    const loadRate = trip.totalWeightKg / maxVehicle.maxWeightKg;
    const cost = calculateCost(maxVehicle, distance, trip.orders.length, costMode);

    if (loadRate > 1.1) {
      console.warn(`⚠️ 车辆选择异常：订单总重 ${trip.totalWeightKg}kg 超过最大车型 ${maxVehicle.name} (${maxVehicle.maxWeightKg}kg) 的 110%，装载率: ${Math.round(loadRate * 100)}%`);
    }

    return {
      vehicle: maxVehicle,
      cost: cost.total,
      costBreakdown: cost,
      loadRateWeight: loadRate,
      loadRatePallet: trip.totalPalletSlots / maxVehicle.palletSlots,
      reason: loadRate > 1.1
        ? `⚠️ 严重超载 (${Math.round(loadRate * 100)}%)，建议拆单或更换车型`
        : '容量紧张，使用最大可用车型',
    };
  }

  // 🎯 核心优化：综合评分选车（使用改进的评分函数）

  // 预计算：获取可用车型中的最大和最小载重（用于相对评分）
  const maxAvailableWeight = Math.max(...suitableVehicles.map(v => v.maxWeightKg));
  const minAvailableWeight = Math.min(...suitableVehicles.map(v => v.maxWeightKg));
  const weightRange = maxAvailableWeight - minAvailableWeight;

  const results = suitableVehicles.map(vehicle => {
    const cost = calculateCost(vehicle, distance, trip.orders.length, costMode);
    const loadRateWeight = trip.totalWeightKg / vehicle.maxWeightKg;
    const loadRatePallet = trip.totalPalletSlots / vehicle.palletSlots;

    // 1. 单位成本（元/吨公里）：越低越好
    const unitCost = trip.totalWeightKg > 0
      ? cost.total / (trip.totalWeightKg / 1000) / Math.max(distance, 1)
      : cost.total / Math.max(distance, 1);

    // 2. 装载率得分（改进版：使用平滑曲线避免悬崖效应）
    // 最佳区间 70%-100%，超载惩罚，低载温和惩罚
    let loadRateScore: number;
    if (loadRateWeight >= 0.7 && loadRateWeight <= 1.0) {
      // 最佳区间：70-100% 得满分
      loadRateScore = 100;
    } else if (loadRateWeight > 1.0 && loadRateWeight <= 1.1) {
      // 轻微超载：100-110% 温和扣分（每1%扣2分）
      loadRateScore = 100 - (loadRateWeight - 1.0) * 200;
    } else if (loadRateWeight > 1.1) {
      // 严重超载：>110% 大幅扣分（每1%扣5分）
      loadRateScore = Math.max(0, 80 - (loadRateWeight - 1.1) * 500);
    } else if (loadRateWeight >= 0.4 && loadRateWeight < 0.7) {
      // 低载：40-70% 温和扣分（使用平方根曲线平滑过渡）
      const deficit = 0.7 - loadRateWeight;
      loadRateScore = 100 - Math.sqrt(deficit) * 100;
    } else {
      // 极低载：<40% 大幅扣分（鼓励换小车）
      loadRateScore = Math.max(0, 50 - (0.4 - loadRateWeight) * 200);
    }

    // 3. 大车偏好得分（改进版：使用对数曲线 + 相对评分）
    // 避免硬编码 40000kg，改为相对于可用车型的最大值
    let sizePreferenceScore: number;
    if (weightRange > 0) {
      // 相对评分：在可用车型范围内，越大越好
      const relativePosition = (vehicle.maxWeightKg - minAvailableWeight) / weightRange;
      sizePreferenceScore = 50 + relativePosition * 50; // 50-100 分
    } else {
      // 只有一种车型可选
      sizePreferenceScore = 75;
    }

    // 额外：使用对数曲线平滑大车和小车的差距
    // log10(3000) ≈ 3.5, log10(40000) ≈ 4.6，范围约 1.1
    const logScore = (Math.log10(vehicle.maxWeightKg) - 3.0) / 2.0 * 100;
    sizePreferenceScore = (sizePreferenceScore + Math.min(100, Math.max(0, logScore))) / 2;

    // 4. 单位成本得分（归一化）
    const maxUnitCost = Math.max(...suitableVehicles.map(v => {
      const c = calculateCost(v, distance, trip.orders.length, costMode);
      return trip.totalWeightKg > 0
        ? c.total / (trip.totalWeightKg / 1000) / Math.max(distance, 1)
        : c.total / Math.max(distance, 1);
    }));
    const unitCostScore = maxUnitCost > 0 ? (1 - unitCost / maxUnitCost) * 100 : 100;

    // 综合得分 = 装载率(45%) + 单位成本(35%) + 大车偏好(20%)
    // 稍微提高单位成本权重，因为成本是最终优化目标
    const totalScore = loadRateScore * 0.45 + unitCostScore * 0.35 + sizePreferenceScore * 0.20;

    return {
      vehicle,
      cost: cost.total,
      costBreakdown: cost,
      loadRateWeight,
      loadRatePallet,
      unitCost,
      totalScore,
      // 调试信息
      _debug: {
        loadRateScore: Math.round(loadRateScore),
        unitCostScore: Math.round(unitCostScore),
        sizePreferenceScore: Math.round(sizePreferenceScore),
      },
    };
  });

  // 按综合得分排序（高分优先）
  results.sort((a, b) => b.totalScore - a.totalScore);

  const best = results[0];
  const loadPct = Math.round(best.loadRateWeight * 100);

  // 🎯 架构优化：主动识别低效方案
  // 如果装载率 < 40% 且使用的不是最小车型（3.8/4.2），标记为低效
  // 3.8米/4.2米已经是最小的了，如果还装不满那是订单本身小，不算低效（或者应走 LTL）
  // 但如果是 9.6米 只装了 30%，那是绝对的浪费，必须重组
  const isSmallTruck = best.vehicle.maxWeightKg <= 4500;
  let reason = `${best.vehicle.name} 综合最优 (装载率${loadPct}%, 单位成本¥${best.unitCost.toFixed(2)}/吨公里)`;

  if (!isSmallTruck && best.loadRateWeight < 0.4) {
    reason = `⚠️ [效率低下] ${reason} - 建议拆分重组`;
  }

  return {
    ...best,
    reason,
  };
}

/**
 * 计算运输成本
 */
export function calculateCost(
  vehicle: VehicleConfig,
  distance: number,
  stopCount: number,
  mode: CostMode
): CostBreakdown {
  let fuel = 0;
  let toll = 0;
  let labor = 0;
  let dropCharges = 0;
  let returnEmpty = 0;
  let total = 0;

  switch (mode) {
    case 'fixed':
      total = vehicle.fixedPrice || vehicle.basePrice;
      fuel = total * 0.4;
      toll = total * 0.3;
      labor = total * 0.3;
      break;

    case 'mileage':
    default:
      fuel = distance * (vehicle.fuelCostPerKm || vehicle.pricePerKm * 0.4);
      toll = distance * (vehicle.tollPerKm || vehicle.pricePerKm * 0.3);
      labor = distance * vehicle.pricePerKm * 0.3;
      total = vehicle.basePrice + distance * vehicle.pricePerKm;
      break;

    case 'weight':
      // 简化的重量计价
      total = vehicle.basePrice + distance * vehicle.pricePerKm;
      fuel = total * 0.4;
      toll = total * 0.3;
      labor = total * 0.3;
      break;

    case 'hybrid':
      const fixedPrice = vehicle.fixedPrice || 0;
      const mileagePrice = vehicle.basePrice + distance * vehicle.pricePerKm;
      total = Math.max(fixedPrice, mileagePrice);
      fuel = total * 0.4;
      toll = total * 0.3;
      labor = total * 0.3;
      break;
  }

  // 计算额外费用
  // 1. 串点费：超过1个点后，每个点收 dropCharge
  if (stopCount > 1 && vehicle.dropCharge) {
    dropCharges = (stopCount - 1) * vehicle.dropCharge;
  }

  // 2. 返程空驶费：如果是长途（>50km），通常有空驶补贴
  if (distance > 50 && vehicle.returnEmptyRate) {
    const mileageSubtotal = distance * vehicle.pricePerKm;
    returnEmpty = mileageSubtotal * vehicle.returnEmptyRate;
  }

  total += dropCharges + returnEmpty;

  // 市场参考价
  const marketReference = getMarketReference(distance, vehicle.maxWeightKg);

  return {
    total: Math.round(total),
    fuel: Math.round(fuel),
    toll: Math.round(toll),
    labor: Math.round(labor),
    dropCharges: Math.round(dropCharges),
    returnEmpty: Math.round(returnEmpty),
    other: 0,
    marketReference,
  };
}

/**
 * 获取市场参考价
 */
function getMarketReference(
  distance: number,
  maxWeight: number
): { min: number; max: number } {
  // 基于距离和车型的经验参考价
  let baseRate: number;

  if (maxWeight <= 4000) {
    baseRate = 3.5;
  } else if (maxWeight <= 10000) {
    baseRate = 4.0;
  } else if (maxWeight <= 20000) {
    baseRate = 5.0;
  } else {
    baseRate = 6.0;
  }

  const base = 200 + distance * baseRate;
  return {
    min: Math.round(base * 0.85),
    max: Math.round(base * 1.15),
  };
}

export function selectVehiclesForTrips(
  trips: TempTrip[],
  vehicles: VehicleConfig[],
  distances: number[],
  costMode: CostMode
): VehicleSelectionResult[] {
  return trips.map((trip, index) =>
    selectVehicle(trip, vehicles, distances[index] || 0, costMode)
  );
}


