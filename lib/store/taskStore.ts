import { ScheduleProgress, ScheduleResult } from '@/types/schedule';
import prisma from '@/lib/prisma';
import { getCurrentOrganizationId } from '@/lib/server/context';

// Prisma JSON 类型替代
const JsonNull = null as any;

export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface TaskMeta {
  fileName?: string;
  sheetName?: string;
  totalRows?: number;
  validRows?: number;
  options?: {
    maxStops: number;
    startTime: string;
    deadline: string;
    factoryDeadline: string;
    costMode: string;
  };
  createdBy?: string;
}

export interface TaskRecord {
  status: TaskStatus;
  progress: ScheduleProgress | null;
  result: ScheduleResult | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  meta?: TaskMeta;
}

export async function initTask(taskId: string, meta?: TaskMeta): Promise<void> {
  const orgId = await getCurrentOrganizationId();
  await prisma.task.create({
    data: {
      id: taskId,
      status: 'pending',
      organizationId: orgId,
      meta: meta ? (meta as any) : JsonNull,
      progress: JsonNull,
      result: JsonNull,
    }
  });
}

export async function updateTask(taskId: string, patch: Partial<TaskRecord>): Promise<void> {
  const orgId = await getCurrentOrganizationId();
  try {
    const data: any = {};
    if (patch.status !== undefined) data.status = patch.status;
    if (patch.progress !== undefined) data.progress = patch.progress as any;
    if (patch.result !== undefined) data.result = patch.result as any;
    if (patch.error !== undefined) data.error = patch.error;
    if (patch.meta !== undefined) data.meta = patch.meta as any;

    await prisma.task.update({
      where: { id: taskId, organizationId: orgId },
      data
    });
  } catch (e) {
    // console.error('Failed to update task', e);
  }
}

export async function getTask(taskId: string): Promise<TaskRecord | undefined> {
  const orgId = await getCurrentOrganizationId();
  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId: orgId }
  });

  if (!task) return undefined;

  return {
    status: task.status as TaskStatus,
    progress: task.progress as unknown as ScheduleProgress | null,
    result: task.result as unknown as ScheduleResult | null,
    error: task.error,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    meta: task.meta as unknown as TaskMeta | undefined,
  };
}

export async function listTasks(): Promise<Array<{ taskId: string } & TaskRecord>> {
  const orgId = await getCurrentOrganizationId();
  const tasks = await prisma.task.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'desc' },
    // Limit to recent tasks if needed
    take: 50
  });

  return tasks.map((task: any) => ({
    taskId: task.id,
    status: task.status as TaskStatus,
    progress: task.progress as unknown as ScheduleProgress | null,
    result: task.result as unknown as ScheduleResult | null,
    error: task.error,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    meta: task.meta as unknown as TaskMeta | undefined,
  }));
}
