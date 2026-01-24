import { NextRequest, NextResponse } from 'next/server';
import { deleteWarehouse, getWarehouse, updateWarehouse, WarehouseInput } from '@/lib/server/warehouses';
import { withAuth, withRole, AuthContext } from '@/lib/server/authMiddleware';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: { id: string } };

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { requireAuth } = await import('@/lib/server/authMiddleware');
    const auth = requireAuth(request);

    const warehouse = await getWarehouse(params.id, auth.organizationId);
    if (!warehouse) {
      return NextResponse.json({ error: '仓库不存在' }, { status: 404 });
    }
    return NextResponse.json({ warehouse });
  } catch (error: any) {
    if (error.code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: '获取仓库失败' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { requireRole } = await import('@/lib/server/authMiddleware');
    const auth = requireRole(request, ['admin', 'operator']);

    const body = (await request.json()) as Partial<WarehouseInput>;
    const warehouse = await updateWarehouse(params.id, body, auth.organizationId);
    if (!warehouse) {
      return NextResponse.json({ error: '仓库不存在' }, { status: 404 });
    }
    return NextResponse.json({ warehouse });
  } catch (error: any) {
    if (error.code === 'UNAUTHORIZED' || error.code === 'FORBIDDEN') {
      return NextResponse.json({ error: error.message }, { status: error.status || 401 });
    }
    console.error('更新仓库失败', error);
    return NextResponse.json({ error: '更新仓库失败' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { requireRole } = await import('@/lib/server/authMiddleware');
    const auth = requireRole(request, ['admin']);

    await deleteWarehouse(params.id, auth.organizationId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === 'UNAUTHORIZED' || error.code === 'FORBIDDEN') {
      return NextResponse.json({ error: error.message }, { status: error.status || 401 });
    }
    console.error('删除仓库失败', error);
    return NextResponse.json({ error: '删除仓库失败' }, { status: 500 });
  }
}
