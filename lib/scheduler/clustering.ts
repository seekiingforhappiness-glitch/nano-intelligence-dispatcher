import { Order } from '@/types/order';
import { ScheduleOptions, ClusteringConfig, CLUSTERING_PRESETS } from '@/types/schedule';
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
 * 获取聚类配置（合并预设和自定义配置）
 */
function resolveClusteringConfig(config?: ClusteringConfig): Required<Omit<ClusteringConfig, 'preset'>> {
  const preset = config?.preset || 'suburban';
  const presetConfig = CLUSTERING_PRESETS[preset];

  return {
    distanceThresholds: config?.distanceThresholds || presetConfig.distanceThresholds,
    maxAngleSpan: config?.maxAngleSpan || presetConfig.maxAngleSpan,
  };
}

/**
 * 极坐标扫描法分组
 * 将订单按照相对仓库的角度和距离进行分组
 *
 * @param orders 订单列表
 * @param depotCoord 仓库坐标
 * @param maxAngleSpan 每组最大角度跨度（可配置）
 */
export function clusterOrdersBySweep(
  orders: Order[],
  depotCoord: { lng: number; lat: number },
  maxAngleSpan: number = 60
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
 * 按距离远近分组（支持可配置阈值）
 *
 * @param orders 订单列表
 * @param depotCoord 仓库坐标
 * @param distanceThresholds 距离分层阈值 [近, 中, 远] (km)
 */
export function clusterOrdersByDistance(
  orders: Order[],
  depotCoord: { lng: number; lat: number },
  distanceThresholds: number[] = [30, 80, 150]
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
  const [nearThreshold, midThreshold, farThreshold] = distanceThresholds;

  // 近距离
  const near = ordersWithDistance.filter(o => o.distance <= nearThreshold);
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

  // 中距离
  const mid = ordersWithDistance.filter(
    o => o.distance > nearThreshold && o.distance <= midThreshold
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

  // 远距离
  const far = ordersWithDistance.filter(
    o => o.distance > midThreshold && o.distance <= farThreshold
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

  // 超远距离
  const veryFar = ordersWithDistance.filter(o => o.distance > farThreshold);
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
 * 支持可配置的聚类参数
 *
 * @param orders 订单列表
 * @param depotCoord 仓库坐标
 * @param options 调度选项（包含聚类配置）
 */
export function clusterOrders(
  orders: Order[],
  depotCoord: { lng: number; lat: number },
  options?: ScheduleOptions
): OrderCluster[] {
  const tuning = options?.tuning;
  const clusterConfig = resolveClusteringConfig(options?.clustering);

  // 根据 clusterBias 动态调整分组广度
  // clusterBias 默认为 0，范围通常在 0-1 之间
  const biasMultiplier = 1 + (tuning?.clusterBias || 0) * 2;
  const dynamicSpan = clusterConfig.maxAngleSpan * biasMultiplier;

  // 使用极坐标扫描法，动态扩大跨度以利于干线/大车拼单
  return clusterOrdersBySweep(orders, depotCoord, Math.min(360, dynamicSpan));
}

/**
 * 混合聚类策略：先按距离分层，再按方向细分
 * 适合大规模订单场景
 */
export function clusterOrdersHybrid(
  orders: Order[],
  depotCoord: { lng: number; lat: number },
  options?: ScheduleOptions
): OrderCluster[] {
  const clusterConfig = resolveClusteringConfig(options?.clustering);

  // 第一步：按距离分层
  const distanceClusters = clusterOrdersByDistance(
    orders,
    depotCoord,
    clusterConfig.distanceThresholds
  );

  // 第二步：对每个距离层再按方向细分
  const result: OrderCluster[] = [];
  let clusterIndex = 0;

  for (const distCluster of distanceClusters) {
    if (distCluster.orders.length <= 3) {
      // 订单数太少，不再细分
      result.push({
        ...distCluster,
        id: `C${String(++clusterIndex).padStart(2, '0')}`,
      });
    } else {
      // 按方向细分
      const subClusters = clusterOrdersBySweep(
        distCluster.orders,
        depotCoord,
        clusterConfig.maxAngleSpan
      );
      for (const sub of subClusters) {
        result.push({
          ...sub,
          id: `${distCluster.id}_${sub.id}`,
        });
      }
    }
  }

  return result;
}

/**
 * 获取聚类统计信息
 */
export function getClusteringStats(clusters: OrderCluster[]): {
  totalClusters: number;
  totalOrders: number;
  avgOrdersPerCluster: number;
  avgClusterDistance: number;
} {
  const totalClusters = clusters.length;
  const totalOrders = clusters.reduce((sum, c) => sum + c.orders.length, 0);
  const avgOrdersPerCluster = totalClusters > 0 ? totalOrders / totalClusters : 0;
  const avgClusterDistance = totalClusters > 0
    ? clusters.reduce((sum, c) => sum + c.avgDistance, 0) / totalClusters
    : 0;

  return {
    totalClusters,
    totalOrders,
    avgOrdersPerCluster: Math.round(avgOrdersPerCluster * 10) / 10,
    avgClusterDistance: Math.round(avgClusterDistance * 10) / 10,
  };
}
