'use client';

import { useCallback, useState } from 'react';
import { useExponentialPolling } from '@/hooks/useExponentialPolling';

interface TaskRow {
  taskId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  error: string | null;
  meta: {
    fileName?: string;
    sheetName?: string;
    totalRows?: number;
    validRows?: number;
    options?: Record<string, unknown>;
  } | null;
  progress: { stage: number; stageName: string; percent: number; message: string } | null;
}

export default function AdminTasksPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/tasks');
      const data = (await res.json()) as { tasks?: TaskRow[]; error?: string };
      if (!res.ok) throw new Error(data.error || '加载失败');
      setTasks(data.tasks || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
    return { shouldStop: false };
  }, []);

  // 使用指数退避轮询：初始 1000ms，最大 5000ms
  // 管理员页面轮询间隔可以更长一些
  useExponentialPolling(load, true, {
    initialInterval: 1000,
    maxInterval: 5000,
    backoffMultiplier: 1.3,
    immediate: true,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold text-lg">任务列表</h2>
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

      <div className="bg-dark-800/40 border border-dark-700 rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-3 text-xs text-dark-400 border-b border-dark-700">
          <div className="col-span-2">任务ID</div>
          <div className="col-span-2">文件</div>
          <div className="col-span-2">状态</div>
          <div className="col-span-2">进度</div>
          <div className="col-span-2">更新时间</div>
          <div className="col-span-2">错误</div>
        </div>
        {tasks.length === 0 ? (
          <div className="px-4 py-6 text-sm text-dark-400">暂无任务（先去前台跑一次排线）</div>
        ) : (
          tasks.map((t) => (
            <div key={t.taskId} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm border-b border-dark-700/60">
              <div className="col-span-2 text-white truncate" title={t.taskId}>
                {t.taskId.slice(0, 8)}…
              </div>
              <div className="col-span-2 text-dark-200 truncate" title={t.meta?.fileName || ''}>
                {t.meta?.fileName || '-'}
              </div>
              <div className="col-span-2">
                <span className="px-2 py-1 rounded bg-dark-700 text-dark-200">{t.status}</span>
              </div>
              <div className="col-span-2 text-dark-200">
                {t.progress ? `${t.progress.percent}% ${t.progress.stageName}` : '-'}
              </div>
              <div className="col-span-2 text-dark-400">{new Date(t.updatedAt).toLocaleString()}</div>
              <div className="col-span-2 text-red-300 truncate" title={t.error || ''}>
                {t.error || ''}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


