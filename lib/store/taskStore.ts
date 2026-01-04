import { ScheduleProgress, ScheduleResult } from '@/types/schedule';

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

/**
 * 简易任务存储（内存）。方案 2（密码后台）可用。
 * 生产要支持多实例/重启不丢，需迁移到 Redis/数据库。
 */
import { getDb } from '@/lib/server/db';

/**
 * Tasks persist in SQLite (tasks table).
 */

function safeJsonParse<T>(str: string | null): T | null {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

export function initTask(taskId: string, meta?: TaskMeta): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO tasks (task_id, status, progress, result, error, meta, created_at, updated_at)
    VALUES (@taskId, @status, @progress, @result, @error, @meta, @createdAt, @updatedAt)
  `).run({
    taskId,
    status: 'pending',
    progress: null,
    result: null,
    error: null,
    meta: meta ? JSON.stringify(meta) : null,
    createdAt: now,
    updatedAt: now,
  });
}

export function updateTask(taskId: string, patch: Partial<TaskRecord>): void {
  const db = getDb();
  const existing = getTask(taskId);
  if (!existing) return;

  const now = new Date().toISOString();

  // Prepare values for update. If a field is in patch, use it (and stringify if needed), else keep existing
  // Note: For simple update query building, we can check which fields are present in patch.
  // However, since we have few fields, we can just merge in JS and update all (or use dynamic query).
  // Let's use a dynamic merge approach for clarity or just specific updates. 
  // Given we just need to update what's changed.

  // Actually simplest way with better-sqlite3 for partial updates without writing dynamic SQL builder 
  // is to just load, merge, and save, OR write a dynamic set clause.
  // Let's go with dynamic SET clause construction for efficiency/correctness.

  const fields: string[] = [];
  const values: any = { taskId, updatedAt: now };

  if (patch.status !== undefined) {
    fields.push('status = @status');
    values.status = patch.status;
  }
  if (patch.progress !== undefined) {
    fields.push('progress = @progress');
    values.progress = patch.progress ? JSON.stringify(patch.progress) : null;
  }
  if (patch.result !== undefined) {
    fields.push('result = @result');
    values.result = patch.result ? JSON.stringify(patch.result) : null;
  }
  if (patch.error !== undefined) {
    fields.push('error = @error');
    values.error = patch.error;
  }
  if (patch.meta !== undefined) {
    fields.push('meta = @meta');
    values.meta = patch.meta ? JSON.stringify(patch.meta) : null;
  }

  fields.push('updated_at = @updatedAt');

  if (fields.length > 1) { // always has updated_at
    const sql = `UPDATE tasks SET ${fields.join(', ')} WHERE task_id = @taskId`;
    db.prepare(sql).run(values);
  }
}

export function getTask(taskId: string): TaskRecord | undefined {
  const db = getDb();
  const row = db.prepare('SELECT * FROM tasks WHERE task_id = ?').get(taskId) as any;
  if (!row) return undefined;

  return {
    status: row.status as TaskStatus,
    progress: safeJsonParse(row.progress),
    result: safeJsonParse(row.result),
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    meta: safeJsonParse(row.meta) || undefined,
  };
}

export function listTasks(): Array<{ taskId: string } & TaskRecord> {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all() as any[];

  return rows.map(row => ({
    taskId: row.task_id,
    status: row.status as TaskStatus,
    progress: safeJsonParse(row.progress),
    result: safeJsonParse(row.result),
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    meta: safeJsonParse(row.meta) || undefined,
  }));
}


