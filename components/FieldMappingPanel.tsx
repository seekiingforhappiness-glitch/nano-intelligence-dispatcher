'use client';

import { useMemo } from 'react';
import { RotateCcw, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FieldMapping } from '@/types/order';

type FieldKey = keyof FieldMapping;

interface FieldDef {
  key: FieldKey;
  label: string;
  required: boolean;
  hint: string;
}

const FIELDS: FieldDef[] = [
  { key: 'orderId', label: '送货单号', required: false, hint: '可留空（会用行号代替）' },
  { key: 'shipDate', label: '发货日期', required: false, hint: '可留空' },
  { key: 'deliveryDate', label: '到货日期', required: false, hint: '可留空（会使用默认时间窗）' },
  { key: 'customerName', label: '送达方', required: false, hint: '可留空（仅影响展示）' },
  { key: 'address', label: '地址', required: true, hint: '必须有，否则无法解析坐标' },
  { key: 'weightKg', label: '重量(kg)', required: false, hint: '可留空（可用默认规则推导）' },
  { key: 'quantity', label: '数量', required: false, hint: '用于重量推导（数量 × 规格）' },
  { key: 'packageSize', label: '规格', required: false, hint: '常见为 25（kg/件），用于重量推导' },
  { key: 'requirementsRaw', label: '运输商发货要求', required: false, hint: '用于解析约束' },
];

interface FieldMappingPanelProps {
  sheetNames: string[];
  selectedSheet: string;
  onSheetChange: (sheetName: string) => void;
  headers: string[];
  value: FieldMapping;
  defaultValue: FieldMapping;
  onChange: (next: FieldMapping) => void;
  weightFallbackEnabled: boolean;
  onWeightFallbackEnabledChange: (enabled: boolean) => void;
  mappingConfidence?: number;
  disabled?: boolean;
}

function isNonEmptyString(v: string): boolean {
  return v.trim().length > 0;
}

type HintLevel = 'error' | 'warn' | 'info' | 'ok';

interface Hint {
  level: HintLevel;
  title: string;
  details: string;
}

function looksLikeMojibakeHeader(h: string): boolean {
  // 常见特征：UTF-8 被错误按 Latin1 显示，会出现 "Ã" "Â" "Ã¥" 等
  // 这里用保守规则：包含大量 "Ã" 或 "\uFFFD"（替换字符）
  const s = String(h);
  const countA = (s.match(/Ã/g) || []).length;
  const countBad = (s.match(/\uFFFD/g) || []).length;
  return countA >= 2 || countBad > 0;
}

