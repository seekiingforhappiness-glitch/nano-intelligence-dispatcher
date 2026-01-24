import { NextRequest, NextResponse } from 'next/server';
import { createWarehouse, listWarehouses, WarehouseInput } from '@/lib/server/warehouses';
import { withAuth, withRole, optionalAuth, AuthContext } from '@/lib/server/authMiddleware';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/warehouses
 * 获取仓库列表 - 需要认证
 */
export const GET = withAuth(async (request: NextRequest, auth: AuthContext) => {
  try {
    const warehouses = await listWarehouses(auth.organizationId);
    return NextResponse.json({ warehouses });
  } catch (error) {
    console.error('获取仓库列表失败:', error);
    return NextResponse.json(
      { warehouses: [], error: (error as Error).message },
      { status: 500 }
    );
  }
});

/**
 * POST /api/warehouses
 * 创建仓库 - 需要 admin 或 operator 角色
 */
export const POST = withRole(['admin', 'operator'], async (request: NextRequest, auth: AuthContext) => {
  try {
    const body = (await request.json()) as WarehouseInput;

    if (!body.name || !body.address) {
      return NextResponse.json({ error: '仓库名称与地址必填' }, { status: 400 });
    }
    if (typeof body.lat !== 'number' || typeof body.lng !== 'number') {
      return NextResponse.json({ error: '请提供有效的经纬度' }, { status: 400 });
    }

    const warehouse = await createWarehouse(body, auth.organizationId);
    return NextResponse.json({ warehouse });
  } catch (error) {
    console.error('创建仓库失败', error);
    return NextResponse.json({
      error: '创建仓库失败',
      details: (error as Error).message
    }, { status: 500 });
  }
});
