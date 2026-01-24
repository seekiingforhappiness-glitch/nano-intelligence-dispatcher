import prisma from '@/lib/prisma';

// 本地 Driver 类型定义（避免依赖 Prisma 生成的类型）
export interface DriverRecord {
    id: string;
    organizationId: string;
    name: string;
    phone: string | null;
    licenseType: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * 列出指定组织的所有司机
 * @param organizationId 必需的组织 ID（显式传递以防止跨租户访问）
 */
export async function listDrivers(organizationId: string): Promise<DriverRecord[]> {
    if (!organizationId) {
        throw new Error('organizationId is required');
    }
    return prisma.driver.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
    });
}

/**
 * 获取指定组织的单个司机
 */
export async function getDriver(id: string, organizationId: string): Promise<DriverRecord | null> {
    if (!organizationId) {
        throw new Error('organizationId is required');
    }
    return prisma.driver.findFirst({
        where: { id, organizationId },
    });
}

export interface DriverInput {
    name: string;
    phone?: string | null;
    licenseType?: string | null;
    status?: string;
}

/**
 * 创建司机
 */
export async function createDriver(input: DriverInput, organizationId: string): Promise<DriverRecord> {
    if (!organizationId) {
        throw new Error('organizationId is required');
    }
    return prisma.driver.create({
        data: {
            ...input,
            organizationId,
        },
    });
}

/**
 * 更新司机
 */
export async function updateDriver(
    id: string,
    input: Partial<DriverInput>,
    organizationId: string
): Promise<DriverRecord | null> {
    if (!organizationId) {
        throw new Error('organizationId is required');
    }
    try {
        return await prisma.driver.update({
            where: { id, organizationId },
            data: input,
        });
    } catch (e) {
        return null;
    }
}

/**
 * 删除司机
 */
export async function deleteDriver(id: string, organizationId: string): Promise<void> {
    if (!organizationId) {
        throw new Error('organizationId is required');
    }
    try {
        await prisma.driver.delete({
            where: { id, organizationId },
        });
    } catch (e) {
        // Ignore error
    }
}
