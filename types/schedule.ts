import { Order } from './order';
import { CostBreakdown } from './vehicle';

/**
 * 车次中的停靠点
 */
export interface TripStop {
  sequence: number;              // 顺序号 (1, 2, 3...)
  order: Order;                  // 关联的订单
  
  // 预计时间
  eta: string;                   // 预计到达时间
  etd: string;                   // 预计离开时间
  
  // 距离和时长
  distanceFromPrev: number;      // 距上一站距离 (km)
  durationFromPrev: number;      // 距上一站时长 (分钟)
  
  // 累计
  cumulativeDistance: number;    // 累计里程 (km)
  cumulativeDuration: number;    // 累计时长 (分钟)
  
  // 状态
  isOnTime: boolean;             // 是否准时
  delayMinutes?: number;         // 延迟分钟数（如果晚到）
}

/**
 * 单个车次
 */
export interface Trip {
  tripId: string;                // 车次编号 T001, T002...
  vehicleType: string;           // 使用车型
  
  // 停靠点列表
  stops: TripStop[];
  
  // 时间
  departureTime: string;         // 发车时间
  returnTime: string;            // 预计返回时间
  
  // 里程和时长
  totalDistance: number;         // 总里程 (km)
  totalDuration: number;         // 总时长 (小时)
  
  // 载重
  totalWeightKg: number;         // 总重量 (kg)
  totalPalletSlots: number;      // 总托盘位
  loadRateWeight: number;        // 载重装载率 (0-1)
  loadRatePallet: number;        // 托盘装载率 (0-1)
  
  // 成本
  estimatedCost: number;         // 预估成本
  costBreakdown?: CostBreakdown; // 成本明细
  
  // 状态
  isValid: boolean;              // 是否有效（所有时间窗都满足）
  hasRisk: boolean;              // 是否有风险
  riskStops: number[];           // 有风险的停靠点序号
  
  // 生成原因（可解释性）
  reason: string;
  warehouse?: {
    id: string;
    code: string;
    name: string;
  };
}

/**
 * 调度汇总
 */
export interface ScheduleSummary {
  // 基本统计
  totalOrders: number;
  totalTrips: number;
  
  // 里程和时长
  totalDistance: number;         // 总里程 (km)
  totalDuration: number;         // 总时长 (小时)
  
  // 成本
  totalCost: number;
  costBreakdown: {
    fuel: number;
    toll: number;
    labor: number;
    other: number;
  };
  
  // 装载率
  avgLoadRateWeight: number;
  avgLoadRatePallet: number;
  
  // 车型分布
  vehicleBreakdown: Record<string, number>;
  
  // 风险
  riskOrders: string[];          // 有晚到风险的订单ID
  invalidOrders: string[];       // 无法排线的订单ID
  
  // 约束触发情况
  constraintsSummary: {
    flyingWingRequired: number;  // 需要飞翼车的订单数
    weekendExcluded: number;     // 周末不收的订单数
    noStackOrders: number;       // 不可堆叠的订单数
    mustBeLastOrders: number;    // 必须最后送的订单数
    singleTripOrders: number;    // 必须单独成车的订单数
  };
}

/**
 * 调度结果
 */
export interface ScheduleResult {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  
  // 结果
  trips: Trip[];
  summary: ScheduleSummary;
  warehouses?: Array<{ id: string; code: string; name: string }>;
  
  // 时间戳
  createdAt: string;
  completedAt?: string;
  
  // 错误信息
  error?: string;
}

/**
 * 调度进度
 */
export interface ScheduleProgress {
  taskId: string;
  stage: number;                 // 当前阶段 (1-6)
  stageName: string;             // 阶段名称
  percent: number;               // 完成百分比 (0-100)
  message: string;               // 当前消息
  details?: string;              // 详细信息
}

/**
 * 调度配置选项
 */
export interface ScheduleOptions {
  maxStops: number;              // 最大串点数
  startTime: string;             // 发车开始时间
  deadline: string;              // 全局硬截止（司机工作时长等）
  factoryDeadline: string;       // 工厂最晚送货时间（默认 17:00）
  costMode: 'fixed' | 'mileage' | 'weight' | 'hybrid';
  showMarketReference: boolean;
}


