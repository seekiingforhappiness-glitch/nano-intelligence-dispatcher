import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { verifyAdminSession, type AdminSessionPayload } from './session';

export const ADMIN_COOKIE_NAME = 'nm_admin';

export function getAdminFromCookies(): AdminSessionPayload | null {
  const token = cookies().get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminSession(token);
}

export function getAdminFromRequest(request: NextRequest): AdminSessionPayload | null {
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminSession(token);
}


