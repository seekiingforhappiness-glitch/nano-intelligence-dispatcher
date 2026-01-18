import path from 'path';
import { ensureDataDir } from './dataDir';
import { readJsonFile, writeJsonFile } from './jsonFile';
import { hashPassword, verifyPassword, PasswordHash } from '@/lib/admin/password';
import crypto from 'crypto';

export type AdminRole = 'admin' | 'operator' | 'viewer';

export interface AdminUser {
  id: string;
  username: string;
  organizationId: string;
  role: AdminRole;
  password: PasswordHash;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

interface AdminUserFile {
  version: 1;
  users: AdminUser[];
}

function nowIso(): string {
  return new Date().toISOString();
}

function usersFilePath(dataDir: string): string {
  return path.join(dataDir, 'admin-users.json');
}

async function loadFile(): Promise<{ dataDir: string; data: AdminUserFile }> {
  const dataDir = await ensureDataDir();
  const fp = usersFilePath(dataDir);
  const data = await readJsonFile<AdminUserFile>(fp, { version: 1, users: [] });
  return { dataDir, data };
}

async function saveFile(dataDir: string, data: AdminUserFile): Promise<void> {
  await writeJsonFile(usersFilePath(dataDir), data);
}

export async function ensureBootstrapAdmin(): Promise<void> {
  const username = process.env.ADMIN_BOOTSTRAP_USERNAME?.trim() || 'admin';
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim();
  if (!password) return;

  const { dataDir, data } = await loadFile();
  const exists = data.users.some((u) => u.username === username);
  if (exists) return;

  const user: AdminUser = {
    id: crypto.randomUUID(),
    username,
    organizationId: 'demo-org-001',
    role: 'admin',
    password: hashPassword(password),
    enabled: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  data.users.push(user);
  await saveFile(dataDir, data);
}

export async function authenticateAdminUser(
  username: string,
  password: string
): Promise<AdminUser | null> {
  await ensureBootstrapAdmin();
  const { dataDir, data } = await loadFile();
  const user = data.users.find((u) => u.username === username);
  if (!user || !user.enabled) return null;
  if (!verifyPassword(password, user.password)) return null;
  user.lastLoginAt = nowIso();
  user.updatedAt = nowIso();
  await saveFile(dataDir, data);
  return user;
}

export async function listAdminUsers(): Promise<Array<Omit<AdminUser, 'password'>>> {
  await ensureBootstrapAdmin();
  const { data } = await loadFile();
  return data.users.map(({ password: _pw, ...rest }) => rest);
}

export async function createAdminUser(input: {
  username: string;
  role: AdminRole;
  password: string;
}): Promise<Omit<AdminUser, 'password'>> {
  await ensureBootstrapAdmin();
  const { dataDir, data } = await loadFile();
  const username = input.username.trim();
  if (!username) throw new Error('用户名不能为空');
  if (data.users.some((u) => u.username === username)) throw new Error('用户名已存在');
  if (input.password.trim().length < 8) throw new Error('密码至少 8 位');

  const user: AdminUser = {
    id: crypto.randomUUID(),
    username,
    organizationId: 'demo-org-001', // TODO: allow specifying orgId
    role: input.role,
    password: hashPassword(input.password),
    enabled: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  data.users.push(user);
  await saveFile(dataDir, data);
  const { password: _pw, ...rest } = user;
  return rest;
}

export async function setAdminUserEnabled(userId: string, enabled: boolean): Promise<void> {
  await ensureBootstrapAdmin();
  const { dataDir, data } = await loadFile();
  const u = data.users.find((x) => x.id === userId);
  if (!u) throw new Error('用户不存在');
  u.enabled = enabled;
  u.updatedAt = nowIso();
  await saveFile(dataDir, data);
}

export async function resetAdminUserPassword(userId: string, newPassword: string): Promise<void> {
  await ensureBootstrapAdmin();
  if (newPassword.trim().length < 8) throw new Error('密码至少 8 位');
  const { dataDir, data } = await loadFile();
  const u = data.users.find((x) => x.id === userId);
  if (!u) throw new Error('用户不存在');
  u.password = hashPassword(newPassword);
  u.updatedAt = nowIso();
  await saveFile(dataDir, data);
}


