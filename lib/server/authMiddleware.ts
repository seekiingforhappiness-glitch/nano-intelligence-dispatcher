import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest, getAdminFromCookies } from '@/lib/admin/requireAdmin';
import type { AdminSessionPayload } from '@/lib/admin/session';

/**
 * 统一权限验证错误
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'INVALID_ORG',
    public status: number = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * 权限验证结果
 */
export interface AuthContext {
  user: AdminSessionPayload;
  organizationId: string;
}

/**
 * 从请求中验证用户身份（用于 Route Handlers）
 * 如果验证失败，直接抛出 AuthError
 */
export function requireAuth(request: NextRequest): AuthContext {
  const admin = getAdminFromRequest(request);

  if (!admin) {
    throw new AuthError('请先登录', 'UNAUTHORIZED', 401);
  }

  if (!admin.organizationId) {
    throw new AuthError('用户未关联组织', 'INVALID_ORG', 403);
  }

  return {
    user: admin,
    organizationId: admin.organizationId,
  };
}

/**
 * 验证用户角色（用于 Route Handlers）
 * @param request Next.js 请求对象
 * @param allowedRoles 允许的角色列表
 */
export function requireRole(
  request: NextRequest,
  allowedRoles: Array<'admin' | 'operator' | 'viewer'>
): AuthContext {
  const auth = requireAuth(request);

  if (!allowedRoles.includes(auth.user.role)) {
    throw new AuthError(
      `权限不足，需要 ${allowedRoles.join(' 或 ')} 角色`,
      'FORBIDDEN',
      403
    );
  }

  return auth;
}

/**
 * 从 Cookies 中验证用户身份（用于 Server Components / Server Actions）
 * 如果验证失败，抛出 AuthError
 */
export function requireAuthFromCookies(): AuthContext {
  const admin = getAdminFromCookies();

  if (!admin) {
    throw new AuthError('请先登录', 'UNAUTHORIZED', 401);
  }

  if (!admin.organizationId) {
    throw new AuthError('用户未关联组织', 'INVALID_ORG', 403);
  }

  return {
    user: admin,
    organizationId: admin.organizationId,
  };
}

/**
 * 可选的身份验证（不抛出错误，返回 null 表示未登录）
 */
export function optionalAuth(request: NextRequest): AuthContext | null {
  try {
    return requireAuth(request);
  } catch {
    return null;
  }
}

/**
 * API 路由包装器 - 自动处理权限验证和错误响应
 *
 * @example
 * ```ts
 * export const GET = withAuth(async (request, auth) => {
 *   const data = await prisma.order.findMany({
 *     where: { organizationId: auth.organizationId }
 *   });
 *   return NextResponse.json(data);
 * });
 * ```
 */
export function withAuth<T extends NextRequest>(
  handler: (request: T, auth: AuthContext) => Promise<NextResponse>
): (request: T) => Promise<NextResponse> {
  return async (request: T) => {
    try {
      const auth = requireAuth(request);
      return await handler(request, auth);
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: error.status }
        );
      }
      // 其他错误交给上层处理或返回 500
      console.error('API Error:', error);
      return NextResponse.json(
        { error: '服务器内部错误' },
        { status: 500 }
      );
    }
  };
}

/**
 * 带角色验证的 API 路由包装器
 */
export function withRole<T extends NextRequest>(
  allowedRoles: Array<'admin' | 'operator' | 'viewer'>,
  handler: (request: T, auth: AuthContext) => Promise<NextResponse>
): (request: T) => Promise<NextResponse> {
  return async (request: T) => {
    try {
      const auth = requireRole(request, allowedRoles);
      return await handler(request, auth);
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: error.status }
        );
      }
      console.error('API Error:', error);
      return NextResponse.json(
        { error: '服务器内部错误' },
        { status: 500 }
      );
    }
  };
}
