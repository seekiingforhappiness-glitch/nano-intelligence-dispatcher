'use client';

import { useState, useCallback, useEffect } from 'react';
import { Truck, Zap, MapPin } from 'lucide-react';
import { FileUploader, ProgressPanel, ResultDashboard, AdvancedSettings, FieldMappingPanel } from '@/components';
import { ScheduleResult, ScheduleProgress } from '@/types/schedule';
import { VehicleConfig } from '@/types/vehicle';
import { FieldMapping } from '@/types/order';
import { defaultVehicles } from '@/config';
import { useTaskStore } from '@/store/useTaskStore';

interface Warehouse {
  id: string;
  code: string;
  name: string;
  address: string;
  timeWindowStart: string;
  timeWindowEnd: string;
}

type AppState = 'idle' | 'uploaded' | 'processing' | 'completed' | 'error';

interface UploadParseResult {
  fileName: string;
  rowCount: number;
  sheetNames: string[];
  selectedSheet: string;
  fieldMapping: FieldMapping;
  headers: string[];
  mappingConfidence: number;
}

export default function TasksPage() {
  const [state, setState] = useState<AppState>('idle');
  const [file, setFile] = useState<File | null>(null);

  const [uploadResult, setUploadResult] = useState<UploadParseResult | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [defaultFieldMapping, setDefaultFieldMapping] = useState<FieldMapping>({});
  const [weightFallbackEnabled, setWeightFallbackEnabled] = useState<boolean>(true);

  const [options, setOptions] = useState({
    maxStops: 8,
    startTime: '06:00',
    deadline: '20:00',
    factoryDeadline: '17:00',
    costMode: 'mileage',
  });

  const [vehicles, setVehicles] = useState<VehicleConfig[]>(defaultVehicles);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ScheduleProgress | null>(null);
  const [result, setResult] = useState<ScheduleResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const { setTask: saveTaskResult, setProgress: saveTaskProgress, setError: saveTaskError, clear: clearTaskStore } =
    useTaskStore();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);

  const parseUpload = useCallback(async (selectedFile: File, sheetName?: string): Promise<UploadParseResult> => {
    const formData = new FormData();
    formData.append('file', selectedFile);
    if (sheetName && sheetName.trim().length > 0) {
      formData.append('sheetName', sheetName.trim());
    }

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    const data = (await response.json()) as Partial<UploadParseResult> & { error?: string };
    if (!response.ok) {
      throw new Error(data.error || '上传失败');
    }
    if (!data.fileName || !Array.isArray(data.sheetNames) || !data.selectedSheet || !Array.isArray(data.headers)) {
      throw new Error('文件解析失败：返回数据不完整');
    }
    return {
      fileName: data.fileName,
      rowCount: typeof data.rowCount === 'number' ? data.rowCount : 0,
      sheetNames: data.sheetNames,
      selectedSheet: data.selectedSheet,
      headers: data.headers,
      fieldMapping: (data.fieldMapping || {}) as FieldMapping,
      mappingConfidence: typeof data.mappingConfidence === 'number' ? data.mappingConfidence : 0,
    };
  }, []);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setState('idle');
    setError(null);

    try {
      const parsed = await parseUpload(selectedFile);
      setUploadResult(parsed);
      setSelectedSheet(parsed.selectedSheet);
      setHeaders(parsed.headers);
      setFieldMapping({ ...(parsed.fieldMapping || {}) });
      setDefaultFieldMapping({ ...(parsed.fieldMapping || {}) });
      setWeightFallbackEnabled(true);
      setState('uploaded');
    } catch (err) {
      setError((err as Error).message);
      setState('error');
    }
  }, [parseUpload]);

  const handleClear = useCallback(() => {
    setFile(null);
    setUploadResult(null);
    setSelectedSheet('');
    setHeaders([]);
    setFieldMapping({});
    setDefaultFieldMapping({});
    setWeightFallbackEnabled(true);
    setSelectedWarehouseId(warehouses[0]?.id ?? null);
    setState('idle');
    setTaskId(null);
    setProgress(null);
    setResult(null);
    setError(null);
    clearTaskStore();
  }, [clearTaskStore, warehouses]);

  const handleSheetChange = useCallback(async (nextSheet: string) => {
    if (!file) return;
    const safe = nextSheet.trim();
    if (!safe) return;

    setError(null);
    try {
      const parsed = await parseUpload(file, safe);
      setUploadResult(parsed);
      setSelectedSheet(parsed.selectedSheet);
      setHeaders(parsed.headers);
      setFieldMapping({ ...(parsed.fieldMapping || {}) });
      setDefaultFieldMapping({ ...(parsed.fieldMapping || {}) });
    } catch (err) {
      setError((err as Error).message);
      setState('error');
    }
  }, [file, parseUpload]);

  const handleStartSchedule = useCallback(async () => {
    if (!file || !uploadResult) return;
    if (!fieldMapping.address || String(fieldMapping.address).trim().length === 0) {
      const msg = '请先在字段映射中选择“地址”列（必填）';
      setError(msg);
      saveTaskError(msg);
      setState('error');
      return;
    }
    if (!selectedWarehouseId) {
      const msg = '请选择发货仓';
      setError(msg);
      saveTaskError(msg);
      return;
    }

    setState('processing');
    setProgress(null);
    setResult(null);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('sheetName', selectedSheet || uploadResult.selectedSheet);
    formData.append('fieldMapping', JSON.stringify(fieldMapping));
    formData.append(
      'options',
      JSON.stringify({
        ...options,
        weightFallbackMode: weightFallbackEnabled ? 'quantity_times_package_size' : 'disabled',
      })
    );
    formData.append('vehicles', JSON.stringify(vehicles.filter(v => v.enabled)));
    formData.append('warehouseId', selectedWarehouseId);

    try {
      const response = await fetch('/api/schedule', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '创建任务失败');
      }

      setTaskId(data.taskId);
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      saveTaskError(msg);
      setState('error');
    }
  }, [
    file,
    uploadResult,
    fieldMapping,
    options,
    selectedSheet,
    vehicles,
    weightFallbackEnabled,
    saveTaskError,
    selectedWarehouseId,
  ]);

  useEffect(() => {
    if (!taskId || state !== 'processing') return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/schedule?taskId=${taskId}`);
        const data = await response.json();

        if (data.progress) {
          setProgress(data.progress);
          saveTaskProgress(data.progress);
        }

        if (data.status === 'completed' && data.result) {
          setResult(data.result);
          setState('completed');
          saveTaskResult({ taskId: data.taskId, result: data.result });
          clearInterval(pollInterval);
        } else if (data.status === 'failed') {
          const msg = data.error || '调度失败';
          setError(msg);
          saveTaskError(msg);
          setState('error');
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error('轮询失败:', err);
      }
    }, 1000);

    return () => clearInterval(pollInterval);
  }, [taskId, state, saveTaskProgress, saveTaskResult, saveTaskError]);

  const handleDownload = useCallback(async () => {
    if (!result) return;

    setIsDownloading(true);

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result }),
      });

      if (!response.ok) {
        throw new Error('下载失败');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `排线结果_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsDownloading(false);
    }
  }, [result]);

  useEffect(() => {
    const loadWarehouses = async () => {
      try {
        const res = await fetch('/api/warehouses');
        const data = await res.json();
        const list = (data.warehouses || []) as Warehouse[];
        setWarehouses(list);
        if (list.length > 0) {
          if (!selectedWarehouseId) {
            setSelectedWarehouseId(list[0].id);
          }
        }
      } catch (err) {
        console.error('加载仓库失败:', err);
      }
    };
    if (typeof window !== 'undefined') {
      loadWarehouses();
    }
  }, [selectedWarehouseId]);

  const selectedWarehouse = warehouses.find(w => w.id === selectedWarehouseId);

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">任务调度</h1>
          <div className="flex items-center gap-2 text-dark-400 text-sm bg-dark-800/50 px-3 py-1.5 rounded-full border border-dark-700">
            <MapPin className="w-4 h-4 text-primary-500" />
            <span>{selectedWarehouse?.name || '加载中...'}</span>
          </div>
        </div>

        <main className="space-y-6">
          <section>
            <h2 className="text-lg	font-semibold text-white mb-3">
              📁 上传发货计划表
            </h2>
            <FileUploader
              onFileSelect={handleFileSelect}
              isLoading={state === 'processing'}
              uploadedFile={uploadResult ? {
                name: uploadResult.fileName,
                rowCount: uploadResult.rowCount,
              } : null}
              onClear={handleClear}
            />
          </section>

          {(state === 'uploaded' || state === 'processing' || state === 'completed') && (
            <section className="animate-slide-up">
              <div className="space-y-4">
                {uploadResult && (
                  <FieldMappingPanel
                    sheetNames={uploadResult.sheetNames}
                    selectedSheet={selectedSheet || uploadResult.selectedSheet}
                    onSheetChange={handleSheetChange}
                    headers={headers}
                    value={fieldMapping}
                    defaultValue={defaultFieldMapping}
                    onChange={setFieldMapping}
                    weightFallbackEnabled={weightFallbackEnabled}
                    onWeightFallbackEnabledChange={setWeightFallbackEnabled}
                    mappingConfidence={uploadResult.mappingConfidence}
                    disabled={state === 'processing'}
                  />
                )}
                <AdvancedSettings
                  options={options}
                  onOptionsChange={setOptions}
                  vehicles={vehicles}
                  onVehiclesChange={setVehicles}
                />
                <div className="rounded-xl border border-dark-700 bg-dark-900/40 p-4 space-y-2">
                  <p className="text-white font-semibold">选择发货仓</p>
                  <select
                    value={selectedWarehouseId || ''}
                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                    className="w-full rounded-lg bg-dark-800 border border-dark-700 px-3 py-2 text-white"
                  >
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name}（{wh.code}）
                      </option>
                    ))}
                    {warehouses.length === 0 && <option value="">暂无仓库</option>}
                  </select>
                  <p className="text-xs text-dark-400">仓库列表来自“后台设置 → 仓库管理”。</p>
                </div>
              </div>
            </section>
          )}

          {state === 'uploaded' && (
            <section className="animate-slide-up">
              <button
                onClick={handleStartSchedule}
                className="w-full py-4 bg-gradient-to-r from-primary-600 to-primary-500 
                  hover:from-primary-500 hover:to-primary-400
                  text-dark-900 font-bold text-lg rounded-xl
                  transition-all duration-300 glow-effect
                  flex items-center justify-center gap-2"
              >
                <Zap className="w-5 h-5" />
                开始智能排线
              </button>
            </section>
          )}

          {state === 'processing' && (
            <section className="animate-slide-up">
              <ProgressPanel
                currentStage={progress?.stage || 1}
                percent={progress?.percent || 0}
                message={progress?.message || '正在初始化...'}
                isComplete={false}
              />
            </section>
          )}

          {state === 'completed' && result && (
            <section className="animate-slide-up">
              <ResultDashboard
                result={result}
                onDownload={handleDownload}
                isDownloading={isDownloading}
              />
            </section>
          )}

          {state === 'error' && error && (
            <section className="animate-slide-up">
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-red-400 font-medium">❌ 发生错误</p>
                <p className="text-red-400/70 text-sm mt-1">{error}</p>
                <button
                  onClick={handleClear}
                  className="mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 
                    text-red-400 rounded-lg text-sm transition-colors"
                >
                  重新开始
                </button>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}


