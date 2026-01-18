import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { parseExcelFile, getSheetData, parseOrders } from '@/lib/parser/excel';
import { cleanOrders } from '@/lib/parser/dataCleaner';
import { scheduleOrders } from '@/lib/scheduler';
import { getDepotConfig, defaultVehicles } from '@/config';
import { FieldMapping, RawOrder } from '@/types/order';
import { ScheduleProgress } from '@/types/schedule';
import { CostMode, VehicleConfig } from '@/types/vehicle';
import { initTask, updateTask, getTask } from '@/lib/store/taskStore';
import { listWarehouses, WarehouseRecord } from '@/lib/server/warehouses';

type WeightFallbackMode = 'disabled' | 'quantity_times_package_size';

interface ScheduleFormOptions {
  maxStops?: number;
  startTime?: string;
  deadline?: string;
  factoryDeadline?: string;
  costMode?: string;
  weightFallbackMode?: WeightFallbackMode;
}

interface WarehouseScheduleConfig {
  warehouseId: string | null;
}

function parseJsonObject<T extends object>(raw: string | null): T {
  if (!raw) return {} as T;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as T;
    }
    return {} as T;
  } catch {
    return {} as T;
  }
}

function parseJsonArray<T>(raw: string | null): T[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed as T[];
    }
    return null;
  } catch {
    return null;
  }
}

function normalizeWeightFallbackMode(v: unknown): WeightFallbackMode {
  if (v === 'quantity_times_package_size') return 'quantity_times_package_size';
  return 'disabled';
}

function normalizeCostMode(v: unknown): CostMode {
  if (v === 'fixed' || v === 'mileage' || v === 'weight' || v === 'hybrid') return v;
  return 'mileage';
}

