import { Trip, ScheduleOptions, TIME_WINDOW_CONSTANTS } from '@/types/schedule';
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

        // 2. 低效检查 (短途或长途但装载率极低)
        if ((trip.totalDistance > 20 && loadRate < 0.4) || (trip.reason || '').includes('效率低下')) {
            issues.push({
                tripId: trip.tripId,
                type: 'inefficient',
                severity: 'critical', // 架构修正：低效必须作为 Critical 处理以触发自愈重组
                message: `低效运输警告：${trip.reason || `单次行程 >50km 但装载率过低(${Math.round(loadRate * 100)}%)`}`,
            });
            totalScore -= 15;
            suggestions.push(`车次 ${trip.tripId} 效率低下，建议放宽时间窗或增加改车次配载量。`);
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
    const segmentDistances = calculateSegmentDistances(optimized, depotCoord);

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
                const isCritical = delay > TIME_WINDOW_CONSTANTS.CRITICAL_DELAY_MINUTES;

                if (isCritical) {
                    // 🚨 架构建议：严重超时（30分钟以上）列为 Critical，必须处理
                    issues.push({
                        tripId: trip.tripId,
                        type: 'time_conflict',
                        severity: 'critical',
                        message: `${stop.order.customerName} 严重迟到 (${Math.round(delay)}分，超过${TIME_WINDOW_CONSTANTS.CRITICAL_DELAY_MINUTES}分钟阈值)，方案不可行。`,
                    });
                    hasCritical = true;
                } else if (delay > TIME_WINDOW_CONSTANTS.WARNING_DELAY_MINUTES) {
                    // ⚠️ 架构建议：轻微超时视为"可协调"（Elastic Window）
                    // 给予警告但不阻断生成，由自愈引擎建议调整仓库作业时间
                    issues.push({
                        tripId: trip.tripId,
                        type: 'time_conflict',
                        severity: 'warning',
                        message: `${stop.order.customerName} 轻微迟到 (${Math.round(delay)}分)，建议提早仓库装货。`,
                    });

                    const earliestDeparture = options.startTime;
                    suggestions.push(
                        `📌 调度师决策参考：此方案（${trip.tripId}）预估成本约 ¥${Math.round(trip.estimatedCost || 0)}。虽然 ${stop.order.customerName} 滞后 ${Math.round(delay)}分，但可通过提早 ${Math.round(delay + 5)}分钟装车规避。`
                    );
                }
            }
        }

        currentTime += options.unloadingMinutes;
    }

    return { issues, suggestions, hasCritical };
}
