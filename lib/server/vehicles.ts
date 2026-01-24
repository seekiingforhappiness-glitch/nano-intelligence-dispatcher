import prisma from '@/lib/prisma';

// 本地 Vehicle 类型定义（避免依赖 Prisma 生成的类型）
export interface VehicleRecord {
    id: string;
    organizationId: string;
    plateNumber: string;
    vehicleType: string | null;
    capacityWeight: number | null;
    capacityVolume: number | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * 列出指定组织的所有车辆
 * @param organizationId 必需的组织 ID（显式传递以防止跨租户访问）
 */
export async function listVehicles(organizationId: string): Promise<VehicleRecord[]> {
    if (!organizationId) {
        throw new Error('organizationId is required');
    }
    return prisma.vehicle.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
    });
}

/**
 * 获取指定组织的单个车辆
 */
export async function getVehicle(id: string, organizationId: string): Promise<VehicleRecord | null> {
    if (!organizationId) {
        throw new Error('organizationId is required');
    }
    return prisma.vehicle.findFirst({
        where: { id, organizationId },
    });
}

export interface VehicleInput {
    plateNumber: string;
    vehicleType?: string | null;
    capacityWeight?: number | null;
    capacityVolume?: number | null;
    status?: string;
}

/**
 * 创建车辆
 */
export async function createVehicle(input: VehicleInput, organizationId: string): Promise<VehicleRecord> {
    if (!organizationId) {
        throw new Error('organizationId is required');
    }
    return prisma.vehicle.create({
        data: {
            ...input,
            organizationId,
        },
    });
}

/**
 * 更新车辆
 */
export async function updateVehicle(
    id: string,
    input: Partial<VehicleInput>,
    organizationId: string
): Promise<VehicleRecord | null> {
    if (!organizationId) {
        throw new Error('organizationId is required');
    }
    try {
        return await prisma.vehicle.update({
            where: { id, organizationId },
            data: input,
        });
    } catch (e) {
        return null;
    }
}

/**
 * 删除车辆
 */
export async function deleteVehicle(id: string, organizationId: string): Promise<void> {
    if (!organizationId) {
        throw new Error('organizationId is required');
    }
    try {
        await prisma.vehicle.delete({
            where: { id, organizationId },
        });
    } catch (e) {
        // Ignore error
    }
}