function applyWeightFallback(rawOrders: RawOrder[], mode: WeightFallbackMode): void {
  if (mode === 'disabled') return;
  for (const o of rawOrders) {
    if (o.weightKg > 0) continue;
    const qty = typeof o.quantity === 'number' ? o.quantity : 0;
    const spec = typeof o.packageSize === 'number' ? o.packageSize : 0;
    if (qty > 0 && spec > 0) {
      o.weightKg = qty * spec;
      o.weightDerivedFrom = 'quantity_times_package_size';
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sheetName = formData.get('sheetName') as string;
    const fieldMappingStr = formData.get('fieldMapping') as string;
    const optionsStr = formData.get('options') as string;
    const vehiclesStr = formData.get('vehicles') as string;

    if (!file) {
      return NextResponse.json({ error: '请上传文件' }, { status: 400 });
    }

    // 解析参数
    const fieldMapping = parseJsonObject<FieldMapping>(fieldMappingStr || null);
    const options = parseJsonObject<ScheduleFormOptions>(optionsStr || null);
    const vehiclesCandidate = parseJsonArray<VehicleConfig>(vehiclesStr || null);
    const vehicles = vehiclesCandidate && vehiclesCandidate.length > 0 ? vehiclesCandidate : defaultVehicles;

    const warehouseId = (formData.get('warehouseId') as string) || null;

    // 生成任务 ID
    const taskId = uuidv4();

    // 初始化任务状态
    await initTask(taskId, {
      fileName: file.name,
      sheetName,
    });

    // 异步执行调度（不阻塞响应）
    processSchedule(taskId, file, sheetName, fieldMapping, options, vehicles, { warehouseId });

    return NextResponse.json({
      success: true,
      taskId,
      message: '调度任务已创建',
    });
  } catch (error) {
    console.error('创建调度任务失败:', error);
    return NextResponse.json(
      { error: '创建任务失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

async function processSchedule(
  taskId: string,
  file: File,
  sheetName: string,
  fieldMapping: FieldMapping,
  options: ScheduleFormOptions,
  vehicles: VehicleConfig[],
  warehouseConfig: WarehouseScheduleConfig
) {
  const task = await getTask(taskId);
  if (!task) return;

  try {
    await updateTask(taskId, { status: 'processing' });

    // 读取文件
    const buffer = await file.arrayBuffer();
    const { workbook, sheetNames } = parseExcelFile(buffer, file.name);
    const sheet = sheetName || sheetNames[0];
    const { rows } = getSheetData(workbook, sheet);

    console.log('📑 字段映射:', fieldMapping);
    console.log('📑 表头示例:', headersPreview(rows));

    // 解析订单
    const rawOrders = parseOrders(rows, fieldMapping);
    console.log('🧾 原始订单示例:', rawOrders.slice(0, 3));

    // 重量默认推导（可选）
    const weightFallbackMode = normalizeWeightFallbackMode(options.weightFallbackMode);
    applyWeightFallback(rawOrders, weightFallbackMode);

    // 数据清洗
    const { cleanedOrders, report } = cleanOrders(rawOrders);

    console.log('🧼 清洗报告:', {
      totalRows: report.totalRows,
      validRows: report.validRows,
      errorRows: report.errorRows,
      firstWarnings: report.warnings.slice(0, 5),
      firstErrors: report.errors.slice(0, 5),
    });

    await updateTask(taskId, {
      meta: {
        ...((await getTask(taskId))?.meta || {}),
        sheetName: sheet,
        totalRows: report.totalRows,
        validRows: report.validRows,
        options: {
          maxStops: typeof options.maxStops === 'number' ? options.maxStops : 8,
          startTime:
            typeof options.startTime === 'string' ? options.startTime : '06:00',
          deadline:
            typeof options.deadline === 'string' ? options.deadline : '20:00',
          factoryDeadline:
            typeof options.factoryDeadline === 'string' ? options.factoryDeadline : '17:00',
          costMode:
            typeof options.costMode === 'string' ? options.costMode : 'mileage',
        },
      },
    });

    if (report.validRows === 0) {
      const top = report.errors.slice(0, 8).map((e) => `第 ${e.rowIndex} 行：${e.message}`).join('；');
      const hint = [
        '没有可排线订单：所有行在校验阶段都无效。',
        '请检查字段映射是否正确，至少需要“地址”。',
        '若没有“重量”列，建议开启“重量缺失时按 数量×规格 推导”，并映射“数量/规格”。',
        top ? `示例错误：${top}` : '',
      ].filter(Boolean).join(' ');
      throw new Error(hint);
    }

    const allWarehouses = await listWarehouses();
    const resolvedWarehouse = resolveSingleWarehouse(warehouseConfig.warehouseId, allWarehouses);
    const warehouseLabel = resolvedWarehouse?.name || getDepotConfig().name;
    const singleResult = await runSingleWarehouseSchedule(
      cleanedOrders,
      resolvedWarehouse,
      options,
      vehicles,
      async (progress) => {
        await updateTask(taskId, {
          progress: {
            ...progress,
            message: `[${warehouseLabel}] ${progress.message}`,
          },
        });
      }
    );

    if (singleResult.status === 'failed') {
      await updateTask(taskId, { status: 'failed', result: singleResult, error: singleResult.error || '调度失败' });
      return;
    }
    await updateTask(taskId, { status: 'completed', result: singleResult, error: null });
  } catch (error) {
    await updateTask(taskId, { status: 'failed', error: (error as Error).message });
    console.error('调度执行失败:', error);
  }
}

function headersPreview(rows: Record<string, unknown>[]): string[] {
  if (!rows || rows.length === 0) {
    return [];
  }
  return Object.keys(rows[0]).slice(0, 12);
}

function resolveSingleWarehouse(
  warehouseId: string | null,
  warehouses: WarehouseRecord[]
): WarehouseRecord | null {
  if (warehouseId) {
    const match = warehouses.find((w) => w.id === warehouseId);
    if (match) return match;
  }
  return warehouses[0] || null;
}

function mergeOptionsWithWarehouse(
  options: ScheduleFormOptions,
  warehouse: WarehouseRecord | null
) {
  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
  const fallbackStart = warehouse?.timeWindowStart || '06:00';
  const fallbackEnd = warehouse?.timeWindowEnd || '20:00';
  const startTime =
    typeof options.startTime === 'string' && timeRegex.test(options.startTime)
      ? options.startTime
      : fallbackStart;
  const deadline =
    typeof options.deadline === 'string' && timeRegex.test(options.deadline)
      ? options.deadline
      : fallbackEnd;
  const factoryDeadline =
    typeof options.factoryDeadline === 'string' && timeRegex.test(options.factoryDeadline)
      ? options.factoryDeadline
      : fallbackEnd;

  return {
    maxStops: typeof options.maxStops === 'number' ? options.maxStops : 8,
    startTime,
    deadline,
    factoryDeadline,
    costMode: normalizeCostMode(options.costMode),
    showMarketReference: true,
  };
}

async function runSingleWarehouseSchedule(
  cleanedOrders: ReturnType<typeof cleanOrders>['cleanedOrders'],
  warehouse: WarehouseRecord | null,
  options: ScheduleFormOptions,
  vehicles: VehicleConfig[],
  onProgress: (progress: ScheduleProgress) => void
) {
  const depot = warehouse
    ? { coordinates: { lng: warehouse.lng, lat: warehouse.lat }, name: warehouse.name }
    : getDepotConfig();

  return scheduleOrders(
    cleanedOrders,
    warehouse
      ? { lng: warehouse.lng, lat: warehouse.lat }
      : depot.coordinates,
    vehicles,
    mergeOptionsWithWarehouse(options, warehouse),
    onProgress
  );
}

// 获取任务状态
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');

  if (!taskId) {
    return NextResponse.json({ error: '缺少 taskId' }, { status: 400 });
  }

  const task = await getTask(taskId);
  if (!task) {
    return NextResponse.json({ error: '任务不存在' }, { status: 404 });
  }

  return NextResponse.json({
    taskId,
    status: task.status,
    progress: task.progress,
    result: task.status === 'completed' ? task.result : null,
    error: task.error,
  });
}


