import { NextRequest, NextResponse } from 'next/server';
import { createWarehouse, listWarehouses, WarehouseInput } from '@/lib/server/warehouses';
import { getAdminFromRequest } from '@/lib/admin/requireAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const warehouses = await listWarehouses();
  return NextResponse.json({ warehouses });
}

export async function POST(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = (await request.json()) as WarehouseInput;
    if (!body.name || !body.address) {
      return NextResponse.json({ error: '仓库名称与地址必填' }, { status: 400 });
    }
    if (typeof body.lat !== 'number' || typeof body.lng !== 'number') {
      return NextResponse.json({ error: '请提供有效的经纬度' }, { status: 400 });
    }
    const warehouse = await createWarehouse(body);
    return NextResponse.json({ warehouse });
  } catch (error) {
    console.error('创建仓库失败', error);
    return NextResponse.json({ error: '创建仓库失败' }, { status: 500 });
  }
}


