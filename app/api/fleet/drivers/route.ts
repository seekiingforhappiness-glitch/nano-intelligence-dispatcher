import { NextRequest, NextResponse } from 'next/server';
import { listDrivers, createDriver, DriverInput } from '@/lib/server/drivers';
import { withAuth, withRole, AuthContext } from '@/lib/server/authMiddleware';

export const GET = withAuth(async (request: NextRequest, auth: AuthContext) => {
    const drivers = await listDrivers(auth.organizationId);
    return NextResponse.json(drivers);
});

export const POST = withRole(['admin', 'operator'], async (request: NextRequest, auth: AuthContext) => {
    const body = await request.json();
    const driver = await createDriver(body as DriverInput, auth.organizationId);
    return NextResponse.json(driver);
});
