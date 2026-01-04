import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin/requireAdmin';
import { createAdminUser, listAdminUsers } from '@/lib/server/adminUsers';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: '未登录' }, { status: 401 });
  if (admin.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 });
  const users = await listAdminUsers();
  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  try {
    const admin = getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: '未登录' }, { status: 401 });
    if (admin.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 });

    const body = (await request.json()) as {
      username?: string;
      role?: 'admin' | 'operator' | 'viewer';
      password?: string;
    };
    const username = String(body.username || '').trim();
    const role = (body.role || 'operator') as 'admin' | 'operator' | 'viewer';
    const password = String(body.password || '').trim();

    const user = await createAdminUser({ username, role, password });
    return NextResponse.json({ success: true, user });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}


