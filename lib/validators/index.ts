import { z } from 'zod';

// ============================================================================
// 基础类型 Schema
// ============================================================================

/**
 * 中国手机号验证
 */
export const phoneSchema = z.string()
  .regex(/^1[3-9]\d{9}$/, '请输入有效的手机号')
  .optional()
  .nullable();

/**
 * 经纬度验证
 */
export const coordinatesSchema = z.object({
  lng: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90),
});

/**
 * 时间字符串验证 (HH:MM 格式)
 */
export const timeStringSchema = z.string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, '时间格式应为 HH:MM');

/**
 * 日期字符串验证 (YYYY-MM-DD 格式)
 */
export const dateStringSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD');

// ============================================================================
// 仓库相关 Schema
// ============================================================================

/**
 * 创建仓库输入
 */
export const createWarehouseSchema = z.object({
  code: z.string().max(50).optional(),
  name: z.string().min(1, '仓库名称不能为空').max(100),
  address: z.string().min(1, '地址不能为空').max(500),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  timeWindowStart: timeStringSchema.optional(),
  timeWindowEnd: timeStringSchema.optional(),
  capacity: z.number().positive().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  active: z.boolean().optional(),
});

export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;

/**
 * 更新仓库输入
 */
export const updateWarehouseSchema = createWarehouseSchema.partial();

export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>;

// ============================================================================
// 车辆相关 Schema
// ============================================================================

/**
 * 创建车辆输入
 */
export const createVehicleSchema = z.object({
  plateNumber: z.string()
    .min(1, '车牌号不能为空')
    .max(20)
    // 简化车牌号验证，兼容各种格式
    .refine(
      (val) => /^[\u4e00-\u9fa5][A-Z][A-HJ-NP-Z0-9]{4,6}[A-HJ-NP-Z0-9\u4e00-\u9fa5]?$/.test(val) || val.length >= 5,
      '请输入有效的车牌号'
    ),
  vehicleType: z.string().max(50).optional().nullable(),
  capacityWeight: z.number().positive('载重必须为正数').optional().nullable(),
  capacityVolume: z.number().positive('体积必须为正数').optional().nullable(),
  status: z.enum(['idle', 'busy', 'maintenance']).optional(),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;

/**
 * 更新车辆输入
 */
export const updateVehicleSchema = createVehicleSchema.partial();

export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;

// ============================================================================
// 司机相关 Schema
// ============================================================================

/**
 * 创建司机输入
 */
export const createDriverSchema = z.object({
  name: z.string().min(1, '姓名不能为空').max(50),
  phone: phoneSchema,
  licenseType: z.string().max(20).optional().nullable(),
  status: z.enum(['active', 'inactive']).optional(),
});

export type CreateDriverInput = z.infer<typeof createDriverSchema>;

/**
 * 更新司机输入
 */
export const updateDriverSchema = createDriverSchema.partial();

export type UpdateDriverInput = z.infer<typeof updateDriverSchema>;

// ============================================================================
// 订单相关 Schema
// ============================================================================

/**
 * 订单状态
 */
export const orderStatusSchema = z.enum(['pending', 'scheduled', 'completed', 'failed']);

/**
 * 创建订单输入
 */
export const createOrderSchema = z.object({
  orderNumber: z.string().min(1, '订单号不能为空').max(100),
  customerName: z.string().max(200).optional().nullable(),
  address: z.string().min(1, '地址不能为空').max(500),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  weight: z.number().nonnegative('重量不能为负').optional().nullable(),
  volume: z.number().nonnegative('体积不能为负').optional().nullable(),
  quantity: z.number().int().positive('数量必须为正整数').optional().nullable(),
  deliveryDate: z.string().datetime().optional().nullable(),
  timeWindow: z.string().max(100).optional().nullable(),
  requirements: z.string().max(1000).optional().nullable(),
  status: orderStatusSchema.optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// ============================================================================
// 调度相关 Schema
// ============================================================================

/**
 * 调度配置选项
 */
export const scheduleOptionsSchema = z.object({
  maxStops: z.number().int().min(1).max(20).optional(),
  startTime: timeStringSchema.optional(),
  deadline: timeStringSchema.optional(),
  factoryDeadline: timeStringSchema.optional(),
  costMode: z.enum(['fixed', 'mileage', 'weight', 'hybrid']).optional(),
  weightFallbackMode: z.enum(['disabled', 'quantity_times_package_size']).optional(),
});

export type ScheduleOptionsInput = z.infer<typeof scheduleOptionsSchema>;

/**
 * 字段映射配置
 */
export const fieldMappingSchema = z.object({
  orderId: z.string().optional(),
  customerName: z.string().optional(),
  address: z.string().optional(),
  weight: z.string().optional(),
  volume: z.string().optional(),
  quantity: z.string().optional(),
  packageSize: z.string().optional(),
  deliveryDate: z.string().optional(),
  shipDate: z.string().optional(),
  timeWindow: z.string().optional(),
  requirements: z.string().optional(),
});

export type FieldMappingInput = z.infer<typeof fieldMappingSchema>;

/**
 * 车型配置
 */
export const vehicleConfigSchema = z.object({
  name: z.string(),
  category: z.string().optional(),
  maxWeightKg: z.number().positive(),
  maxVolumeM3: z.number().positive().optional(),
  palletSlots: z.number().int().positive(),
  pricePerKm: z.number().nonnegative(),
  basePrice: z.number().nonnegative(),
  fixedPrice: z.number().nonnegative().optional(),
  fuelCostPerKm: z.number().nonnegative().optional(),
  tollPerKm: z.number().nonnegative().optional(),
  dropCharge: z.number().nonnegative().optional(),
  returnEmptyRate: z.number().min(0).max(1).optional(),
  enabled: z.boolean(),
});

export type VehicleConfigInput = z.infer<typeof vehicleConfigSchema>;

// ============================================================================
// 通用 ID Schema
// ============================================================================

/**
 * UUID 验证
 */
export const uuidSchema = z.string().uuid('无效的 ID 格式');

/**
 * ID 参数
 */
export const idParamSchema = z.object({
  id: uuidSchema,
});

// ============================================================================
// 分页相关 Schema
// ============================================================================

/**
 * 分页参数
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

/**
 * 带排序的分页参数
 */
export const paginationWithSortSchema = paginationSchema.extend({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationWithSortInput = z.infer<typeof paginationWithSortSchema>;

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 安全解析（不抛出错误）
 */
export function safeParse<T extends z.ZodSchema>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * 从 URL SearchParams 解析查询参数
 */
export function parseSearchParams<T extends z.ZodSchema>(
  schema: T,
  searchParams: URLSearchParams
): z.infer<T> {
  const obj: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    obj[key] = value;
  });
  return schema.parse(obj);
}
