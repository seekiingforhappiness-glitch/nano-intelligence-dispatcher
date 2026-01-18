import { getAdminFromCookies } from '../admin/requireAdmin';

export async function getCurrentOrganizationId(): Promise<string> {
    try {
        const admin = getAdminFromCookies();
        if (admin?.organizationId) {
            return admin.organizationId;
        }
    } catch (e) {
        // Silently ignore and fallback
    }

    // Fallback for development/bootstrap
    return "demo-org-001";
}
