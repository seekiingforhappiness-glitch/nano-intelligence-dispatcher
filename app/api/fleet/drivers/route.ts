import { NextRequest, NextResponse } from 'next/server';
import { listDrivers, createDriver, DriverInput } from '@/lib/server/drivers';

export async function GET(req: NextRequest) {
    try {
        const drivers = await listDrivers();
        return NextResponse.json(drivers);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const driver = await createDriver(body as DriverInput);
        return NextResponse.json(driver);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
