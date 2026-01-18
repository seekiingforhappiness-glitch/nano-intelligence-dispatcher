import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin/requireAdmin';
import { listTasks } from '@/lib/store/taskStore';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const tasks = (await listTasks()).map((t) => ({
    taskId: t.taskId,
    status: t.status,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    error: t.error,
    meta: t.meta || null,
    progress: t.progress
      ? {
        stage: t.progress.stage,
        stageName: t.progress.stageName,
        percent: t.progress.percent,
        message: t.progress.message,
      }
      : null,
  }));

  return NextResponse.json({ tasks });
}


