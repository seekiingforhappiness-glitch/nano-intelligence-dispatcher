import { Trip, ScheduleOptions } from '@/types/schedule';
import { Order } from '@/types/order';
import { VehicleConfig } from '@/types/vehicle';
import { estimateRoadDistance, estimateDuration } from '@/lib/utils/haversine';
import { optimizeRoute, calculateSegmentDistances } from './routing';

export interface AuditIssue {
    tripId: string;
    type: 'overload' | 'inefficient' | 'time_conflict' | 'vehicle_mismatch';
    severity: 'critical' | 'warning';
    message: string;
}

export interface AuditResult {
    isValid: boolean;
    score: number;
    issues: AuditIssue[];
    suggestions: string[];
}

/**
 * 调度审计器：对生成的 Trips 执行合规性与效能全量扫描
 */
export async function auditSchedule(
    trips: Trip[],
    depotCoord: { lng: number; lat: number },
    options: ScheduleOptions,
    availableVehicles: VehicleConfig[]
): Promise<AuditResult> {
    const issues: AuditIssue[] = [];
    const suggestions: string[] = [];
    let totalScore = 100;

    for (const trip of trips) {
        const vehicleDetail = availableVehicles.find(v => v.name === trip.vehicleType);
        if (!vehicleDetail) {
            issues.push({
                tripId: trip.tripId,
                type: 'vehicle_mismatch',
                severity: 'critical',
                message: `找不到车型配置: ${trip.vehicleType}`,
            });
            continue;
        }

        // 1. 超载检查 (阈值: 110%)
        const maxWeight = vehicleDetail.maxWeightKg;
        const currentWeight = trip.totalWeightKg;
        const loadRate = currentWeight / maxWeight;

        if (loadRate > 1.1) {
            issues.push({
                tripId: trip.tripId,
                type: 'overload',
                severity: 'critical',
                message: `${trip.vehicleType} 严重超载 (${Math.round(loadRate * 100)}%)，超过 110% 触发重调。`,
            });
            totalScore -= 20;
        } else if (loadRate > 1.0) {
            issues.push({
                tripId: trip.tripId,
                type: 'overload',
                severity: 'warning',
                message: `${trip.vehicleType} 轻微超载 (${Math.round(loadRate * 100)}%)，在容忍范围内。`,
            });
            totalScore -= 5;
        }

        // 2. 低效检查 (长途轻载)
        if (trip.totalDistance > 50 && loadRate < 0.3) {
            issues.push({
                tripId: trip.tripId,
                type: 'inefficient',
                severity: 'critical',
                message: `长途轻载警告：单次行程 >50km 但装载率低于 30%。`,
            });
            totalScore -= 15;
        }

        // 3. 时效稽核 (时间窗硬约束)
        const timeAudit = await auditTimeWindows(trip, depotCoord, options);
        issues.push(...timeAudit.issues);
        suggestions.push(...timeAudit.suggestions);
        if (timeAudit.hasCritical) {
            totalScore -= 30;
        }
    }

    return {
        isValid: !issues.some(i => i.severity === 'critical'),
        score: Math.max(0, totalScore),
        issues,
        suggestions: Array.from(new Set(suggestions)), // 去重
    };
}

/**
 * 内部私有方法：验证 Trip 的时间窗可行性并给出建议
 */
async function auditTimeWindows(
    trip: Trip,
    depotCoord: { lng: number; lat: number },
    options: ScheduleOptions
) {
    const issues: AuditIssue[] = [];
    const suggestions: string[] = [];
    let hasCritical = false; // 3. 时间窗审计

    const tripOrders = trip.stops.map(s => s.order);
    const optimized = optimizeRoute(tripOrders, depotCoord);
    const segmentDistances = await calculateSegmentDistances(optimized, depotCoord);

    const [startH, startM] = options.startTime.split(':').map(Number);
    let currentTime = startH * 60 + (startM || 0);

    for (let i = 0; i < optimized.length; i++) {
        const order = optimized[i];
        const stop = trip.stops.find(s => s.order.orderNumber === order.orderNumber); // Find the corresponding stop
        if (!stop) continue; // Should not happen if optimized orders are from trip.stops

        const segmentDist = estimateRoadDistance(segmentDistances[i] || 0);
        const segmentDur = estimateDuration(segmentDist) * 60;

        currentTime += segmentDur;

        if (order.constraints.timeWindow) {
            const [endH, endM] = order.constraints.timeWindow.end.split(':').map(Number);
            const deadline = endH * 60 + (endM || 0);

            if (currentTime > deadline) {
                const delay = currentTime - deadline;
                const isCritical = delay > 30; // Define isCritical based on delay threshold

                if (isCritical) {
                    issues.push({
                        tripId: trip.tripId,
                        type: 'time_conflict',
                        severity: 'critical',
                        message: `${stop.order.customerName} 严重迟到 (${delay}分)，不可接受。`,
                    });
                    hasCritical = true; // Mark as critical for the trip
                } else if (delay > 0) {
                    issues.push({
                        tripId: trip.tripId,
                        type: 'time_conflict',
                        severity: 'warning',
                        message: `${stop.order.customerName} 轻微迟到 (${delay}分)，建议优化。`,
                    });
                    suggestions.push(`建议调早仓库配货时间约 ${delay} 分钟，或协调 ${order.orderNumber} 客户顺延接收。`);
                }
            }
        }

        currentTime += options.unloadingMinutes;
    }

    return { issues, suggestions, hasCritical };
}
