/**
 * 单个车型配置
 */
export interface VehicleConfig {
  id: string;
  name: string;                  // 车型名称，如 "6.8米"
  category: '厢式' | '飞翼' | '平板' | '高栏' | '冷藏' | '尾板';
  enabled: boolean;              // 是否启用
  
  // 容量参数
  maxWeightKg: number;           // 最大载重 (kg)
  maxVolumeM3?: number;          // 最大容积 (m³)
  palletSlots: number;           // 托盘位数
  
  // 成本参数 - 里程计价模式
  basePrice: number;             // 起步价 (元)
  pricePerKm: number;            // 里程单价 (元/km)
  
  // 可选成本参数
  fixedPrice?: number;           // 固定价格 (元/趟)
  fuelCostPerKm?: number;        // 油耗成本 (元/km)
  tollPerKm?: number;            // 过路费估算 (元/km)
  
  // 约束
  notes?: string;                // 备注
}

/**
 * 车型配置模板
 */
export interface FleetConfigTemplate {
  id: string;
  name: string;
  description?: string;
  vehicles: VehicleConfig[];
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * 运行时车型配置（合并后）
 */
export interface RuntimeFleetConfig {
  baseTemplateId: string;
  baseTemplateName: string;
  vehicles: VehicleConfig[];
  tempVehicles: VehicleConfig[];
  disabledVehicleIds: string[];
}

/**
 * 成本计算模式
 */
export type CostMode = 'fixed' | 'mileage' | 'weight' | 'hybrid';

/**
 * 成本明细
 */
export interface CostBreakdown {
  total: number;
  fuel: number;
  toll: number;
  labor: number;
  other: number;
  marketReference?: { min: number; max: number };
}


