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
      v => v.category === trip.requiredVehicleType
    );
  }

  // 过滤满足容量要求的车型
  const suitableVehicles = availableVehicles.filter(
    v => v.maxWeightKg >= trip.totalWeightKg && v.palletSlots >= trip.totalPalletSlots
  );

  if (suitableVehicles.length === 0) {
    // 没有合适的车型，选择最大的
    const maxVehicle = availableVehicles.reduce(
      (max, v) => (v.maxWeightKg > max.maxWeightKg ? v : max),
      availableVehicles[0] || vehicles[0]
    );

    const cost = calculateCost(maxVehicle, distance, costMode);
    return {
      vehicle: maxVehicle,
      cost: cost.total,
      costBreakdown: cost,
      loadRateWeight: Math.min(trip.totalWeightKg / maxVehicle.maxWeightKg, 1),
      loadRatePallet: Math.min(trip.totalPalletSlots / maxVehicle.palletSlots, 1),
      reason: '容量不足，使用最大可用车型',
    };
  }

  // 计算每个车型的成本，选择成本最低的
  const results = suitableVehicles.map(vehicle => {
    const cost = calculateCost(vehicle, distance, costMode);
    return {
      vehicle,
      cost: cost.total,
      costBreakdown: cost,
      loadRateWeight: trip.totalWeightKg / vehicle.maxWeightKg,
      loadRatePallet: trip.totalPalletSlots / vehicle.palletSlots,
    };
  });

  // 按成本排序
  results.sort((a, b) => a.cost - b.cost);

  const best = results[0];
  return {
    ...best,
    reason: `${best.vehicle.name} 成本最优`,
  };
}

/**
 * 计算运输成本
 */
export function calculateCost(
  vehicle: VehicleConfig,
  distance: number,
  mode: CostMode
): CostBreakdown {
  let total = 0;
  let fuel = 0;
  let toll = 0;
  let labor = 0;

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
      const fixedCost = vehicle.fixedPrice || 0;
      const mileageCost = vehicle.basePrice + distance * vehicle.pricePerKm;
      total = Math.max(fixedCost, mileageCost);
      fuel = total * 0.4;
      toll = total * 0.3;
      labor = total * 0.3;
      break;
  }

  // 市场参考价
  const marketReference = getMarketReference(distance, vehicle.maxWeightKg);

  return {
    total: Math.round(total),
    fuel: Math.round(fuel),
    toll: Math.round(toll),
    labor: Math.round(labor),
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

/**
 * 批量选择车型
 */
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


