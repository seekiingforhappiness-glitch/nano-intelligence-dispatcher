import { Order } from '@/types/order';
import { VehicleConfig } from '@/types/vehicle';
import { ScheduleOptions } from '@/types/schedule';
import { optimizeRoute, calculateSegmentDistances } from './routing';
import { estimateRoadDistance, estimateDuration } from '@/lib/utils/haversine';

/**
 * 临时车次结构（装箱阶段）
 */
export interface TempTrip {
  orders: Order[];
  totalWeightKg: number;
  totalVolumeM3: number;
  totalPalletSlots: number;
  requiredVehicleType: string | null;
}

/**
 * 贪心地将订单分配到车次中
 * 考虑约束：载重、托盘位、串点数、车型要求、以及硬性的时间窗要求
 */
export async function packTrips(
  orders: Order[],
  maxStops: number,
  vehicles: VehicleConfig[],
  depotCoord: { lng: number; lat: number },
  options: ScheduleOptions
): Promise<TempTrip[]> {
  const trips: TempTrip[] = [];

  // 获取允许所有车型的最大载重（兜底用）
  const globalMaxCap = vehicles.reduce((acc, v) => ({
    weight: Math.max(acc.weight, v.maxWeightKg),
    pallets: Math.max(acc.pallets, v.palletSlots),
    volume: Math.max(acc.volume, v.maxVolumeM3 || Infinity)
  }), { weight: 0, pallets: 0, volume: 0 });

  // 按车型要求分组
  const ordersByVehicleType = groupByVehicleType(orders);

  for (const [vehicleType, typeOrders] of Object.entries(ordersByVehicleType)) {
    const vType = vehicleType === 'null' ? null : vehicleType;

    // 精确寻找该组车型要求的载重上限
    let groupMaxCap = globalMaxCap;
    if (vType) {
      // 尝试匹配 category 或 name (用户可能在 Excel 里写的是 3.8米 而不是 厢式)
      const typeVehicles = vehicles.filter(v => v.enabled && (v.category === vType || v.name === vType));
      if (typeVehicles.length > 0) {
        groupMaxCap = typeVehicles.reduce((acc, v) => ({
          weight: Math.max(acc.weight, v.maxWeightKg),
          pallets: Math.max(acc.pallets, v.palletSlots),
          volume: Math.max(acc.volume, v.maxVolumeM3 || Infinity)
        }), { weight: 0, pallets: 0, volume: 0 });
      }
    }

    // 第一步：拆分超大订单（确保之后每单都能塞进对应的最大车模型）
    const processedTypeOrders: Order[] = [];
    for (const order of typeOrders) {
      if (order.weightKg > groupMaxCap.weight ||
        order.effectivePalletSlots > groupMaxCap.pallets ||
        (order.volumeM3 && order.volumeM3 > groupMaxCap.volume)) {
        const parts = splitOversizedOrder(order, groupMaxCap);
        processedTypeOrders.push(...parts);
      } else {
        processedTypeOrders.push(order);
      }
    }

    // 分离约束订单
    const singleOnly = processedTypeOrders.filter(o => o.constraints.singleTripOnly);
    const normalOrders = processedTypeOrders.filter(o => !o.constraints.singleTripOnly);

    // 处理单独成车
    for (const order of singleOnly) {
      trips.push({
        orders: [order],
        totalWeightKg: order.weightKg,
        totalVolumeM3: order.volumeM3 || 0,
        totalPalletSlots: order.effectivePalletSlots,
        requiredVehicleType: vType,
      });
    }

    // 第二步：执行装箱核心逻辑
    if (normalOrders.length > 0) {
      const packedTrips = await packOrdersIntoTrips(
        normalOrders,
        maxStops,
        vehicles,
        vType,
        depotCoord,
        options
      );
      trips.push(...packedTrips);
    }
  }

  return trips;
}

/**
 * 按车型要求分组
 */
function groupByVehicleType(orders: Order[]): Record<string, Order[]> {
  const groups: Record<string, Order[]> = {};

  for (const order of orders) {
    const key = order.constraints.requiredVehicleType || 'null';
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(order);
  }

  return groups;
}

/**
 * 将订单装箱到车次的核心逻辑（支持 First-Fit 策略与动态调优）
 */
