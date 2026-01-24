import { getAdminFromCookies } from '../admin/requireAdmin';
import { AuthError } from './authMiddleware';

/**
 * 从 Cookies 获取当前用户的组织 ID
 *
 * 安全设计: 不再提供默认值降级，未认证时直接抛出错误
 * 这确保了所有数据访问都必须经过身份验证
 *
 * @throws {AuthError} 当用户未认证或未关联组织时
 */
export function getCurrentOrganizationId(): string {
    const admin = getAdminFromCookies();

    if (!admin) {
        throw new AuthError('请先登录', 'UNAUTHORIZED', 401);
    }

    if (!admin.organizationId) {
        throw new AuthError('用户未关联组织', 'INVALID_ORG', 403);
    }

    return admin.organizationId;
}

/**
 * 安全获取组织 ID（不抛出错误版本）
 * 返回 null 表示未认证，调用者需要自行处理
 */
export function getOrganizationIdSafe(): string | null {
    try {
        const admin = getAdminFromCookies();
        return admin?.organizationId || null;
    } catch {
        return null;
    }
}
