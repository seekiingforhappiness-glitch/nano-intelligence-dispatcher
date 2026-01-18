import { v4 as uuidv4 } from 'uuid';
import { Trip, TripStop } from '@/types/schedule';
import { Order } from '@/types/order';
import { CostMode } from '@/types/vehicle';
import { SolverStrategy, SolverInput, SolverOutput } from '@/types/solver';
import { clusterOrders } from '../clustering';
import { packTrips } from '../binPacking';
import { optimizeRoute, calculateTotalDistance, calculateSegmentDistances } from '../routing';
import { selectVehicle } from '../vehicleSelection';
import { haversineDistance, estimateRoadDistance, estimateDuration } from '@/lib/utils/haversine';

/**
 * 贪婪最近邻策略
 * 逻辑：极坐标分组 -> 贪婪装箱 -> 最近邻路径优化 -> 车型择优
 */
export class GreedyNearestNeighborStrategy implements SolverStrategy {
    id = 'greedy';
    name = '贪婪最近邻 (Greedy NN)';
    description = '基于地理方位的快速分组与最近邻路径优化算法，适用于大规模订单的快速排线。';
    suitableFor = '订单量大且分布集中，对实时性要求高的场景。';

    async solve(input: SolverInput): Promise<SolverOutput> {
        const { orders: validOrders, depot: depotCoord, vehicles, options: opts, onProgress } = input;
        const taskId = uuidv4();

        const reportProgress = (stage: number, stageName: string, percent: number, message: string) => {
            onProgress?.({
                taskId,
                stage,
                stageName,
                percent,
                message,
            });
        };

        // 已经过预处理的订单在此处应具备坐标和约束
        const ordersToProcess = validOrders as Order[];

        // ===== 阶段 3: 分组 =====
        reportProgress(3, '区域分组', 55, '正在按区域分组...');
        const clusters = clusterOrders(ordersToProcess, depotCoord);
        reportProgress(3, '区域分组', 60, `已分为 ${clusters.length} 个区域组`);

        // ===== 阶段 4: 装箱与路径优化 =====
        reportProgress(4, '排线优化', 65, '正在生成车次...');
        const allTrips: Trip[] = [];
        let tripIndex = 1;

        for (const cluster of clusters) {
            // 装箱
            const tempTrips = packTrips(cluster.orders, opts.maxStops, vehicles);

            for (const tempTrip of tempTrips) {
                // 路径优化
                const optimizedOrders = optimizeRoute(tempTrip.orders, depotCoord);

                // 计算距离
                const totalDistance = estimateRoadDistance(
                    calculateTotalDistance(optimizedOrders, depotCoord)
                );
                const segmentDistances = calculateSegmentDistances(optimizedOrders, depotCoord);

                // 选择车型
                const vehicleResult = selectVehicle(
                    tempTrip,
                    vehicles,
                    totalDistance,
                    opts.costMode as CostMode
                );

                // 生成停靠点
                const stops: TripStop[] = [];
                let cumulativeDistance = 0;
                let cumulativeDuration = 0;
                const [startHour, startMin] = opts.startTime.split(':').map(Number);
                let currentTime = startHour * 60 + (startMin || 0); // 分钟

                for (let i = 0; i < optimizedOrders.length; i++) {
                    const order = optimizedOrders[i];
                    const segmentDist = estimateRoadDistance(segmentDistances[i] || 0);
                    const segmentDur = estimateDuration(segmentDist) * 60; // 转分钟

                    cumulativeDistance += segmentDist;
                    cumulativeDuration += segmentDur;
                    currentTime += segmentDur;

                    // 检查时间窗
                    const deadlineMin = parseTime(opts.deadline);
                    const isOnTime = currentTime <= deadlineMin;
                    const timeWindow = order.constraints.timeWindow;
                    let delayMinutes: number | undefined;

                    if (timeWindow) {
                        const windowEnd = parseTime(timeWindow.end);
                        if (currentTime > windowEnd) {
                            delayMinutes = currentTime - windowEnd;
                        }
                    }

                    stops.push({
                        sequence: i + 1,
                        order,
                        eta: formatTime(currentTime),
                        etd: formatTime(currentTime + opts.unloadingMinutes),
                        distanceFromPrev: segmentDist,
                        durationFromPrev: segmentDur / 60, // 转小时
                        cumulativeDistance,
                        cumulativeDuration: cumulativeDuration / 60,
                        isOnTime: isOnTime && !delayMinutes,
                        delayMinutes,
                    });

                    currentTime += opts.unloadingMinutes; // 卸货时间
                }

                // 计算返回时间
                const lastOrder = optimizedOrders[optimizedOrders.length - 1];
                const returnDistance = lastOrder?.coordinates
                    ? estimateRoadDistance(haversineDistance(
                        lastOrder.coordinates.lat, lastOrder.coordinates.lng,
                        depotCoord.lat, depotCoord.lng
                    ))
                    : 0;
                const returnDuration = estimateDuration(returnDistance) * 60;
                currentTime += returnDuration;

                const trip: Trip = {
                    tripId: `T${String(tripIndex++).padStart(3, '0')}`,
                    vehicleType: vehicleResult.vehicle.name,
                    stops,
                    departureTime: opts.startTime,
                    returnTime: formatTime(currentTime),
                    totalDistance: cumulativeDistance + returnDistance,
                    totalDuration: (cumulativeDuration + returnDuration) / 60,
                    totalWeightKg: tempTrip.totalWeightKg,
                    totalPalletSlots: tempTrip.totalPalletSlots,
                    loadRateWeight: vehicleResult.loadRateWeight,
                    loadRatePallet: vehicleResult.loadRatePallet,
                    estimatedCost: vehicleResult.cost,
                    costBreakdown: vehicleResult.costBreakdown,
                    isValid: stops.every(s => s.isOnTime),
                    hasRisk: stops.some(s => !s.isOnTime),
                    riskStops: stops.filter(s => !s.isOnTime).map(s => s.sequence),
                    reason: vehicleResult.reason,
                };

                allTrips.push(trip);
            }

            const progress = 65 + Math.round((clusters.indexOf(cluster) / clusters.length) * 25);
            reportProgress(4, '排线优化', progress, `已处理 ${clusters.indexOf(cluster) + 1}/${clusters.length} 个区域`);
        }

        // 汇总逻辑将由 index.ts 统一处理，此处返回基础结果
        return {
            trips: allTrips,
            summary: {} as any, // 占位，由外层 generateSummary 生成
            invalidOrders: [], // 占位
        };
    }
}

/**
 * 解析时间字符串为分钟
 */
function parseTime(timeStr: string): number {
    if (!timeStr) return 0;
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
