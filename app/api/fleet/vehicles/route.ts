import { NextRequest, NextResponse } from 'next/server';
import { listVehicles, createVehicle, VehicleInput } from '@/lib/server/vehicles';

export async function GET(req: NextRequest) {
    try {
        const vehicles = await listVehicles();
        return NextResponse.json(vehicles);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const vehicle = await createVehicle(body as VehicleInput);
        return NextResponse.json(vehicle);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
