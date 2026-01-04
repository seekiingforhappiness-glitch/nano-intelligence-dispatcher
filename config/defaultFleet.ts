import { FleetConfigTemplate, VehicleConfig } from '@/types/vehicle';

/**
 * 默认车型配置 - 基于金发实际车型
 */
export const defaultVehicles: VehicleConfig[] = [
  {
    id: 'v-3.8',
    name: '3.8米',
    category: '厢式',
    enabled: true,
    maxWeightKg: 3000,
    palletSlots: 6,
    basePrice: 300,
    pricePerKm: 1.5,
    fuelCostPerKm: 0.8,
    tollPerKm: 0.3,
  },
  {
    id: 'v-4.2',
    name: '4.2米',
    category: '厢式',
    enabled: true,
    maxWeightKg: 4000,
    palletSlots: 8,
    basePrice: 350,
    pricePerKm: 1.8,
    fuelCostPerKm: 0.9,
    tollPerKm: 0.4,
  },
  {
    id: 'v-6.8',
    name: '6.8米',
    category: '厢式',
    enabled: true,
    maxWeightKg: 10000,
    palletSlots: 14,
    basePrice: 500,
    pricePerKm: 2.5,
    fuelCostPerKm: 1.2,
    tollPerKm: 0.6,
  },
  {
    id: 'v-9.6',
    name: '9.6米',
    category: '厢式',
    enabled: true,
    maxWeightKg: 18000,
    palletSlots: 20,
    basePrice: 800,
    pricePerKm: 3.5,
    fuelCostPerKm: 1.8,
    tollPerKm: 0.8,
  },
  {
    id: 'v-12.5',
    name: '12.5米',
    category: '厢式',
    enabled: true,
    maxWeightKg: 28000,
    palletSlots: 28,
    basePrice: 1200,
    pricePerKm: 4.5,
    fuelCostPerKm: 2.2,
    tollPerKm: 1.0,
  },
  {
    id: 'v-13.5',
    name: '13.5米',
    category: '厢式',
    enabled: true,
    maxWeightKg: 32000,
    palletSlots: 32,
    basePrice: 1500,
    pricePerKm: 5.0,
    fuelCostPerKm: 2.5,
    tollPerKm: 1.2,
  },
  {
    id: 'v-17.5',
    name: '17.5米',
    category: '厢式',
    enabled: true,
    maxWeightKg: 40000,
    palletSlots: 40,
    basePrice: 2000,
    pricePerKm: 6.0,
    fuelCostPerKm: 3.0,
    tollPerKm: 1.5,
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
  // 过滤启用的车型，按载重排序
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


