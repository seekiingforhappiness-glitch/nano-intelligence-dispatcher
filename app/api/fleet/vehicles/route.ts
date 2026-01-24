import { NextRequest, NextResponse } from 'next/server';
import { listVehicles, createVehicle, VehicleInput } from '@/lib/server/vehicles';
import { withAuth, withRole, AuthContext } from '@/lib/server/authMiddleware';

export const GET = withAuth(async (request: NextRequest, auth: AuthContext) => {
    const vehicles = await listVehicles(auth.organizationId);
    return NextResponse.json(vehicles);
});

export const POST = withRole(['admin', 'operator'], async (request: NextRequest, auth: AuthContext) => {
    const body = await request.json();
    const vehicle = await createVehicle(body as VehicleInput, auth.organizationId);
    return NextResponse.json(vehicle);
});