export function FieldMappingPanel({
  sheetNames,
  selectedSheet,
  onSheetChange,
  headers,
  value,
  defaultValue,
  onChange,
  weightFallbackEnabled,
  onWeightFallbackEnabledChange,
  mappingConfidence = 0,
  disabled = false,
}: FieldMappingPanelProps) {
  const missingRequired = useMemo(() => {
    const missing: FieldKey[] = [];
    for (const f of FIELDS) {
      if (!f.required) continue;
      const col = value[f.key];
      if (!col || !isNonEmptyString(col)) {
        missing.push(f.key);
      }
    }
    return missing;
  }, [value]);

  const hasWeightColumn = Boolean(value.weightKg && isNonEmptyString(value.weightKg));
  const canDeriveWeight =
    weightFallbackEnabled &&
    Boolean(value.quantity && isNonEmptyString(value.quantity)) &&
    Boolean(value.packageSize && isNonEmptyString(value.packageSize));

  const duplicateMapping = useMemo(() => {
    const map: Record<string, FieldKey[]> = {};
    for (const f of FIELDS) {
      const col = value[f.key];
      if (!col || !isNonEmptyString(col)) continue;
      map[col] = map[col] ? [...map[col], f.key] : [f.key];
    }
    return Object.entries(map)
      .filter(([, keys]) => keys.length > 1)
      .map(([col, keys]) => ({ col, keys }));
  }, [value]);

  const hints = useMemo(() => {
    const out: Hint[] = [];

    // 1) 必填字段
    if (missingRequired.length > 0) {
      out.push({
        level: 'error',
        title: '缺少必填字段映射',
        details: `至少需要映射“地址”。当前缺少：${missingRequired.join('、')}。`,
      });
    } else {
      out.push({
        level: 'ok',
        title: '必填字段已满足',
        details: '已映射地址列，可以开始排线。',
      });
    }

    // 2) 重量策略
    if (!hasWeightColumn) {
      if (!weightFallbackEnabled) {
        out.push({
          level: 'warn',
          title: '未映射重量列，且已关闭默认重量推导',
          details: '若源表没有重量列，建议开启“重量缺失默认推导”，并映射“数量/规格”。',
        });
      } else if (!canDeriveWeight) {
        out.push({
          level: 'warn',
          title: '重量将无法推导',
          details: '你未映射重量列；默认推导已开启，但还缺“数量”或“规格”映射，建议补齐。',
        });
      } else {
        out.push({
          level: 'info',
          title: '重量将使用默认推导',
          details: '未映射重量列时，会按 “数量 × 规格” 生成重量(kg)。',
        });
      }
    } else {
      out.push({
        level: 'info',
        title: '已映射重量列',
        details: '将优先使用重量列；当重量为 0 时（若启用推导）会使用默认规则补齐。',
      });
    }

    // 3) 重复映射
    if (duplicateMapping.length > 0) {
      const examples = duplicateMapping
        .slice(0, 2)
        .map((d) => `${d.col} → ${d.keys.join('、')}`)
        .join('；');
      out.push({
        level: 'warn',
        title: '检测到重复映射',
        details:
          `同一列被映射到多个字段，可能导致数据错位。示例：${examples}` +
          (duplicateMapping.length > 2 ? `（另有 ${duplicateMapping.length - 2} 处）` : ''),
      });
    }

    // 4) 识别置信度/疑似乱码
    const hasMojibake = headers.some(looksLikeMojibakeHeader);
    if (hasMojibake) {
      out.push({
        level: 'warn',
        title: '表头疑似乱码/编码异常',
        details: '建议切换工作表或重新导出为 UTF-8 CSV / 标准 xlsx；也可手动完成字段映射后再排线。',
      });
    } else if (mappingConfidence > 0 && mappingConfidence < 0.45) {
      out.push({
        level: 'info',
        title: '自动识别置信度偏低',
        details: `当前置信度约 ${(mappingConfidence * 100).toFixed(0)}%。建议重点确认“地址/数量/规格/重量”等映射是否正确。`,
      });
    }

    return out;
  }, [canDeriveWeight, duplicateMapping, hasWeightColumn, headers, mappingConfidence, missingRequired, weightFallbackEnabled]);

  return (
    <div className="bg-dark-800/30 border border-dark-700 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-dark-700 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-white font-medium">字段映射（可直接用默认值，也可手动调整）</div>
          <div className="text-xs text-dark-400 mt-1">
            关键字段：<span className="text-dark-300">地址</span> 必填；重量可选（支持默认推导）。
          </div>
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange({ ...defaultValue })}
          className={cn(
            'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
            'bg-dark-700 hover:bg-dark-600 text-dark-100 border border-dark-600',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <RotateCcw className="w-4 h-4" />
          恢复默认映射
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* 检测提示 */}
        <div className="space-y-2">
          {hints.map((h, idx) => {
            const style =
              h.level === 'error'
                ? 'bg-red-500/10 border-red-500/30 text-red-300'
                : h.level === 'warn'
                ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
                : h.level === 'ok'
                ? 'bg-green-500/10 border-green-500/30 text-green-300'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-300';

            const Icon =
              h.level === 'error' || h.level === 'warn'
                ? AlertTriangle
                : h.level === 'ok'
                ? CheckCircle2
                : Info;

            return (
              <div key={`${h.level}:${idx}`} className={cn('border rounded-lg p-3 flex gap-3', style)}>
                <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-sm font-medium">{h.title}</div>
                  <div className="text-xs opacity-90 mt-1 break-words">{h.details}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 工作表选择 */}
        {sheetNames.length > 1 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="block text-dark-300 text-sm mb-1.5">工作表</label>
              <select
                disabled={disabled}
                value={selectedSheet}
                onChange={(e) => onSheetChange(e.target.value)}
                className={cn(
                  'w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white',
                  'focus:outline-none focus:border-primary-500 transition-colors',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {sheetNames.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xs text-dark-500">
              切换后会重新解析并刷新默认映射。
            </div>
          </div>
        )}

        {/* 重量推导 */}
        <div className="flex items-start gap-3 p-3 bg-dark-700/40 border border-dark-600 rounded-lg">
          <input
            id="weightFallbackEnabled"
            type="checkbox"
            className="mt-1 w-4 h-4 accent-primary-500"
            checked={weightFallbackEnabled}
            disabled={disabled}
            onChange={(e) => onWeightFallbackEnabledChange(e.target.checked)}
          />
          <label htmlFor="weightFallbackEnabled" className="flex-1">
            <div className="text-sm text-white">重量缺失时使用默认值（推荐）</div>
            <div className="text-xs text-dark-400 mt-1">
              规则：当“重量列”未映射或解析为 0 时，按 <span className="text-dark-200">数量 × 规格</span> 计算重量（kg）。
            </div>
          </label>
        </div>

        {/* 字段映射表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {FIELDS.map((f) => {
            const current = value[f.key] || '';
            const isMissing = missingRequired.includes(f.key);

            return (
              <div
                key={f.key}
                className={cn(
                  'p-3 rounded-lg border bg-dark-800/40',
                  isMissing ? 'border-red-500/40' : 'border-dark-600'
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-sm text-white">
                    {f.label}
                    {f.required && <span className="text-red-400 ml-1">*</span>}
                  </div>
                  <div className="text-xs text-dark-500">{f.hint}</div>
                </div>

                <select
                  disabled={disabled}
                  value={current}
                  onChange={(e) => {
                    const next = { ...value };
                    const v = e.target.value.trim();
                    if (v.length === 0) {
                      delete next[f.key];
                    } else {
                      next[f.key] = v;
                    }
                    onChange(next);
                  }}
                  className={cn(
                    'w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white',
                    'focus:outline-none focus:border-primary-500 transition-colors',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <option value="">（未映射）</option>
                  {headers.map((h) => (
                    <option key={`${f.key}:${h}`} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}


