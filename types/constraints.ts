/**
 * 排线约束 - 只包含影响排线决策的内容
 */
export interface RouteConstraints {
  // ===== 1. 时间窗约束 =====
  timeWindow: {
    start: string;  // "08:00"
    end: string;    // "17:00"
  } | null;
  excludeSunday: boolean;    // 周日不收
  excludeSaturday: boolean;  // 周六不收

  // ===== 2. 车型约束 =====
  requiredVehicleType: '飞翼' | '厢式' | '平板' | '高栏' | '冷藏' | null;  // null = 不限

  // ===== 3. 装载约束 =====
  noStack: boolean;  // 不可堆叠 → 托盘位占用×2

  // ===== 4. 路由约束 =====
  mustBeLast: boolean;       // 必须最后送（如：不允许带货进厂）
  mustBeFirst: boolean;      // 必须最先送
  singleTripOnly: boolean;   // 只能单独一趟（不可与其他订单合并）
  
  // ===== 元数据 =====
  rawText: string;           // 原始文本（用于人工复核）
  parsedRules: string[];     // 命中的规则ID列表
}

/**
 * 创建默认约束（无限制）
 */
export function createDefaultConstraints(): RouteConstraints {
  return {
    timeWindow: null,
    excludeSunday: false,
    excludeSaturday: false,
    requiredVehicleType: null,
    noStack: false,
    mustBeLast: false,
    mustBeFirst: false,
    singleTripOnly: false,
    rawText: '',
    parsedRules: [],
  };
}


