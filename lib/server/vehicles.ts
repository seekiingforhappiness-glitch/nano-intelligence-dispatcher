import prisma from '@/lib/prisma';
import { Vehicle } from '@prisma/client';
import { getCurrentOrganizationId } from './context';

export type VehicleRecord = Vehicle;

export async function listVehicles(): Promise<VehicleRecord[]> {
    const orgId = await getCurrentOrganizationId();
    return prisma.vehicle.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
    });
}

export async function getVehicle(id: string): Promise<VehicleRecord | null> {
    const orgId = await getCurrentOrganizationId();
    return prisma.vehicle.findFirst({
        where: { id, organizationId: orgId },
    });
}

export interface VehicleInput {
    plateNumber: string;
    vehicleType?: string | null;
    capacityWeight?: number | null;
    capacityVolume?: number | null;
    status?: string;
}

export async function createVehicle(input: VehicleInput): Promise<VehicleRecord> {
    const orgId = await getCurrentOrganizationId();
    return prisma.vehicle.create({
        data: {
            ...input,
            organizationId: orgId,
        },
    });
}

export async function updateVehicle(id: string, input: Partial<VehicleInput>): Promise<VehicleRecord | null> {
    const orgId = await getCurrentOrganizationId();
    try {
        return await prisma.vehicle.update({
            where: { id, organizationId: orgId },
            data: input,
        });
    } catch (e) {
        return null;
    }
}

export async function deleteVehicle(id: string): Promise<void> {
    const orgId = await getCurrentOrganizationId();
    try {
        await prisma.vehicle.delete({
            where: { id, organizationId: orgId },
        });
    } catch (e) {
        // Ignore error
    }
}
