import { randomUUID } from 'crypto';
import { getDb } from './db';
import { getDepotConfig } from '@/config/depot';

export interface WarehouseRecord {
  id: string;
  code: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  timeWindowStart: string;
  timeWindowEnd: string;
  capacity?: number | null;
  notes?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

function mapRow(row: any): WarehouseRecord {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    timeWindowStart: row.time_window_start,
    timeWindowEnd: row.time_window_end,
    capacity: row.capacity,
    notes: row.notes,
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listWarehouses(): WarehouseRecord[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM warehouses ORDER BY created_at ASC').all();
  if (rows.length === 0) {
    seedDefaultWarehouse();
    return listWarehouses();
  }
  return rows.map(mapRow);
}

export function getWarehouse(id: string): WarehouseRecord | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(id);
  return row ? mapRow(row) : null;
}

export function getWarehouseByCode(code: string): WarehouseRecord | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM warehouses WHERE code = ?').get(code);
  return row ? mapRow(row) : null;
}

export interface WarehouseInput {
  code?: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  capacity?: number | null;
  notes?: string | null;
  active?: boolean;
}

export function createWarehouse(input: WarehouseInput): WarehouseRecord {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO warehouses
    (id, code, name, address, lat, lng, time_window_start, time_window_end, capacity, notes, active, created_at, updated_at)
    VALUES (@id, @code, @name, @address, @lat, @lng, @timeWindowStart, @timeWindowEnd, @capacity, @notes, @active, @createdAt, @updatedAt)
  `);

  const record = {
    id,
    code: input.code?.trim() || id.slice(0, 8),
    name: input.name.trim(),
    address: input.address.trim(),
    lat: input.lat,
    lng: input.lng,
    timeWindowStart: input.timeWindowStart || '06:00',
    timeWindowEnd: input.timeWindowEnd || '20:00',
    capacity: input.capacity ?? null,
    notes: input.notes ?? null,
    active: (input.active !== false) ? 1 : 0,
    createdAt: now,
    updatedAt: now,
  };

  try {
    stmt.run(record);
  } catch (error) {
    throw error;
  }

  return {
    ...record,
    active: record.active === 1
  };
}

export function updateWarehouse(id: string, input: Partial<WarehouseInput>): WarehouseRecord | null {
  const existing = getWarehouse(id);
  if (!existing) return null;

  const db = getDb();
  const now = new Date().toISOString();

  const newActiveBoolean = input.active ?? existing.active;

  const updated = {
    ...existing,
    code: input.code?.trim() || existing.code,
    name: input.name?.trim() || existing.name,
    address: input.address?.trim() || existing.address,
    lat: input.lat ?? existing.lat,
    lng: input.lng ?? existing.lng,
    timeWindowStart: input.timeWindowStart || existing.timeWindowStart,
    timeWindowEnd: input.timeWindowEnd || existing.timeWindowEnd,
    capacity: input.capacity ?? existing.capacity,
    notes: input.notes ?? existing.notes,
    active: newActiveBoolean ? 1 : 0,
    updatedAt: now,
  };

  db.prepare(
    `UPDATE warehouses SET
      code=@code,
      name=@name,
      address=@address,
      lat=@lat,
      lng=@lng,
      time_window_start=@timeWindowStart,
      time_window_end=@timeWindowEnd,
      capacity=@capacity,
      notes=@notes,
      active=@active,
      updated_at=@updatedAt
    WHERE id=@id`
  ).run(updated);

  return {
    ...updated,
    active: newActiveBoolean
  };
}

export function deleteWarehouse(id: string): void {
  const db = getDb();
  db.prepare('DELETE FROM warehouses WHERE id = ?').run(id);
}

function seedDefaultWarehouse() {
  const depot = getDepotConfig();
  createWarehouse({
    code: depot.id,
    name: depot.name,
    address: depot.address,
    lat: depot.coordinates.lat,
    lng: depot.coordinates.lng,
    timeWindowStart: '06:00',
    timeWindowEnd: '20:00',
    capacity: null,
    notes: '系统默认仓',
    active: true,
  });
}


