import { RouteConstraints } from './constraints';

/**
 * 原始订单数据（从Excel解析）
 */
export interface RawOrder {
  rowIndex: number;              // 原始行号
  orderId: string;               // 送货单号
  shipDate: string;              // 发货日期
  deliveryDate: string;          // 到货日期
  customerName: string;          // 送达方
  weightKg: number;              // 重量 (kg)
  address: string;               // 地址
  packageSize: number;           // 规格
  requirementsRaw: string;       // 运输商发货要求（原始文本）
  quantity?: number;             // 数量
  volumeM3?: number;             // 容积 (m³)
  weightDerivedFrom?: 'quantity_times_package_size'; // 重量推导来源（可选）
  rawRow?: Record<string, unknown>; // 原始表格整行
  [key: string]: unknown;        // 其他原始字段
}

/**
 * 清洗后的订单数据
 */
export interface CleanedOrder extends RawOrder {
  // 清洗状态
  cleaningWarnings: string[];    // 清洗警告
  cleaningErrors: string[];      // 清洗错误
  isValid: boolean;              // 是否有效
}

/**
 * 完整订单数据（含坐标和约束）
 */
export interface Order extends CleanedOrder {
  // 地理信息
  coordinates: {
    lng: number;
    lat: number;
  } | null;
  geocodeSource: 'cache' | 'api' | 'fallback' | 'failed';
  formattedAddress?: string;

  // 解析后的约束
  constraints: RouteConstraints;

  // 计算字段
  effectivePalletSlots: number;  // 实际占用托盘位（考虑堆叠）
  distanceFromDepot?: number;    // 距仓库距离 (km)
  angleFromDepot?: number;       // 相对仓库角度（用于分区）
}

/**
 * 数据清洗报告
 */
export interface CleaningReport {
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  autoFixes: {
    rowIndex: number;
    field: string;
    original: string;
    fixed: string;
    reason: string;
  }[];
  warnings: {
    rowIndex: number;
    field: string;
    message: string;
    suggestion?: string;
  }[];
  errors: {
    rowIndex: number;
    field: string;
    message: string;
  }[];
}

/**
 * 字段映射配置
 */
export interface FieldMapping {
  orderId?: string;
  shipDate?: string;
  deliveryDate?: string;
  customerName?: string;
  weightKg?: string;
  address?: string;
  packageSize?: string;
  requirementsRaw?: string;
  quantity?: string;
}

/**
 * 字段识别结果
 */
export interface FieldDetectionResult {
  detectedMapping: FieldMapping;
  unmappedColumns: string[];
  confidence: number;
}


