import { FleetConfigTemplate, VehicleConfig } from '@/types/vehicle';

/**
 * 默认车型配置 - 基于金发实际车型
 * 🎯 调优方向：大幅拉开大小车成本，鼓励大容量聚合
 */
export const defaultVehicles: VehicleConfig[] = [
  {
    id: 'v-3.8',
    name: '3.8米',
    category: '厢式',
    enabled: true,
    maxWeightKg: 3000,      // 核载3吨（蓝牌小货车）
    palletSlots: 6,
    basePrice: 480,          // ⬆ 再次上调起步价，严惩低效小车
    pricePerKm: 2.2,         // ⬆ 维持高单公里成本
    fuelCostPerKm: 1.1,
    tollPerKm: 0.4,
    dropCharge: 50,
  },
  {
    id: 'v-4.2',
    name: '4.2米',
    category: '厢式',
    enabled: true,
    maxWeightKg: 4500,
    palletSlots: 8,
    basePrice: 550,
    pricePerKm: 2.4,
    fuelCostPerKm: 1.2,
    tollPerKm: 0.5,
    dropCharge: 60,
  },
  {
    id: 'v-6.8',
    name: '6.8米',
    category: '厢式',
    enabled: true,
    maxWeightKg: 10000,
    palletSlots: 14,
    basePrice: 650,
    pricePerKm: 2.8,
    fuelCostPerKm: 1.4,
    tollPerKm: 0.7,
    dropCharge: 80,
  },
  {
    id: 'v-9.6',
    name: '9.6米',
    category: '厢式',
    enabled: true,
    maxWeightKg: 18000,
    palletSlots: 20,
    basePrice: 800,
    pricePerKm: 3.2,
    fuelCostPerKm: 1.6,
    tollPerKm: 0.9,
    dropCharge: 100,
    returnEmptyRate: 0.3,
  },
  {
    id: 'v-12.5',
    name: '12.5米',
    category: '厢式',
    enabled: true,
    maxWeightKg: 30000,
    palletSlots: 30,
    basePrice: 900,
    pricePerKm: 3.6,         // ⬇ 降低大车公里成本
    fuelCostPerKm: 1.8,
    tollPerKm: 1.1,
    dropCharge: 120,
    returnEmptyRate: 0.35,
  },
  {
    id: 'v-13.5',
    name: '13.5米',
    category: '厢式',
    enabled: true,
    maxWeightKg: 32000,
    palletSlots: 32,
    basePrice: 1000,
    pricePerKm: 3.8,
    fuelCostPerKm: 1.9,
    tollPerKm: 1.2,
    dropCharge: 130,
    returnEmptyRate: 0.35,
  },
  {
    id: 'v-17.5',
    name: '17.5米',
    category: '厢式',
    enabled: true,
    maxWeightKg: 40000,
    palletSlots: 40,
    basePrice: 1100,         // ⬇ 再次下调大车起步价，鼓励大容量聚合
    pricePerKm: 4.0,         // ⬇ 显著降低规模成本
    fuelCostPerKm: 2.0,
    tollPerKm: 1.4,
    dropCharge: 150,
    returnEmptyRate: 0.4,
  },
];

/**
 * 默认车型配置模板
 */
export const defaultFleetConfig: FleetConfigTemplate = {
  id: 'default',
  name: '金发标准车型',
  description: '包含 3.8米 至 17.5米 共 7 种常用车型',
  vehicles: defaultVehicles,
  isDefault: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * 根据载重选择合适的车型
 */
export function selectVehicleByWeight(
  weightKg: number,
  vehicles: VehicleConfig[] = defaultVehicles
): VehicleConfig | null {
  const sorted = vehicles
    .filter(v => v.enabled && v.maxWeightKg >= weightKg)
    .sort((a, b) => a.maxWeightKg - b.maxWeightKg);
  return sorted[0] || null;
}

/**
 * 根据托盘位选择合适的车型
 */
export function selectVehicleByPallets(
  pallets: number,
  vehicles: VehicleConfig[] = defaultVehicles
): VehicleConfig | null {
  const sorted = vehicles
    .filter(v => v.enabled && v.palletSlots >= pallets)
    .sort((a, b) => a.palletSlots - b.palletSlots);
  return sorted[0] || null;
}
