'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Settings, Info, Trash2, Plus, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VehicleConfig } from '@/types/vehicle';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';

interface AdvancedSettingsProps {
  options: {
    maxStops: number;
    startTime: string;
    deadline: string;
    factoryDeadline: string;
    unloadingMinutes: number;
    costMode: string;
  };
  onOptionsChange: (options: AdvancedSettingsProps['options']) => void;
  vehicles: VehicleConfig[];
  onVehiclesChange: (vehicles: VehicleConfig[]) => void;
}

export function AdvancedSettings({
  options,
  onOptionsChange,
  vehicles,
  onVehiclesChange,
}: AdvancedSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showVehicleConfig, setShowVehicleConfig] = useState(false);
  const vehicleCategories: VehicleConfig['category'][] = ['厢式', '飞翼', '平板', '高栏', '冷藏', '尾板'];
  const numericVehicleFields: (keyof VehicleConfig)[] = ['maxWeightKg', 'palletSlots', 'basePrice', 'pricePerKm'];
  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

  const handleOptionChange = (key: keyof typeof options, value: string | number) => {
    if (key === 'startTime' || key === 'deadline' || key === 'factoryDeadline') {
      const next = String(value).trim();
      const safe = timeRegex.test(next) ? next : (options[key] as string);
      const merged = { ...options, [key]: safe };
      // 规则：司机硬截止 >= 工厂最晚送货
      if (key === 'deadline' && timeRegex.test(merged.factoryDeadline) && merged.deadline < merged.factoryDeadline) {
        merged.deadline = merged.factoryDeadline;
      }
      if (key === 'factoryDeadline' && timeRegex.test(merged.deadline) && merged.deadline < merged.factoryDeadline) {
        merged.deadline = merged.factoryDeadline;
      }
      onOptionsChange(merged);
      return;
    }
    onOptionsChange({ ...options, [key]: value });
  };

  const handleVehicleToggle = (vehicleId: string) => {
    const updated = vehicles.map(v =>
      v.id === vehicleId ? { ...v, enabled: !v.enabled } : v
    );
    onVehiclesChange(updated);
  };

  const handleVehicleFieldChange = (
    vehicleId: string,
    field: keyof VehicleConfig,
    value: string
  ) => {
    const parsedValue = numericVehicleFields.includes(field)
      ? Math.max(0, Number(value) || 0)
      : value;
    const updated = vehicles.map(v =>
      v.id === vehicleId ? { ...v, [field]: parsedValue } : v
    );
    onVehiclesChange(updated);
  };

  const handleVehicleDelete = (vehicleId: string) => {
    const updated = vehicles.filter(v => v.id !== vehicleId);
    onVehiclesChange(updated);
  };

  const handleVehicleAdd = () => {
    const newVehicle: VehicleConfig = {
      id: `temp-${Date.now()}`,
      name: '新车型',
      category: '厢式',
      enabled: true,
      maxWeightKg: 5000,
      palletSlots: 8,
      basePrice: 500,
      pricePerKm: 2,
    };
    onVehiclesChange([...vehicles, newVehicle]);
    setShowVehicleConfig(true);
  };

  return (
    <Card variant="glass" className="overflow-hidden">
      {/* 折叠头部 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <span className="text-white font-medium block">高级配置参数</span>
            <span className="text-slate-500 text-xs">调整调度算法约束、时间窗及车型数据</span>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>

      {/* 展开内容 */}
      {isExpanded && (
        <div className="p-6 pt-0 space-y-8 animate-fade-in border-t border-white/5 mt-2">

          {/* Section: 基础约束 */}
          <div className="space-y-4 pt-4">
            <h4 className="text-sm font-semibold text-white/90 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              基础约束与时间窗
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label>最大串点数</Label>
                <Input
                  type="number"
                  value={options.maxStops}
                  onChange={e => handleOptionChange('maxStops', parseInt(e.target.value) || 8)}
                  min={1}
                  max={20}
                />
                <p className="text-[10px] text-slate-500">单车次最大允许配送的站点数量</p>
              </div>

              <div className="space-y-2">
                <Label>每站卸货时间 (min)</Label>
                <Input
                  type="number"
                  value={options.unloadingMinutes}
                  onChange={e => handleOptionChange('unloadingMinutes', parseInt(e.target.value) || 30)}
                  min={5}
                  max={120}
                  step={5}
                />
              </div>

              <div className="space-y-2">
                <Label>司机最晚收车</Label>
                <Input
                  type="time"
                  value={options.deadline}
                  onChange={e => handleOptionChange('deadline', e.target.value)}
                />
                <p className="text-[10px] text-slate-500">超出此时限将触发风险预警</p>
              </div>

              <div className="space-y-2">
                <Label>工厂最晚送货</Label>
                <Input
                  type="time"
                  value={options.factoryDeadline}
                  onChange={e => handleOptionChange('factoryDeadline', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section: 成本模式 */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-white/90">成本计算模式</h4>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'mileage', label: '起步价 + 里程计费' },
                { value: 'fixed', label: '一口价模式' },
                { value: 'hybrid', label: '混合计价' },
              ].map(mode => (
                <button
                  key={mode.value}
                  onClick={() => handleOptionChange('costMode', mode.value)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                    options.costMode === mode.value
                      ? 'bg-primary/20 border-primary/30 text-primary shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                      : 'bg-black/20 border-white/10 text-slate-400 hover:bg-white/5 hover:border-white/20'
                  )}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section: 车型配置 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white/90">车型资源池</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowVehicleConfig(!showVehicleConfig)}
              >
                {showVehicleConfig ? '收起配置' : '展开详细配置'}
              </Button>
            </div>

            {!showVehicleConfig && (
              <div className="flex flex-wrap gap-2">
                {vehicles.filter(v => v.enabled).map(v => (
                  <Badge key={v.id} variant="tech" className="px-3 py-1">
                    {v.name}
                  </Badge>
                ))}
              </div>
            )}

            {showVehicleConfig && (
              <div className="space-y-3 animate-fade-in">
                {vehicles.map(vehicle => (
                  <div
                    key={vehicle.id}
                    className={cn(
                      'rounded-xl border p-4 transition-all space-y-4',
                      vehicle.enabled
                        ? 'border-primary/20 bg-primary/[0.03]'
                        : 'border-white/5 bg-black/20 opacity-60 grayscale'
                    )}
                  >
                    {/* Compact Row for Name, Type, Toggle, Delete */}
                    <div className="flex items-center gap-4">
                      <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase tracking-wider">车型名称</Label>
                          <Input
                            value={vehicle.name}
                            onChange={e => handleVehicleFieldChange(vehicle.id, 'name', e.target.value)}
                            className="h-8 bg-black/40"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase tracking-wider">类别</Label>
                          <select
                            className="w-full h-8 px-2 bg-black/40 border border-white/10 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-primary/50"
                            value={vehicle.category}
                            onChange={e => handleVehicleFieldChange(vehicle.id, 'category', e.target.value)}
                          >
                            {vehicleCategories.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase tracking-wider">载重 (kg)</Label>
                          <Input
                            type="number"
                            value={vehicle.maxWeightKg}
                            onChange={e => handleVehicleFieldChange(vehicle.id, 'maxWeightKg', e.target.value)}
                            className="h-8 bg-black/40 font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase tracking-wider">里程价 (元/km)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={vehicle.pricePerKm}
                            onChange={e => handleVehicleFieldChange(vehicle.id, 'pricePerKm', e.target.value)}
                            className="h-8 bg-black/40 font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${vehicle.enabled ? 'bg-primary border-primary' : 'border-slate-500 bg-transparent'}`}>
                            {vehicle.enabled && <Plus className="w-3 h-3 text-black rotate-45" />}
                          </div>
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={vehicle.enabled}
                            onChange={() => handleVehicleToggle(vehicle.id)}
                          />
                          <span className="text-xs font-medium text-slate-400 group-hover:text-slate-200">启用</span>
                        </label>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                          onClick={() => handleVehicleDelete(vehicle.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Info className="w-3.5 h-3.5" />
                    <span>系统将根据订单总量自动从启用车型中匹配最优组合</span>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleVehicleAdd}
                    className="gap-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    新增车型
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}


