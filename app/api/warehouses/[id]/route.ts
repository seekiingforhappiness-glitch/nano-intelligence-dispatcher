import { NextRequest, NextResponse } from 'next/server';
import { deleteWarehouse, getWarehouse, updateWarehouse, WarehouseInput } from '@/lib/server/warehouses';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const warehouse = getWarehouse(params.id);
  if (!warehouse) {
    return NextResponse.json({ error: '仓库不存在' }, { status: 404 });
  }
  return NextResponse.json({ warehouse });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = (await request.json()) as Partial<WarehouseInput>;
    const warehouse = updateWarehouse(params.id, body);
    if (!warehouse) {
      return NextResponse.json({ error: '仓库不存在' }, { status: 404 });
    }
    return NextResponse.json({ warehouse });
  } catch (error) {
    console.error('更新仓库失败', error);
    return NextResponse.json({ error: '更新仓库失败' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  deleteWarehouse(params.id);
  return NextResponse.json({ success: true });
}


