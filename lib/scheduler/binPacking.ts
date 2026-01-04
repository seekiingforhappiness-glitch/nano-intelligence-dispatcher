import { Order } from '@/types/order';
import { VehicleConfig } from '@/types/vehicle';

/**
 * 临时车次结构（装箱阶段）
 */
export interface TempTrip {
  orders: Order[];
  totalWeightKg: number;
  totalPalletSlots: number;
  requiredVehicleType: string | null;
}

/**
 * 贪心装箱算法
 * 考虑约束：最大串点数、车型要求、托盘位、重量
 */
export function packTrips(
  orders: Order[],
  maxStops: number,
  vehicles: VehicleConfig[]
): TempTrip[] {
  const trips: TempTrip[] = [];

  // 先分离必须单独成车的订单
  const singleOnly = orders.filter(o => o.constraints.singleTripOnly);
  const normalOrders = orders.filter(o => !o.constraints.singleTripOnly);

  // 单独成车的订单
  for (const order of singleOnly) {
    trips.push({
      orders: [order],
      totalWeightKg: order.weightKg,
      totalPalletSlots: order.effectivePalletSlots,
      requiredVehicleType: order.constraints.requiredVehicleType,
    });
  }

  // 按车型要求分组普通订单
  const ordersByVehicleType = groupByVehicleType(normalOrders);

  // 对每组进行装箱
  for (const [vehicleType, typeOrders] of Object.entries(ordersByVehicleType)) {
    const packedTrips = packOrdersIntoTrips(
      typeOrders,
      maxStops,
      vehicles,
      vehicleType === 'null' ? null : vehicleType
    );
    trips.push(...packedTrips);
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
function packOrdersIntoTrips(
  orders: Order[],
  maxStops: number,
  vehicles: VehicleConfig[],
  requiredVehicleType: string | null
): TempTrip[] {
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
        currentTrip.totalPalletSlots += lastOrder.effectivePalletSlots;
      }
      trips.push(currentTrip);
      currentTrip = {
        orders: [],
        totalWeightKg: 0,
        totalPalletSlots: 0,
        requiredVehicleType,
      };
    }

    // 优先添加 mustBeFirst
    if (firstPool.length > 0 && currentTrip.orders.length === 0) {
      const firstOrder = firstPool.shift()!;
      if (canAddOrder(currentTrip, firstOrder, maxVehicle, maxStops)) {
        currentTrip.orders.push(firstOrder);
        currentTrip.totalWeightKg += firstOrder.weightKg;
        currentTrip.totalPalletSlots += firstOrder.effectivePalletSlots;
      } else {
        // 无法添加，单独成车
        trips.push({
          orders: [firstOrder],
          totalWeightKg: firstOrder.weightKg,
          totalPalletSlots: firstOrder.effectivePalletSlots,
          requiredVehicleType,
        });
      }
      continue;
    }

    // 添加普通订单
    if (normalPool.length > 0) {
      const order = normalPool.shift()!;
      if (canAddOrder(currentTrip, order, maxVehicle, maxStops - 1)) {
        currentTrip.orders.push(order);
        currentTrip.totalWeightKg += order.weightKg;
        currentTrip.totalPalletSlots += order.effectivePalletSlots;
      } else {
        // 当前车次已满，开始新车次
        if (currentTrip.orders.length > 0) {
          // 添加 mustBeLast
          if (lastPool.length > 0) {
            const lastOrder = lastPool.shift()!;
            currentTrip.orders.push(lastOrder);
            currentTrip.totalWeightKg += lastOrder.weightKg;
            currentTrip.totalPalletSlots += lastOrder.effectivePalletSlots;
          }
          trips.push(currentTrip);
        }
        currentTrip = {
          orders: [order],
          totalWeightKg: order.weightKg,
          totalPalletSlots: order.effectivePalletSlots,
          requiredVehicleType,
        };
      }
      continue;
    }

    // 只剩 mustBeLast
    if (lastPool.length > 0) {
      const lastOrder = lastPool.shift()!;
      if (canAddOrder(currentTrip, lastOrder, maxVehicle, maxStops)) {
        currentTrip.orders.push(lastOrder);
        currentTrip.totalWeightKg += lastOrder.weightKg;
        currentTrip.totalPalletSlots += lastOrder.effectivePalletSlots;
      } else if (currentTrip.orders.length > 0) {
        trips.push(currentTrip);
        currentTrip = {
          orders: [lastOrder],
          totalWeightKg: lastOrder.weightKg,
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
 */
function canAddOrder(
  trip: TempTrip,
  order: Order,
  maxVehicle: VehicleConfig,
  maxStops: number
): boolean {
  return (
    trip.orders.length < maxStops &&
    trip.totalWeightKg + order.weightKg <= maxVehicle.maxWeightKg &&
    trip.totalPalletSlots + order.effectivePalletSlots <= maxVehicle.palletSlots
  );
}


