import { Order } from '@/types/order';
import { haversineDistance } from '@/lib/utils/haversine';

/**
 * 最近邻算法优化路径顺序
 * 考虑 mustBeFirst 和 mustBeLast 约束
 */
export function optimizeRoute(
  orders: Order[],
  depotCoord: { lng: number; lat: number }
): Order[] {
  if (orders.length <= 1) return orders;

  // 分离有特殊约束的订单
  const mustBeFirst = orders.filter(o => o.constraints.mustBeFirst);
  const mustBeLast = orders.filter(o => o.constraints.mustBeLast);
  const normalOrders = orders.filter(
    o => !o.constraints.mustBeFirst && !o.constraints.mustBeLast
  );

  // 对普通订单使用最近邻算法
  const optimizedNormal = nearestNeighbor(normalOrders, depotCoord);

  // 组装最终顺序
  const result: Order[] = [];

  // 1. 放入 mustBeFirst（如果有多个，按距离排序）
  if (mustBeFirst.length > 0) {
    const sortedFirst = sortByDistanceFromPoint(mustBeFirst, depotCoord);
    result.push(...sortedFirst);
  }

  // 2. 放入普通订单
  result.push(...optimizedNormal);

  // 3. 放入 mustBeLast（如果有多个，按距离排序，最远的最后）
  if (mustBeLast.length > 0) {
    // 从当前最后一个点开始计算
    const lastPoint = result.length > 0
      ? result[result.length - 1].coordinates || depotCoord
      : depotCoord;
    const sortedLast = sortByDistanceFromPoint(mustBeLast, lastPoint);
    result.push(...sortedLast);
  }

  return result;
}

/**
 * 最近邻算法
 */
function nearestNeighbor(
  orders: Order[],
  startPoint: { lng: number; lat: number }
): Order[] {
  if (orders.length === 0) return [];

  const result: Order[] = [];
  const remaining = [...orders];
  let currentPoint = startPoint;

  while (remaining.length > 0) {
    // 找到距离当前点最近的订单
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const order = remaining[i];
      if (!order.coordinates) continue;

      const distance = haversineDistance(
        currentPoint.lat,
        currentPoint.lng,
        order.coordinates.lat,
        order.coordinates.lng
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }

    // 移动到最近的订单
    const nearest = remaining.splice(nearestIndex, 1)[0];
    result.push(nearest);
    
    if (nearest.coordinates) {
      currentPoint = nearest.coordinates;
    }
  }

  return result;
}

/**
 * 按距离排序
 */
function sortByDistanceFromPoint(
  orders: Order[],
  point: { lng: number; lat: number }
): Order[] {
  return [...orders].sort((a, b) => {
    const distA = a.coordinates
      ? haversineDistance(point.lat, point.lng, a.coordinates.lat, a.coordinates.lng)
      : Infinity;
    const distB = b.coordinates
      ? haversineDistance(point.lat, point.lng, b.coordinates.lat, b.coordinates.lng)
      : Infinity;
    return distA - distB;
  });
}

/**
 * 计算路径总距离
 */
export function calculateTotalDistance(
  orders: Order[],
  depotCoord: { lng: number; lat: number }
): number {
  if (orders.length === 0) return 0;

  let totalDistance = 0;
  let currentPoint = depotCoord;

  for (const order of orders) {
    if (order.coordinates) {
      totalDistance += haversineDistance(
        currentPoint.lat,
        currentPoint.lng,
        order.coordinates.lat,
        order.coordinates.lng
      );
      currentPoint = order.coordinates;
    }
  }

  // 返回仓库
  totalDistance += haversineDistance(
    currentPoint.lat,
    currentPoint.lng,
    depotCoord.lat,
    depotCoord.lng
  );

  return totalDistance;
}

/**
 * 计算路径各段距离
 */
export function calculateSegmentDistances(
  orders: Order[],
  depotCoord: { lng: number; lat: number }
): number[] {
  if (orders.length === 0) return [];

  const distances: number[] = [];
  let currentPoint = depotCoord;

  for (const order of orders) {
    if (order.coordinates) {
      distances.push(
        haversineDistance(
          currentPoint.lat,
          currentPoint.lng,
          order.coordinates.lat,
          order.coordinates.lng
        )
      );
      currentPoint = order.coordinates;
    } else {
      distances.push(0);
    }
  }

  return distances;
}


