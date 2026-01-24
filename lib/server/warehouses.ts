import prisma from '@/lib/prisma';
import { getDepotConfig } from '@/config/depot';

// 本地 Warehouse 类型定义（避免依赖 Prisma 生成的类型）
export interface WarehouseRecord {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  timeWindowStart: string | null;
  timeWindowEnd: string | null;
  capacity: number | null;
  notes: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 获取仓库列表
 * @param organizationId 必需的组织 ID（显式传递以防止跨租户访问）
 */
export async function listWarehouses(organizationId: string): Promise<WarehouseRecord[]> {
  if (!organizationId) {
    throw new Error('organizationId is required');
  }

  try {
    const warehouses = await prisma.warehouse.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
    });

    if (warehouses.length === 0) {
      // Seed default warehouse if none exists
      return await seedDefaultWarehouse(organizationId);
    }
    return warehouses;
  } catch (error) {
    console.error('listWarehouses error:', error);
    return [];
  }
}

/**
 * 获取单个仓库
 */
export async function getWarehouse(id: string, organizationId: string): Promise<WarehouseRecord | null> {
  if (!organizationId) {
    throw new Error('organizationId is required');
  }
  return prisma.warehouse.findFirst({
    where: { id, organizationId },
  });
}

/**
 * 按代码获取仓库
 */
export async function getWarehouseByCode(code: string, organizationId: string): Promise<WarehouseRecord | null> {
  if (!organizationId) {
    throw new Error('organizationId is required');
  }
  return prisma.warehouse.findFirst({
    where: { code, organizationId },
  });
}

export interface WarehouseInput {
  code?: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  capacity?: number | null;
  notes?: string | null;
  active?: boolean;
}

/**
 * 创建或更新仓库
 */
export async function createWarehouse(input: WarehouseInput, organizationId: string): Promise<WarehouseRecord> {
  if (!organizationId) {
    throw new Error('organizationId is required');
  }

  // 确保组织存在（关键：防止外键约束失败）
  await ensureOrganizationExists(organizationId);

  // Default code if missing
  const code = input.code?.trim() || Math.random().toString(36).substr(2, 8).toUpperCase();

  return prisma.warehouse.upsert({
    where: {
      organizationId_code: {
        organizationId,
        code: code
      }
    },
    update: {
      name: input.name.trim(),
      address: input.address.trim(),
      lat: input.lat,
      lng: input.lng,
      timeWindowStart: input.timeWindowStart || '06:00',
      timeWindowEnd: input.timeWindowEnd || '20:00',
      capacity: input.capacity ?? null,
      notes: input.notes ?? null,
      active: input.active ?? true,
    },
    create: {
      organizationId,
      code: code,
      name: input.name.trim(),
      address: input.address.trim(),
      lat: input.lat,
      lng: input.lng,
      timeWindowStart: input.timeWindowStart || '06:00',
      timeWindowEnd: input.timeWindowEnd || '20:00',
      capacity: input.capacity ?? null,
      notes: input.notes ?? null,
      active: input.active ?? true,
    }
  });
}

/**
 * 更新仓库
 */
export async function updateWarehouse(
  id: string,
  input: Partial<WarehouseInput>,
  organizationId: string
): Promise<WarehouseRecord | null> {
  if (!organizationId) {
    throw new Error('organizationId is required');
  }

  // 验证仓库属于该组织
  const existing = await prisma.warehouse.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    return null;
  }

  try {
    return await prisma.warehouse.update({
      where: { id },
      data: {
        code: input.code?.trim(),
        name: input.name?.trim(),
        address: input.address?.trim(),
        lat: input.lat,
        lng: input.lng,
        timeWindowStart: input.timeWindowStart,
        timeWindowEnd: input.timeWindowEnd,
        capacity: input.capacity,
        notes: input.notes,
        active: input.active,
      }
    });
  } catch (e) {
    return null;
  }
}

/**
 * 删除仓库
 */
export async function deleteWarehouse(id: string, organizationId: string): Promise<void> {
  if (!organizationId) {
    throw new Error('organizationId is required');
  }

  // 验证仓库属于该组织
  const existing = await prisma.warehouse.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    return;
  }

  try {
    await prisma.warehouse.delete({
      where: { id }
    });
  } catch (e) {
    // Ignore if not found
  }
}

async function ensureOrganizationExists(orgId: string): Promise<void> {
  try {
    await prisma.organization.upsert({
      where: { id: orgId },
      update: {},
      create: {
        id: orgId,
        name: '默认组织',
        slug: orgId,
      },
    });
  } catch (e) {
    const existing = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!existing) {
      await prisma.organization.create({
        data: {
          id: orgId,
          name: '默认组织',
          slug: `${orgId}-${Date.now()}`,
        },
      });
    }
  }
}

async function seedDefaultWarehouse(orgId: string): Promise<WarehouseRecord[]> {
  await ensureOrganizationExists(orgId);

  const depot = getDepotConfig();
  const warehouse = await createWarehouse({
    code: depot.id,
    name: depot.name,
    address: depot.address,
    lat: depot.coordinates.lat,
    lng: depot.coordinates.lng,
    timeWindowStart: '06:00',
    timeWindowEnd: '20:00',
    capacity: null,
    notes: '系统默认仓',
    active: true,
  }, orgId);
  return [warehouse];
}
