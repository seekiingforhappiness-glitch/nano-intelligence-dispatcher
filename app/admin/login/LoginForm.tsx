'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || '登录失败');
      router.replace('/admin');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-dark-800/40 border border-dark-700 rounded-xl p-6">
      <h1 className="text-xl font-semibold text-white">后台管理登录</h1>
      <p className="text-sm text-dark-400 mt-2">
        使用管理员或调度员账号登录（账号由管理员在后台创建）。
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label className="block text-sm text-dark-300 mb-1">用户名</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
            placeholder="例如：admin"
            autoComplete="username"
          />
        </div>
        <div>
          <label className="block text-sm text-dark-300 mb-1">密码</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
            placeholder="至少 8 位"
            autoComplete="current-password"
          />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={loading}
          className="w-full py-3 rounded-lg bg-primary-500 text-dark-900 font-semibold hover:bg-primary-400 disabled:opacity-60"
        >
          {loading ? '登录中...' : '登录'}
        </button>
      </div>
    </div>
  );
}


