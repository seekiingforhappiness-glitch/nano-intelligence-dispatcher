import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdminUser } from '@/lib/server/adminUsers';
import { signAdminSession } from '@/lib/admin/session';
import { ADMIN_COOKIE_NAME } from '@/lib/admin/requireAdmin';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { username?: string; password?: string };
    const username = String(body.username || '').trim();
    const password = String(body.password || '').trim();

    if (!username || !password) {
      return NextResponse.json({ error: '请输入用户名和密码' }, { status: 400 });
    }

    const user = await authenticateAdminUser(username, password);
    if (!user) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
    }

    const token = signAdminSession(
      {
        userId: user.id,
        username: user.username,
        organizationId: user.organizationId,
        role: user.role
      },
      12 * 60 * 60
    );

    const res = NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username, role: user.role },
    });

    res.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 12 * 60 * 60,
    });

    return res;
  } catch (error) {
    console.error('admin login failed:', error);
    return NextResponse.json({ error: '登录失败' }, { status: 500 });
  }
}


