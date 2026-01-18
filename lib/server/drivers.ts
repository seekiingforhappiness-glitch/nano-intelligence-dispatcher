import prisma from '@/lib/prisma';
import { getCurrentOrganizationId } from './context';

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

export async function listDrivers(): Promise<DriverRecord[]> {
    const orgId = await getCurrentOrganizationId();
    return prisma.driver.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
    });
}

export async function getDriver(id: string): Promise<DriverRecord | null> {
    const orgId = await getCurrentOrganizationId();
    return prisma.driver.findFirst({
        where: { id, organizationId: orgId },
    });
}

export interface DriverInput {
    name: string;
    phone?: string | null;
    licenseType?: string | null;
    status?: string;
}

export async function createDriver(input: DriverInput): Promise<DriverRecord> {
    const orgId = await getCurrentOrganizationId();
    return prisma.driver.create({
        data: {
            ...input,
            organizationId: orgId,
        },
    });
}

export async function updateDriver(id: string, input: Partial<DriverInput>): Promise<DriverRecord | null> {
    const orgId = await getCurrentOrganizationId();
    try {
        return await prisma.driver.update({
            where: { id, organizationId: orgId },
            data: input,
        });
    } catch (e) {
        return null;
    }
}

export async function deleteDriver(id: string): Promise<void> {
    const orgId = await getCurrentOrganizationId();
    try {
        await prisma.driver.delete({
            where: { id, organizationId: orgId },
        });
    } catch (e) {
        // Ignore error
    }
}
