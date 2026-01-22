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

        const ordersToProcess = validOrders as Order[];

        let retryCount = 0;
        const MAX_RETRIES = 2; // 最多重试2次（共3次尝试）
        let currentOptions = { ...opts };
        let finalTrips: Trip[] = [];
        let finalSuggestions: string[] = [];

        while (retryCount <= MAX_RETRIES) {
            const attemptMessage = retryCount > 0 ? ` (第 ${retryCount + 1} 次尝试)` : '';

            // ===== 阶段 3: 分组 =====
            reportProgress(3, '区域分组', 55, `正在按区域分组${attemptMessage}...`);
            const clusters = clusterOrders(ordersToProcess, depotCoord);

            // ===== 阶段 4: 装箱与路径优化 =====
            const allTrips: Trip[] = [];
            let tripIndex = 1;

            for (const cluster of clusters) {
                const tempTrips = await packTrips(cluster.orders, currentOptions.maxStops, vehicles, depotCoord, currentOptions);

                for (const tempTrip of tempTrips) {
                    const optimizedOrders = optimizeRoute(tempTrip.orders, depotCoord);
                    const totalDistance = estimateRoadDistance(calculateTotalDistance(optimizedOrders, depotCoord));
                    const segmentDistances = calculateSegmentDistances(optimizedOrders, depotCoord);

                    const vehicleResult = selectVehicle(tempTrip, vehicles, totalDistance, currentOptions.costMode as CostMode);

                    const stops: TripStop[] = [];
                    let cumulativeDistance = 0;
                    let cumulativeDuration = 0;
                    const [startHour, startMin] = currentOptions.startTime.split(':').map(Number);
                    let currentTime = startHour * 60 + (startMin || 0);

                    for (let i = 0; i < optimizedOrders.length; i++) {
                        const order = optimizedOrders[i];
                        const segmentDist = estimateRoadDistance(segmentDistances[i] || 0);
                        const segmentDur = estimateDuration(segmentDist) * 60;

                        cumulativeDistance += segmentDist;
                        cumulativeDuration += segmentDur;
                        currentTime += segmentDur;

                        const deadlineMin = parseTime(currentOptions.deadline);
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
                            etd: formatTime(currentTime + currentOptions.unloadingMinutes),
                            distanceFromPrev: segmentDist,
                            durationFromPrev: segmentDur / 60,
                            cumulativeDistance,
                            cumulativeDuration: cumulativeDuration / 60,
                            isOnTime: isOnTime && !delayMinutes,
                            delayMinutes,
                        });

                        currentTime += currentOptions.unloadingMinutes;
                    }

                    const lastOrder = optimizedOrders[optimizedOrders.length - 1];
                    const returnDistance = lastOrder?.coordinates
                        ? estimateRoadDistance(haversineDistance(
                            lastOrder.coordinates.lat, lastOrder.coordinates.lng,
                            depotCoord.lat, depotCoord.lng
                        ))
                        : 0;
                    const returnDuration = estimateDuration(returnDistance) * 60;
                    currentTime += returnDuration;

                    allTrips.push({
                        tripId: `T${String(tripIndex++).padStart(3, '0')}`,
                        vehicleType: vehicleResult.vehicle.name,
                        stops,
                        departureTime: currentOptions.startTime,
                        returnTime: formatTime(currentTime),
                        totalDistance: cumulativeDistance + returnDistance,
                        totalDuration: (cumulativeDuration + returnDuration) / 60,
                        totalWeightKg: tempTrip.totalWeightKg,
                        totalPalletSlots: tempTrip.totalPalletSlots,
                        loadRateWeight: vehicleResult.loadRateWeight,
                        loadRatePallet: vehicleResult.loadRatePallet,
                        estimatedCost: vehicleResult.cost,
                        costBreakdown: vehicleResult.costBreakdown,
                        isValid: stops.every(s => s.isOnTime) &&
                            tempTrip.totalWeightKg <= vehicleResult.vehicle.maxWeightKg * 1.1 && // 允许10%容忍
                            tempTrip.totalPalletSlots <= vehicleResult.vehicle.palletSlots,
                        hasRisk: stops.some(s => !s.isOnTime) ||
                            tempTrip.totalWeightKg > vehicleResult.vehicle.maxWeightKg ||
                            tempTrip.totalPalletSlots > vehicleResult.vehicle.palletSlots,
                        riskStops: stops.filter(s => !s.isOnTime).map(s => s.sequence),
                        reason: vehicleResult.reason,
                    });
                }
            }

            // ===== 阶段 5: 审计与自愈 =====
            reportProgress(5, '方案审计', 90, `正在执行方案合规性检查...`);
            const { auditSchedule } = await import('../auditor');
            const auditResult = await auditSchedule(allTrips, depotCoord, currentOptions, vehicles);

            if (auditResult.isValid || retryCount === MAX_RETRIES) {
                finalTrips = allTrips;
                finalSuggestions = auditResult.suggestions;
                break;
            }

            // 针对问题进行调优
            reportProgress(5, '自动改进', 92, `检测到排线缺陷，正在自动优化参数重试...`);
            retryCount++;

            const tuning = currentOptions.tuning || { overloadTolerance: 0.1, stopCountBias: 0, clusterBias: 0, timeBuffer: 0 };

            // 🚨 核心修复：如果是严重超载 (type === 'overload')，强制降低容忍度
            // 这会使 binPacking 更严格地拆分订单
            if (auditResult.issues.some(i => i.type === 'overload')) {
                tuning.overloadTolerance = Math.max(0, tuning.overloadTolerance - 0.05);
                tuning.stopCountBias -= 1;
                console.log(`🔧 自愈: 检测到超载，降低容忍度到 ${tuning.overloadTolerance}，串点偏移到 ${tuning.stopCountBias}`);
            }

            // 如果是时效冲突，增加时间缓冲
            if (auditResult.issues.some(i => i.type === 'time_conflict')) {
                tuning.timeBuffer += 15;
            }

            // 如果是低效，尝试增加点数或放宽合并
            if (auditResult.issues.some(i => i.type === 'inefficient')) {
                tuning.stopCountBias += 1;
            }

            currentOptions = { ...currentOptions, tuning };
        }

        return {
            trips: finalTrips,
            summary: {
                // 扩展字段
                suggestions: finalSuggestions
            } as any,
            invalidOrders: [],
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
