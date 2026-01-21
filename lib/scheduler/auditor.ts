import { Trip, ScheduleOptions } from '@/types/schedule';
import { Order } from '@/types/order';
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
    options: ScheduleOptions
): Promise<AuditResult> {
    const issues: AuditIssue[] = [];
    const suggestions: string[] = [];
    let totalScore = 100;

    for (const trip of trips) {
        // 1. 超载检查 (阈值: 110%)
        const maxWeight = trip.vehicle.maxWeightKg;
        const currentWeight = trip.totalWeightKg;
        const loadRate = currentWeight / maxWeight;

        if (loadRate > 1.1) {
            issues.push({
                tripId: trip.id,
                type: 'overload',
                severity: 'critical',
                message: `${trip.vehicle.name} 严重超载 (${Math.round(loadRate * 100)}%)，超过 110% 触发重调。`,
            });
            totalScore -= 20;
        } else if (loadRate > 1.0) {
            issues.push({
                tripId: trip.id,
                type: 'overload',
                severity: 'warning',
                message: `${trip.vehicle.name} 轻微超载 (${Math.round(loadRate * 100)}%)，在容忍范围内。`,
            });
            totalScore -= 5;
        }

        // 2. 低效检查 (长途轻载)
        if (trip.totalDistance > 50 && loadRate < 0.3) {
            issues.push({
                tripId: trip.id,
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
    let hasCritical = false;

    const optimized = optimizeRoute(trip.orders, depotCoord);
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

            if (currentTime > deadline) {
                const delay = currentTime - deadline;
                if (delay > 30) {
                    issues.push({
                        tripId: trip.id,
                        type: 'time_conflict',
                        severity: 'critical',
                        message: `订单 ${order.orderNumber} 预计超时 ${delay} 分钟，超出可调解范围。`,
                    });
                    hasCritical = true;
                } else {
                    issues.push({
                        tripId: trip.id,
                        type: 'time_conflict',
                        severity: 'warning',
                        message: `订单 ${order.orderNumber} 预计超时 ${delay} 分钟。`,
                    });
                    suggestions.push(`建议调早仓库配货时间约 ${delay} 分钟，或协调 ${order.orderNumber} 客户顺延接收。`);
                }
            }
        }

        currentTime += options.unloadingMinutes;
    }

    return { issues, suggestions, hasCritical };
}
