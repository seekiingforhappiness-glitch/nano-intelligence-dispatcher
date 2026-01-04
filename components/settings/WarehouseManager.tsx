'use client';

import { useEffect, useState } from 'react';

interface Warehouse {
  id: string;
  code: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  timeWindowStart: string;
  timeWindowEnd: string;
  notes?: string | null;
  active: boolean;
}

const emptyForm: Partial<Warehouse> = {
  name: '',
  code: '',
  address: '',
  lat: 0,
  lng: 0,
  timeWindowStart: '06:00',
  timeWindowEnd: '20:00',
  notes: '',
  active: true,
};

export function WarehouseManager() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch('/api/warehouses');
      if (!res.ok) {
        throw new Error('加载仓库失败');
      }
      const data = await res.json();
      setWarehouses(data.warehouses || []);
    } catch (err) {
      console.error('load warehouses error', err);
      setError('加载仓库失败，请刷新后重试');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...form,
        lat: Number(form.lat),
        lng: Number(form.lng),
      };
      const url = editingId ? `/api/warehouses/${editingId}` : '/api/warehouses';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '保存失败');
      }
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (warehouse: Warehouse) => {
    setEditingId(warehouse.id);
    setForm({
      ...warehouse,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该仓库？')) return;
    await fetch(`/api/warehouses/${id}`, { method: 'DELETE' });
    if (editingId === id) {
      setEditingId(null);
      setForm(emptyForm);
    }
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">仓库管理</h3>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 rounded-xl border border-dark-700 bg-dark-900/60 p-4">
          <p className="text-sm text-dark-300 mb-2">
            {editingId ? '编辑仓库' : '新增仓库'}
          </p>
          <div className="space-y-2 text-sm">
            <input
              className="w-full rounded-lg bg-dark-800 border border-dark-700 px-3 py-2 text-white"
              placeholder="仓库名称"
              value={form.name || ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className="w-full rounded-lg bg-dark-800 border border-dark-700 px-3 py-2 text-white"
              placeholder="仓库代码（可选）"
              value={form.code || ''}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
            <textarea
              className="w-full rounded-lg bg-dark-800 border border-dark-700 px-3 py-2 text-white"
              placeholder="详细地址"
              value={form.address || ''}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                className="rounded-lg bg-dark-800 border border-dark-700 px-3 py-2 text-white"
                placeholder="经度"
                type="number"
                value={form.lng ?? ''}
                onChange={(e) => setForm({ ...form, lng: Number(e.target.value) })}
              />
              <input
                className="rounded-lg bg-dark-800 border border-dark-700 px-3 py-2 text-white"
                placeholder="纬度"
                type="number"
                value={form.lat ?? ''}
                onChange={(e) => setForm({ ...form, lat: Number(e.target.value) })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                className="rounded-lg bg-dark-800 border border-dark-700 px-3 py-2 text-white"
                placeholder="发车时间"
                value={form.timeWindowStart || ''}
                onChange={(e) => setForm({ ...form, timeWindowStart: e.target.value })}
              />
              <input
                className="rounded-lg bg-dark-800 border border-dark-700 px-3 py-2 text-white"
                placeholder="最晚送达"
                value={form.timeWindowEnd || ''}
                onChange={(e) => setForm({ ...form, timeWindowEnd: e.target.value })}
              />
            </div>
            <textarea
              className="w-full rounded-lg bg-dark-800 border border-dark-700 px-3 py-2 text-white"
              placeholder="备注"
              value={form.notes || ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <div className="flex items-center gap-2 text-dark-300">
              <input
                type="checkbox"
                checked={form.active !== false}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              启用
            </div>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full rounded-lg bg-primary-500 text-dark-900 py-2 font-semibold disabled:opacity-50"
            >
              {editingId ? '保存修改' : '新增仓库'}
            </button>
            {editingId && (
              <button
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
                className="w-full rounded-lg border border-dark-700 py-2 text-dark-200"
              >
                取消编辑
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {warehouses.map((w) => (
            <div
              key={w.id}
              className="rounded-xl border border-dark-700 bg-dark-900/40 p-4 flex flex-col gap-2 text-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold">
                    {w.name}{' '}
                    <span className="text-xs text-dark-400">
                      ({w.code})
                    </span>
                  </p>
                  <p className="text-dark-400 text-xs">
                    {w.timeWindowStart} - {w.timeWindowEnd}
                  </p>
                </div>
                <div className="flex gap-2 text-xs">
                  <button className="text-primary-300" onClick={() => startEdit(w)}>
                    编辑
                  </button>
                  <button className="text-red-300" onClick={() => handleDelete(w.id)}>
                    删除
                  </button>
                </div>
              </div>
              <p className="text-dark-300">{w.address}</p>
              {w.notes && <p className="text-dark-400 text-xs">{w.notes}</p>}
            </div>
          ))}
          {warehouses.length === 0 && (
            <p className="text-dark-400 text-sm">暂无仓库，请先添加。</p>
          )}
        </div>
      </div>
    </div>
  );
}


