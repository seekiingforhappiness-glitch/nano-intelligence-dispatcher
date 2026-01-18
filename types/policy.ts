/**
 * 调度策略类型定义
 * 用于配置资源固化、路线模板等调度规则
 */

// ========== 资源固化策略 ==========

/**
 * 资源绑定规则
 * 将特定车型/承运商/司机绑定到指定区域或客户
 */
export interface ResourceBinding {
    id: string;
    name: string;
    description?: string;
    enabled: boolean;
    priority: number; // 优先级，数字越小优先级越高

    // 匹配条件
    conditions: {
        regions?: string[];       // 匹配区域/城市（如：["上海", "苏州"]）
        districts?: string[];     // 匹配区县（如：["浦东新区", "昆山市"]）
        customers?: string[];     // 匹配客户名称
        orderTags?: string[];     // 匹配订单标签
    };

    // 绑定资源
    assignment: {
        vehicleTypes?: string[];  // 指定车型
        carrierId?: string;       // 指定承运商 ID
        carrierName?: string;     // 承运商名称（显示用）
        driverId?: string;        // 指定司机 ID
        driverName?: string;      // 司机名称（显示用）
    };

    createdAt: string;
    updatedAt: string;
}

// ========== 路线模板 ==========

/**
 * 固定路线模板
 * 预定义客户访问顺序，用于重复性配送场景
 */
export interface RouteTemplate {
    id: string;
    name: string;
    description?: string;
    enabled: boolean;

    // 路线站点（按顺序）
    stops: RouteTemplateStop[];

    // 适用条件
    applicableDays: DayOfWeek[];    // 适用星期
    vehicleType?: string;            // 推荐车型
    estimatedDuration?: number;      // 预计耗时（分钟）
    estimatedDistance?: number;      // 预计里程（公里）

    createdAt: string;
    updatedAt: string;
}

export interface RouteTemplateStop {
    sequence: number;          // 顺序号
    customerName: string;      // 客户名称
    customerId?: string;       // 客户 ID（可选）
    address?: string;          // 地址（可选，用于显示）
    estimatedArrival?: string; // 预计到达时间（如 "09:30"）
    notes?: string;            // 备注
}

export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

// ========== 优先级规则 ==========

/**
 * 订单优先级规则
 * 根据订单属性自动设置优先级
 */
export interface PriorityRule {
    id: string;
    name: string;
    enabled: boolean;
    priority: number; // 规则本身的优先级

    // 匹配条件
    conditions: {
        customerTags?: string[];   // 客户标签（如：["VIP", "大客户"]）
        orderTags?: string[];      // 订单标签（如：["加急", "冷链"]）
        minWeight?: number;        // 最小重量
        maxWeight?: number;        // 最大重量
        timeWindow?: {
            before?: string;         // 截止时间早于
            after?: string;          // 截止时间晚于
        };
    };

    // 优先级调整
    action: {
        priorityLevel: 'urgent' | 'high' | 'normal' | 'low';
        priorityScore?: number;    // 数值优先级（可选）
    };

    createdAt: string;
    updatedAt: string;
}

// ========== 策略配置汇总 ==========

export interface SchedulePolicies {
    resourceBindings: ResourceBinding[];
    routeTemplates: RouteTemplate[];
    priorityRules: PriorityRule[];
}

// ========== 承运商/供应商 ==========

export interface Carrier {
    id: string;
    name: string;
    code: string;              // 承运商编码
    contactName?: string;      // 联系人
    contactPhone?: string;     // 联系电话
    vehicleTypes: string[];    // 可用车型
    serviceRegions: string[];  // 服务区域
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
}