async function packOrdersIntoTrips(
  orders: Order[],
  maxStops: number,
  vehicles: VehicleConfig[],
  requiredVehicleType: string | null,
  depotCoord: { lng: number; lat: number },
  options: ScheduleOptions
): Promise<TempTrip[]> {
  const resultTrips: TempTrip[] = [];
  const tuning = options.tuning;
  const effectiveMaxStops = maxStops + (tuning?.stopCountBias || 0);

  // 获取该组可用的最大车型
  const availableVehicles = requiredVehicleType
    ? vehicles.filter(v => v.enabled && (v.category === requiredVehicleType || v.name === requiredVehicleType))
    : vehicles.filter(v => v.enabled);

  if (availableVehicles.length === 0) {
    return orders.map(o => ({
      orders: [o],
      totalWeightKg: o.weightKg,
      totalVolumeM3: o.volumeM3 || 0,
      totalPalletSlots: o.effectivePalletSlots,
      requiredVehicleType,
    }));
  }

  const maxVehicle = availableVehicles.reduce(
    (max, v) => (v.maxWeightKg > max.maxWeightKg ? v : max),
    availableVehicles[0]
  );

  // 排序：优先处理时间紧和重量大的订单
  const orderPool = [...orders].sort((a, b) => {
    // 1. 时间窗更紧的优先
    const aEnd = a.constraints.timeWindow?.end || '23:59';
    const bEnd = b.constraints.timeWindow?.end || '23:59';
    if (aEnd !== bEnd) return aEnd.localeCompare(bEnd);
    // 2. 载重大的优先（方便装箱）
    return b.weightKg - a.weightKg;
  });

  const mustBeFirst = orderPool.filter(o => o.constraints.mustBeFirst);
  const mustBeLast = orderPool.filter(o => o.constraints.mustBeLast);
  let normalArr = orderPool.filter(o => !o.constraints.mustBeFirst && !o.constraints.mustBeLast);

  // 循环直到池空
  while (mustBeFirst.length > 0 || normalArr.length > 0 || mustBeLast.length > 0) {
    let currentTrip: TempTrip = {
      orders: [],
      totalWeightKg: 0,
      totalVolumeM3: 0,
      totalPalletSlots: 0,
      requiredVehicleType,
    };

    // 1. 先尝试塞入 mustBeFirst
    if (mustBeFirst.length > 0) {
      const order = mustBeFirst[0];
      if (await canAddOrder(currentTrip, order, maxVehicle, effectiveMaxStops, depotCoord, options)) {
        currentTrip.orders.push(order);
        currentTrip.totalWeightKg += order.weightKg;
        currentTrip.totalVolumeM3 += order.volumeM3 || 0;
        currentTrip.totalPalletSlots += order.effectivePalletSlots;
        mustBeFirst.shift();
      }
    }

    // 2. 尝试塞入 normal (First-Fit 策略)
    let i = 0;
    while (i < normalArr.length) {
      const order = normalArr[i];
      const maxNormalStops = mustBeLast.length > 0 ? effectiveMaxStops - 1 : effectiveMaxStops;

      if (await canAddOrder(currentTrip, order, maxVehicle, maxNormalStops, depotCoord, options)) {
        currentTrip.orders.push(order);
        currentTrip.totalWeightKg += order.weightKg;
        currentTrip.totalVolumeM3 += order.volumeM3 || 0;
        currentTrip.totalPalletSlots += order.effectivePalletSlots;
        normalArr.splice(i, 1);
      } else {
        i++;
      }

      const tolerance = 1 + (tuning?.overloadTolerance || 0);
      if (currentTrip.orders.length >= maxNormalStops || currentTrip.totalWeightKg >= maxVehicle.maxWeightKg * tolerance) {
        break;
      }
    }

    // 3. 最后锁定一个 mustBeLast
    if (mustBeLast.length > 0 && currentTrip.orders.length < effectiveMaxStops) {
      for (let j = 0; j < mustBeLast.length; j++) {
        if (await canAddOrder(currentTrip, mustBeLast[j], maxVehicle, effectiveMaxStops, depotCoord, options)) {
          const order = mustBeLast[j];
          currentTrip.orders.push(order);
          currentTrip.totalWeightKg += order.weightKg;
          currentTrip.totalVolumeM3 += order.volumeM3 || 0;
          currentTrip.totalPalletSlots += order.effectivePalletSlots;
          mustBeLast.splice(j, 1);
          break;
        }
      }
    }

    if (currentTrip.orders.length === 0) {
      const pools = [mustBeFirst, normalArr, mustBeLast];
      for (const pool of pools) {
        if (pool.length > 0) {
          const o = pool.shift()!;
          resultTrips.push({
            orders: [o],
            totalWeightKg: o.weightKg,
            totalVolumeM3: o.volumeM3 || 0,
            totalPalletSlots: o.effectivePalletSlots,
            requiredVehicleType,
          });
          break;
        }
      }
    } else {
      resultTrips.push(currentTrip);
    }
  }

  return resultTrips;
}

