import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin/requireAdmin';
import { resetAdminUserPassword, setAdminUserEnabled } from '@/lib/server/adminUsers';

export const runtime = 'nodejs';

export async function PATCH(request: NextRequest, ctx: { params: { id: string } }) {
  try {
    const admin = getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: '未登录' }, { status: 401 });
    if (admin.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 });

    const userId = ctx.params.id;
    const body = (await request.json()) as { enabled?: boolean; newPassword?: string };

    if (typeof body.enabled === 'boolean') {
      await setAdminUserEnabled(userId, body.enabled);
    }
    if (typeof body.newPassword === 'string' && body.newPassword.trim().length > 0) {
      await resetAdminUserPassword(userId, body.newPassword);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}


