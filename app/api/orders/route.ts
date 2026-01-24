import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth, AuthContext } from '@/lib/server/authMiddleware';

export const GET = withAuth(async (request: NextRequest, auth: AuthContext) => {
    const orders = await prisma.order.findMany({
        where: { organizationId: auth.organizationId },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(orders);
});
