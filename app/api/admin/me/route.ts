import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin/requireAdmin';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  return NextResponse.json({ user: admin });
}


