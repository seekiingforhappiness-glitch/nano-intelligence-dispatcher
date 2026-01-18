import prisma from '@/lib/prisma';
import { Driver } from '@prisma/client';
import { getCurrentOrganizationId } from './context';

export type DriverRecord = Driver;

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
