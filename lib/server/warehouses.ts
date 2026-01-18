import prisma from '@/lib/prisma';
import { Warehouse, Prisma } from '@prisma/client';
import { getCurrentOrganizationId } from './context';
import { getDepotConfig } from '@/config/depot';

// Re-exporting the type for compatibility using Prisma's generated type
// We can extend this if we need derived fields
export type WarehouseRecord = Warehouse;

export async function listWarehouses(): Promise<WarehouseRecord[]> {
  const orgId = await getCurrentOrganizationId();
  const warehouses = await prisma.warehouse.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'asc' },
  });

  if (warehouses.length === 0) {
    // Seed default warehouse if none exists
    return await seedDefaultWarehouse(orgId);
  }
  return warehouses;
}

export async function getWarehouse(id: string): Promise<WarehouseRecord | null> {
  // We should ideally restrict by orgId too for security
  const orgId = await getCurrentOrganizationId();
  return prisma.warehouse.findFirst({
    where: { id, organizationId: orgId },
  });
}

export async function getWarehouseByCode(code: string): Promise<WarehouseRecord | null> {
  const orgId = await getCurrentOrganizationId();
  return prisma.warehouse.findFirst({
    where: { code, organizationId: orgId },
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

export async function createWarehouse(input: WarehouseInput): Promise<WarehouseRecord> {
  const orgId = await getCurrentOrganizationId();

  // Default code if missing
  const code = input.code?.trim() || Math.random().toString(36).substr(2, 8).toUpperCase();

  return prisma.warehouse.upsert({
    where: {
      organizationId_code: {
        organizationId: orgId,
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
      organizationId: orgId,
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

export async function updateWarehouse(id: string, input: Partial<WarehouseInput>): Promise<WarehouseRecord | null> {
  const orgId = await getCurrentOrganizationId();

  try {
    return await prisma.warehouse.update({
      where: {
        id,
        // Prisma update constraints usually only work on ID, but we should verify ownership
        // Ideally we check existence first or use updateMany (which doesn't return the record in all providers)
        // Since ID is UUID, collision is unlikely, but good practice to check logic:
      },
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

export async function deleteWarehouse(id: string): Promise<void> {
  // const orgId = await getCurrentOrganizationId();
  try {
    await prisma.warehouse.delete({
      where: { id }
    });
  } catch (e) {
    // Ignore if not found
  }
}

async function ensureOrganizationExists(orgId: string): Promise<void> {
  // Try to create the organization if it doesn't exist
  try {
    await prisma.organization.upsert({
      where: { id: orgId },
      update: {}, // No updates needed if exists
      create: {
        id: orgId,
        name: '默认组织',
        slug: orgId,
      },
    });
  } catch (e) {
    // If upsert fails (e.g., slug conflict), try to find existing or create with unique slug
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
  // Ensure the organization exists before creating warehouse
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
  });
  return [warehouse];
}



