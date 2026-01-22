import { Order } from '@/types/order';
import { ScheduleOptions } from '@/types/schedule';
import { calculateAngle, haversineDistance } from '@/lib/utils/haversine';

/**
 * 订单分组（簇）
 */
export interface OrderCluster {
  id: string;
  orders: Order[];
  centerLat: number;
  centerLng: number;
  avgAngle: number;
  avgDistance: number;
}

/**
 * 极坐标扫描法分组
 * 将订单按照相对仓库的角度和距离进行分组
 */
export function clusterOrdersBySweep(
  orders: Order[],
  depotCoord: { lng: number; lat: number },
  maxAngleSpan: number = 60  // 每组最大角度跨度
): OrderCluster[] {
  if (orders.length === 0) return [];

  // 计算每个订单相对仓库的角度和距离
  const ordersWithPolar = orders
    .filter(o => o.coordinates) // 只处理有坐标的订单
    .map(order => ({
      order,
      angle: calculateAngle(
        depotCoord.lat,
        depotCoord.lng,
        order.coordinates!.lat,
        order.coordinates!.lng
      ),
      distance: haversineDistance(
        depotCoord.lat,
        depotCoord.lng,
        order.coordinates!.lat,
        order.coordinates!.lng
      ),
    }))
    .sort((a, b) => a.angle - b.angle);

  if (ordersWithPolar.length === 0) return [];

  // 按角度分组
  const clusters: OrderCluster[] = [];
  let currentCluster: typeof ordersWithPolar = [];
  let clusterStartAngle = ordersWithPolar[0].angle;

  for (const item of ordersWithPolar) {
    // 如果角度跨度超过阈值，开始新组
    if (item.angle - clusterStartAngle > maxAngleSpan && currentCluster.length > 0) {
      clusters.push(createCluster(currentCluster, clusters.length));
      currentCluster = [];
      clusterStartAngle = item.angle;
    }
    currentCluster.push(item);
  }

  // 处理最后一组
  if (currentCluster.length > 0) {
    clusters.push(createCluster(currentCluster, clusters.length));
  }

  return clusters;
}

/**
 * 创建分组对象
 */
function createCluster(
  items: { order: Order; angle: number; distance: number }[],
  index: number
): OrderCluster {
  const orders = items.map(i => i.order);
  const avgAngle = items.reduce((sum, i) => sum + i.angle, 0) / items.length;
  const avgDistance = items.reduce((sum, i) => sum + i.distance, 0) / items.length;

  // 计算中心点
  const centerLat = orders.reduce((sum, o) => sum + (o.coordinates?.lat || 0), 0) / orders.length;
  const centerLng = orders.reduce((sum, o) => sum + (o.coordinates?.lng || 0), 0) / orders.length;

  return {
    id: `C${String(index + 1).padStart(2, '0')}`,
    orders,
    centerLat,
    centerLng,
    avgAngle,
    avgDistance,
  };
}

/**
 * 按距离远近分组
 */
export function clusterOrdersByDistance(
  orders: Order[],
  depotCoord: { lng: number; lat: number },
  distanceThresholds: number[] = [30, 80, 150]  // 公里
): OrderCluster[] {
  const ordersWithDistance = orders
    .filter(o => o.coordinates)
    .map(order => ({
      order,
      distance: haversineDistance(
        depotCoord.lat,
        depotCoord.lng,
        order.coordinates!.lat,
        order.coordinates!.lng
      ),
    }));

  const clusters: OrderCluster[] = [];

  // 近距离（0-30km）
  const near = ordersWithDistance.filter(o => o.distance <= distanceThresholds[0]);
  if (near.length > 0) {
    clusters.push({
      id: 'NEAR',
      orders: near.map(o => o.order),
      centerLat: 0,
      centerLng: 0,
      avgAngle: 0,
      avgDistance: near.reduce((sum, o) => sum + o.distance, 0) / near.length,
    });
  }

  // 中距离（30-80km）
  const mid = ordersWithDistance.filter(
    o => o.distance > distanceThresholds[0] && o.distance <= distanceThresholds[1]
  );
  if (mid.length > 0) {
    clusters.push({
      id: 'MID',
      orders: mid.map(o => o.order),
      centerLat: 0,
      centerLng: 0,
      avgAngle: 0,
      avgDistance: mid.reduce((sum, o) => sum + o.distance, 0) / mid.length,
    });
  }

  // 远距离（80-150km）
  const far = ordersWithDistance.filter(
    o => o.distance > distanceThresholds[1] && o.distance <= distanceThresholds[2]
  );
  if (far.length > 0) {
    clusters.push({
      id: 'FAR',
      orders: far.map(o => o.order),
      centerLat: 0,
      centerLng: 0,
      avgAngle: 0,
      avgDistance: far.reduce((sum, o) => sum + o.distance, 0) / far.length,
    });
  }

  // 超远距离（>150km）
  const veryFar = ordersWithDistance.filter(o => o.distance > distanceThresholds[2]);
  if (veryFar.length > 0) {
    clusters.push({
      id: 'VERY_FAR',
      orders: veryFar.map(o => o.order),
      centerLat: 0,
      centerLng: 0,
      avgAngle: 0,
      avgDistance: veryFar.reduce((sum, o) => sum + o.distance, 0) / veryFar.length,
    });
  }

  return clusters;
}

/**
 * 综合分组策略：先按方向，再按距离
 */
export function clusterOrders(
  orders: Order[],
  depotCoord: { lng: number; lat: number },
  options?: ScheduleOptions
): OrderCluster[] {
  const tuning = options?.tuning;
  // 🎯 架构联动：根据 clusterBias 动态调整分组广度
  // clusterBias 默认为 0，范围通常在 0-1 之间
  const dynamicSpan = 90 + (tuning?.clusterBias || 0) * 180;

  // 使用极坐标扫描法，动态扩大跨度以利于干线/大车拼单
  return clusterOrdersBySweep(orders, depotCoord, Math.min(360, dynamicSpan));
}


