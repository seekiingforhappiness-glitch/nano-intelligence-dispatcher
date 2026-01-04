'use client';

import { useEffect, useState } from 'react';

type AdminRole = 'admin' | 'operator' | 'viewer';

interface AdminUserRow {
  id: string;
  username: string;
  role: AdminRole;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<AdminRole>('operator');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users');
      const data = (await res.json()) as { users?: AdminUserRow[]; error?: string };
      if (!res.ok) throw new Error(data.error || '加载失败');
      setUsers(data.users || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    setError(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || '创建失败');
      setNewUsername('');
      setNewPassword('');
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const patch = async (id: string, patchBody: Record<string, unknown>) => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || '更新失败');
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold text-lg">用户管理</h2>
        <button
          onClick={load}
          className="px-3 py-2 rounded-lg bg-dark-700 text-white hover:bg-dark-600"
          disabled={loading}
        >
          {loading ? '刷新中…' : '刷新'}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="bg-dark-800/40 border border-dark-700 rounded-xl p-4">
        <div className="text-white font-medium mb-3">新增用户</div>
        <div className="grid md:grid-cols-4 gap-3">
          <input
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            className="px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white"
            placeholder="用户名"
          />
          <input
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white"
            placeholder="初始密码（至少8位）"
            type="password"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as AdminRole)}
            className="px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white"
          >
            <option value="admin">管理员</option>
            <option value="operator">调度员</option>
            <option value="viewer">只读</option>
          </select>
          <button onClick={create} className="py-2 rounded-lg bg-primary-500 text-dark-900 font-semibold hover:bg-primary-400">
            创建
          </button>
        </div>
        <div className="text-xs text-dark-500 mt-2">
          建议先创建 1 个管理员 + 2~4 个调度员；只读账号用于查看结果与下载。
        </div>
      </div>

      <div className="bg-dark-800/40 border border-dark-700 rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-3 text-xs text-dark-400 border-b border-dark-700">
          <div className="col-span-3">用户名</div>
          <div className="col-span-2">角色</div>
          <div className="col-span-2">状态</div>
          <div className="col-span-3">最近登录</div>
          <div className="col-span-2">操作</div>
        </div>
        {users.map((u) => (
          <div key={u.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm border-b border-dark-700/60">
            <div className="col-span-3 text-white">{u.username}</div>
            <div className="col-span-2 text-dark-200">{u.role}</div>
            <div className="col-span-2 text-dark-200">{u.enabled ? '启用' : '停用'}</div>
            <div className="col-span-3 text-dark-400">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '-'}</div>
            <div className="col-span-2 flex gap-2">
              <button
                onClick={() => patch(u.id, { enabled: !u.enabled })}
                className="px-2 py-1 rounded bg-dark-700 text-white hover:bg-dark-600"
              >
                {u.enabled ? '停用' : '启用'}
              </button>
              <button
                onClick={() => {
                  const pw = window.prompt(`为用户 ${u.username} 设置新密码（至少8位）：`);
                  if (pw && pw.trim().length >= 8) patch(u.id, { newPassword: pw.trim() });
                }}
                className="px-2 py-1 rounded bg-dark-700 text-white hover:bg-dark-600"
              >
                重置密码
              </button>
            </div>
          </div>
        ))}
        {users.length === 0 && <div className="px-4 py-6 text-sm text-dark-400">暂无用户</div>}
      </div>
    </div>
  );
}