/**
 * 检查是否可以添加订单到当前车次
 */
async function canAddOrder(
  trip: TempTrip,
  order: Order,
  maxVehicle: VehicleConfig,
  maxStops: number,
  depotCoord: { lng: number; lat: number },
  options: ScheduleOptions
): Promise<boolean> {
  const tolerance = 1 + (options.tuning?.overloadTolerance || 0);

  // 1. 基础载量检查 (支持容忍度)
  const isPhysicallyPossible = (
    trip.orders.length < maxStops &&
    trip.totalWeightKg + order.weightKg <= maxVehicle.maxWeightKg * tolerance &&
    (trip.totalVolumeM3 + (order.volumeM3 || 0) <= (maxVehicle.maxVolumeM3 || Infinity) * tolerance) &&
    trip.totalPalletSlots + order.effectivePalletSlots <= maxVehicle.palletSlots // 托盘通常不能超
  );

  if (!isPhysicallyPossible) return false;

  // 2. 时间窗硬约束检查
  const isTimeFeasible = await checkTimeWindowFeasibility(
    [...trip.orders, order],
    depotCoord,
    options
  );

  return isTimeFeasible;
}

/**
 * 验证订单序列时间窗可行性
 */
async function checkTimeWindowFeasibility(
  orders: Order[],
  depotCoord: { lng: number; lat: number },
  options: ScheduleOptions
): Promise<boolean> {
  if (orders.length === 0) return true;

  const tuning = options.tuning;
  const optimized = optimizeRoute(orders, depotCoord);
  const segments = calculateSegmentDistances(optimized, depotCoord);

  const [startH, startM] = options.startTime.split(':').map(Number);
  let currentTime = startH * 60 + (startM || 0);

  for (let i = 0; i < optimized.length; i++) {
    const order = optimized[i];
    const segmentDist = estimateRoadDistance(segments[i] || 0);
    const segmentDur = estimateDuration(segmentDist) * 60;

    currentTime += segmentDur;

    if (order.constraints.timeWindow) {
      const [endH, endM] = order.constraints.timeWindow.end.split(':').map(Number);
      const deadline = endH * 60 + (endM || 0);

      // 这里的硬性跳出增加一个 timeBuffer 容忍度
      if (currentTime > deadline + (tuning?.timeBuffer || 0)) {
        return false;
      }
    }

    currentTime += options.unloadingMinutes;
  }

  return true;
}

/**
 * 将超过车辆限制的订单拆分
 */
function splitOversizedOrder(order: Order, maxCap: { weight: number, pallets: number, volume: number }): Order[] {
  const parts: Order[] = [];
  let remainingWeight = order.weightKg;
  let remainingPallets = order.effectivePalletSlots;
  let remainingVolume = order.volumeM3 || 0;
  let partIndex = 1;

  while (remainingWeight > 0.01 || remainingPallets > 0.01 || remainingVolume > 0.01) {
    const splitWeight = Math.min(remainingWeight, maxCap.weight * 0.98);
    const splitPallets = Math.min(remainingPallets, maxCap.pallets);
    const splitVolume = remainingVolume > 0 ? Math.min(remainingVolume, maxCap.volume * 0.98) : 0;

    parts.push({
      ...order,
      orderId: `${order.orderId}_part${partIndex}`,
      orderNumber: `${order.orderNumber}-${partIndex}`,
      weightKg: splitWeight,
      effectivePalletSlots: splitPallets,
      volumeM3: splitVolume > 0 ? splitVolume : undefined,
      cleaningWarnings: [...order.cleaningWarnings, `超大订单已自动拆分为第 ${partIndex} 部分`],
    });

    remainingWeight -= splitWeight;
    remainingPallets -= splitPallets;
    remainingVolume -= splitVolume;
    partIndex++;

    if (partIndex > 100) break;
  }

  return parts;
}
