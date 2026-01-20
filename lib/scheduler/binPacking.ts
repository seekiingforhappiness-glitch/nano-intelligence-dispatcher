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

  // 获取允许所有车型的最大载重（用于 null 分组）
  const globalMaxCap = vehicles.reduce((acc, v) => ({
    weight: Math.max(acc.weight, v.maxWeightKg),
    pallets: Math.max(acc.pallets, v.palletSlots),
    volume: Math.max(acc.volume, v.maxVolumeM3 || Infinity)
  }), { weight: 0, pallets: 0, volume: 0 });

  // 按车型要求分组普通订单（包含 singleTripOnly 订单的基础处理）
  const ordersByVehicleType = groupByVehicleType(orders);

  // 对每组进行装箱
  for (const [vehicleType, typeOrders] of Object.entries(ordersByVehicleType)) {
    const vType = vehicleType === 'null' ? null : vehicleType;

    // 计算该组对应的最大容量限制
    let groupMaxCap = globalMaxCap;
    if (vType) {
      const typeVehicles = vehicles.filter(v => v.enabled && v.category === vType);
      if (typeVehicles.length > 0) {
        groupMaxCap = typeVehicles.reduce((acc, v) => ({
          weight: Math.max(acc.weight, v.maxWeightKg),
          pallets: Math.max(acc.pallets, v.palletSlots),
          volume: Math.max(acc.volume, v.maxVolumeM3 || Infinity)
        }), { weight: 0, pallets: 0, volume: 0 });
      }
    }

    // 在本组内执行自动拆分
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

    // 分离必须单独成车的订单
    const singleOnly = processedTypeOrders.filter(o => o.constraints.singleTripOnly);
    const normalOrders = processedTypeOrders.filter(o => !o.constraints.singleTripOnly);

    // 处理单独成车的订单
    for (const order of singleOnly) {
      trips.push({
        orders: [order],
        totalWeightKg: order.weightKg,
        totalVolumeM3: order.volumeM3 || 0,
        totalPalletSlots: order.effectivePalletSlots,
        requiredVehicleType: vType,
      });
    }

    // 进行常规装箱
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
 * 将订单装箱到车次
 */
async function packOrdersIntoTrips(
  orders: Order[],
  maxStops: number,
  vehicles: VehicleConfig[],
  requiredVehicleType: string | null,
  depotCoord: { lng: number; lat: number },
  options: ScheduleOptions
): Promise<TempTrip[]> {
  const trips: TempTrip[] = [];

  // 获取最大车型容量作为参考
  const availableVehicles = requiredVehicleType
    ? vehicles.filter(v => v.enabled && v.category === requiredVehicleType)
    : vehicles.filter(v => v.enabled);

  if (availableVehicles.length === 0) {
    // 没有可用车型，每单独立成车
    return orders.map(order => ({
      orders: [order],
      totalWeightKg: order.weightKg,
      totalVolumeM3: order.volumeM3 || 0,
      totalPalletSlots: order.effectivePalletSlots,
      requiredVehicleType,
    }));
  }

  const maxVehicle = availableVehicles.reduce(
    (max, v) => (v.maxWeightKg > max.maxWeightKg ? v : max),
    availableVehicles[0]
  );

  // 按时间窗结束时间排序（紧急的先处理）
  const sortedOrders = [...orders].sort((a, b) => {
    const aEnd = a.constraints.timeWindow?.end || '23:59';
    const bEnd = b.constraints.timeWindow?.end || '23:59';
    return aEnd.localeCompare(bEnd);
  });

  // 分离 mustBeLast 订单
  const mustBeLast = sortedOrders.filter(o => o.constraints.mustBeLast);
  const mustBeFirst = sortedOrders.filter(o => o.constraints.mustBeFirst);
  const normal = sortedOrders.filter(
    o => !o.constraints.mustBeLast && !o.constraints.mustBeFirst
  );

  // 贪心装箱
  let currentTrip: TempTrip = {
    orders: [],
    totalWeightKg: 0,
    totalVolumeM3: 0,
    totalPalletSlots: 0,
    requiredVehicleType,
  };

  // 添加 mustBeFirst 订单到车次开头
  const firstPool = [...mustBeFirst];
  const lastPool = [...mustBeLast];
  const normalPool = [...normal];

  while (firstPool.length > 0 || normalPool.length > 0 || lastPool.length > 0) {
    // 检查是否需要新车次
    const needNewTrip =
      currentTrip.orders.length >= maxStops - (lastPool.length > 0 ? 1 : 0) ||
      currentTrip.totalWeightKg >= maxVehicle.maxWeightKg * 0.95 ||
      currentTrip.totalPalletSlots >= maxVehicle.palletSlots;

    if (needNewTrip && currentTrip.orders.length > 0) {
      // 在结束前添加一个 mustBeLast（如果有）
      if (lastPool.length > 0) {
        const lastOrder = lastPool.shift()!;
        currentTrip.orders.push(lastOrder);
        currentTrip.totalWeightKg += lastOrder.weightKg;
        currentTrip.totalVolumeM3 += lastOrder.volumeM3 || 0;
        currentTrip.totalPalletSlots += lastOrder.effectivePalletSlots;
      }
      trips.push(currentTrip);
      currentTrip = {
        orders: [],
        totalWeightKg: 0,
        totalVolumeM3: 0,
        totalPalletSlots: 0,
        requiredVehicleType,
      };
    }

    // 优先添加 mustBeFirst
    if (firstPool.length > 0 && currentTrip.orders.length === 0) {
      const firstOrder = firstPool.shift()!;
      if (await canAddOrder(currentTrip, firstOrder, maxVehicle, maxStops, depotCoord, options)) {
        currentTrip.orders.push(firstOrder);
        currentTrip.totalWeightKg += firstOrder.weightKg;
        currentTrip.totalVolumeM3 += firstOrder.volumeM3 || 0;
        currentTrip.totalPalletSlots += firstOrder.effectivePalletSlots;
      } else {
        // 无法添加，单独成车
        trips.push({
          orders: [firstOrder],
          totalWeightKg: firstOrder.weightKg,
          totalVolumeM3: firstOrder.volumeM3 || 0,
          totalPalletSlots: firstOrder.effectivePalletSlots,
          requiredVehicleType,
        });
      }
      continue;
    }

    // 添加普通订单
    if (normalPool.length > 0) {
      const order = normalPool.shift()!;
      if (await canAddOrder(currentTrip, order, maxVehicle, maxStops - 1, depotCoord, options)) {
        currentTrip.orders.push(order);
        currentTrip.totalWeightKg += order.weightKg;
        currentTrip.totalVolumeM3 += order.volumeM3 || 0;
        currentTrip.totalPalletSlots += order.effectivePalletSlots;
      } else {
        // 当前车次已满，开始新车次
        if (currentTrip.orders.length > 0) {
          // 添加 mustBeLast
          if (lastPool.length > 0) {
            const lastOrder = lastPool.shift()!;
            currentTrip.orders.push(lastOrder);
            currentTrip.totalWeightKg += lastOrder.weightKg;
            currentTrip.totalVolumeM3 += lastOrder.volumeM3 || 0;
            currentTrip.totalPalletSlots += lastOrder.effectivePalletSlots;
          }
          trips.push(currentTrip);
        }
        currentTrip = {
          orders: [order],
          totalWeightKg: order.weightKg,
          totalVolumeM3: order.volumeM3 || 0,
          totalPalletSlots: order.effectivePalletSlots,
          requiredVehicleType,
        };
      }
      continue;
    }

    // 只剩 mustBeLast
    if (lastPool.length > 0) {
      const lastOrder = lastPool.shift()!;
      if (await canAddOrder(currentTrip, lastOrder, maxVehicle, maxStops, depotCoord, options)) {
        currentTrip.orders.push(lastOrder);
        currentTrip.totalWeightKg += lastOrder.weightKg;
        currentTrip.totalVolumeM3 += lastOrder.volumeM3 || 0;
        currentTrip.totalPalletSlots += lastOrder.effectivePalletSlots;
      } else if (currentTrip.orders.length > 0) {
        trips.push(currentTrip);
        currentTrip = {
          orders: [lastOrder],
          totalWeightKg: lastOrder.weightKg,
          totalVolumeM3: lastOrder.volumeM3 || 0,
          totalPalletSlots: lastOrder.effectivePalletSlots,
          requiredVehicleType,
        };
      }
    }
  }

  // 处理最后一个车次
  if (currentTrip.orders.length > 0) {
    trips.push(currentTrip);
  }

  return trips;
}

/**
 * 检查是否可以添加订单到当前车次
 * 包含：物理载量检查 和 时间窗可行性检查
 */
async function canAddOrder(
  trip: TempTrip,
  order: Order,
  maxVehicle: VehicleConfig,
  maxStops: number,
  depotCoord: { lng: number; lat: number },
  options: ScheduleOptions
): Promise<boolean> {
  // 1. 基础载量检查
  const isPhysicallyPossible = (
    trip.orders.length < maxStops &&
    trip.totalWeightKg + order.weightKg <= maxVehicle.maxWeightKg &&
    (trip.totalVolumeM3 + (order.volumeM3 || 0) <= (maxVehicle.maxVolumeM3 || Infinity)) &&
    trip.totalPalletSlots + order.effectivePalletSlots <= maxVehicle.palletSlots
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
 * 验证订单序列是否在给定的时间窗内可行
 */
async function checkTimeWindowFeasibility(
  orders: Order[],
  depotCoord: { lng: number; lat: number },
  options: ScheduleOptions
): Promise<boolean> {
  if (orders.length === 0) return true;

  // 对测试序列进行路径优化
  const optimized = optimizeRoute(orders, depotCoord);
  const segments = calculateSegmentDistances(optimized, depotCoord);

  const [startH, startM] = options.startTime.split(':').map(Number);
  let currentTime = startH * 60 + (startM || 0);

  for (let i = 0; i < optimized.length; i++) {
    const order = optimized[i];
    const segmentDist = estimateRoadDistance(segments[i] || 0);
    const segmentDur = estimateDuration(segmentDist) * 60; // 分钟

    currentTime += segmentDur;

    // 检查是否超过该订单的时间窗
    if (order.constraints.timeWindow) {
      const [endH, endM] = order.constraints.timeWindow.end.split(':').map(Number);
      const deadline = endH * 60 + (endM || 0);

      if (currentTime > deadline) {
        return false; // 硬约束失败
      }
    }

    // 加上卸货时间
    currentTime += options.unloadingMinutes;
  }

  // 允许在回仓库前超时（通常仓库没有严格回程关闭时间，或由另外的约束处理）
  return true;
}

/**
 * 将超过车辆上限的“巨型订单”拆分为多个子订单
 */
function splitOversizedOrder(order: Order, maxCap: { weight: number, pallets: number, volume: number }): Order[] {
  const parts: Order[] = [];
  let remainingWeight = order.weightKg;
  let remainingPallets = order.effectivePalletSlots;
  let remainingVolume = order.volumeM3 || 0;
  let partIndex = 1;

  while (remainingWeight > 0.01 || remainingPallets > 0.01 || remainingVolume > 0.01) {
    // 计算本次拆分能拿走的最大份额
    const splitWeight = Math.min(remainingWeight, maxCap.weight * 0.98); // 留 2% 余地避免浮点误差
    const splitPallets = Math.min(remainingPallets, maxCap.pallets);
    const splitVolume = remainingVolume > 0 ? Math.min(remainingVolume, maxCap.volume * 0.98) : 0;

    parts.push({
      ...order,
      orderId: `${order.orderId}_part${partIndex}`,
      // 保持原始订单号，但加上后缀
      orderNumber: `${order.orderNumber}-${partIndex}`,
      weightKg: splitWeight,
      effectivePalletSlots: splitPallets,
      volumeM3: splitVolume > 0 ? splitVolume : undefined,
      cleaningWarnings: [...order.cleaningWarnings, `超巨型订单已自动拆分为第 ${partIndex} 部分`],
    });

    remainingWeight -= splitWeight;
    remainingPallets -= splitPallets;
    remainingVolume -= splitVolume;
    partIndex++;

    // 防止极端情况下的死循环
    if (partIndex > 100) break;
  }

  return parts;
}


