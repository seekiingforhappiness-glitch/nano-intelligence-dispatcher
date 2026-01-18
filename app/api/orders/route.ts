import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentOrganizationId } from '@/lib/server/context';

export async function GET(req: NextRequest) {
    try {
        const orgId = await getCurrentOrganizationId();
        const orders = await prisma.order.findMany({
            where: { organizationId: orgId },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(orders);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
