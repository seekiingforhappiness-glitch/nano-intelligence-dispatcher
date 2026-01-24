import { Order } from '@/types/order';
import { haversineDistance } from '@/lib/utils/haversine';

/**
 * 2-opt 路径优化配置
 */
interface TwoOptConfig {
  maxIterations?: number;  // 最大迭代次数，防止无限循环
  improvementThreshold?: number;  // 最小改进阈值（km）
}

const DEFAULT_TWO_OPT_CONFIG: TwoOptConfig = {
  maxIterations: 100,
  improvementThreshold: 0.1,  // 0.1km = 100米
};

/**
 * 最近邻算法 + 2-opt 优化路径顺序
 * 考虑 mustBeFirst 和 mustBeLast 约束
 */
export function optimizeRoute(
  orders: Order[],
  depotCoord: { lng: number; lat: number },
  config?: TwoOptConfig
): Order[] {
  if (orders.length <= 1) return orders;

  // 分离有特殊约束的订单
  const mustBeFirst = orders.filter(o => o.constraints.mustBeFirst);
  const mustBeLast = orders.filter(o => o.constraints.mustBeLast);
  const normalOrders = orders.filter(
    o => !o.constraints.mustBeFirst && !o.constraints.mustBeLast
  );

  // 对普通订单使用最近邻算法获得初始解
  let optimizedNormal = nearestNeighbor(normalOrders, depotCoord);

  // 对普通订单应用 2-opt 优化
  if (optimizedNormal.length > 2) {
    optimizedNormal = twoOptImprove(optimizedNormal, depotCoord, config);
  }

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
 * 2-opt 路径改进算法
 *
 * 核心思想：遍历所有可能的边对，尝试交换（反转子路径），
 * 如果交换后总距离更短，则保留改进。
 *
 * @param orders 待优化的订单序列
 * @param depotCoord 仓库坐标（起点和终点）
 * @param config 优化配置
 * @returns 优化后的订单序列
 */
export function twoOptImprove(
  orders: Order[],
  depotCoord: { lng: number; lat: number },
  config?: TwoOptConfig
): Order[] {
  const cfg = { ...DEFAULT_TWO_OPT_CONFIG, ...config };
  const n = orders.length;

  if (n <= 2) return [...orders];

  // 创建工作副本
  let route = [...orders];
  let improved = true;
  let iteration = 0;

  while (improved && iteration < cfg.maxIterations!) {
    improved = false;
    iteration++;

    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 2; j < n; j++) {
        // 计算当前边的总距离
        // 边 1: route[i-1] -> route[i]（或 depot -> route[i] 当 i=0）
        // 边 2: route[j] -> route[j+1]（或 route[j] -> depot 当 j=n-1）
        const currentDistance = calculateEdgesCost(route, i, j, depotCoord);

        // 尝试反转 route[i..j] 段
        const newRoute = twoOptSwap(route, i, j);
        const newDistance = calculateEdgesCost(newRoute, i, j, depotCoord);

        // 如果改进超过阈值，接受新路径
        if (currentDistance - newDistance > cfg.improvementThreshold!) {
          route = newRoute;
          improved = true;
        }
      }
    }
  }

  return route;
}

/**
 * 计算 2-opt 交换涉及的边的成本
 */
function calculateEdgesCost(
  route: Order[],
  i: number,
  j: number,
  depotCoord: { lng: number; lat: number }
): number {
  const n = route.length;
  let cost = 0;

  // 边 1: 前一个点 -> route[i]
  const prevPoint = i === 0 ? depotCoord : route[i - 1].coordinates || depotCoord;
  const pointI = route[i].coordinates || depotCoord;
  cost += haversineDistance(prevPoint.lat, prevPoint.lng, pointI.lat, pointI.lng);

  // 边 2: route[j] -> 下一个点
  const pointJ = route[j].coordinates || depotCoord;
  const nextPoint = j === n - 1 ? depotCoord : route[j + 1].coordinates || depotCoord;
  cost += haversineDistance(pointJ.lat, pointJ.lng, nextPoint.lat, nextPoint.lng);

  return cost;
}

/**
 * 执行 2-opt 交换：反转 route[i..j] 段
 */
function twoOptSwap(route: Order[], i: number, j: number): Order[] {
  // 创建新路径: route[0..i-1] + reverse(route[i..j]) + route[j+1..n-1]
  const newRoute: Order[] = [];

  // 添加 0 到 i-1
  for (let k = 0; k < i; k++) {
    newRoute.push(route[k]);
  }

  // 添加反转的 i 到 j
  for (let k = j; k >= i; k--) {
    newRoute.push(route[k]);
  }

  // 添加 j+1 到末尾
  for (let k = j + 1; k < route.length; k++) {
    newRoute.push(route[k]);
  }

  return newRoute;
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

/**
 * 比较优化前后的距离改进
 * 用于调试和验证
 */
export function measureOptimizationImprovement(
  orders: Order[],
  depotCoord: { lng: number; lat: number }
): { before: number; after: number; improvement: number; improvementPercent: number } {
  // 仅使用最近邻的结果
  const nnOnly = nearestNeighbor([...orders], depotCoord);
  const before = calculateTotalDistance(nnOnly, depotCoord);

  // 使用最近邻 + 2-opt
  const optimized = optimizeRoute([...orders], depotCoord);
  const after = calculateTotalDistance(optimized, depotCoord);

  const improvement = before - after;
  const improvementPercent = before > 0 ? (improvement / before) * 100 : 0;

  return {
    before: Math.round(before * 10) / 10,
    after: Math.round(after * 10) / 10,
    improvement: Math.round(improvement * 10) / 10,
    improvementPercent: Math.round(improvementPercent * 10) / 10,
  };
}
