import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminFromCookies } from '@/lib/admin/requireAdmin';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = getAdminFromCookies();
  if (!admin) {
    redirect('/admin/login');
  }

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">后台管理</h1>
            <p className="text-sm text-dark-400 mt-1">
              当前用户：{admin.username}（{admin.role}）
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 rounded-lg bg-dark-700 text-white hover:bg-dark-600"
            >
              返回排线
            </Link>
            <form
              action={async () => {
                'use server';
                // 这里不直接用 fetch，避免 edge 限制；前端页面里也有退出按钮
              }}
            />
          </div>
        </header>

        <nav className="flex flex-wrap gap-2 mb-6">
          <Link className="px-3 py-2 rounded-lg bg-dark-800/50 border border-dark-700 hover:border-primary-500/40 text-white" href="/admin">
            概览
          </Link>
          <Link className="px-3 py-2 rounded-lg bg-dark-800/50 border border-dark-700 hover:border-primary-500/40 text-white" href="/admin/tasks">
            任务
          </Link>
          <Link className="px-3 py-2 rounded-lg bg-dark-800/50 border border-dark-700 hover:border-primary-500/40 text-white" href="/admin/users">
            用户
          </Link>
        </nav>

        {children}
      </div>
    </div>
  );
}


