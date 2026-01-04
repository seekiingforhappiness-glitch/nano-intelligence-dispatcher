'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Settings, Info, Trash2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VehicleConfig } from '@/types/vehicle';

interface AdvancedSettingsProps {
  options: {
    maxStops: number;
    startTime: string;
    deadline: string;
    factoryDeadline: string;
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
      // 规则：司机硬截止 >= 工厂最晚送货（避免出现“司机下班但工厂还没关门”的混淆配置）
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
    <div className="bg-dark-800/30 border border-dark-700 rounded-xl overflow-hidden">
      {/* 折叠头部 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-dark-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary-500" />
          <span className="text-white font-medium">高级设置</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-dark-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-dark-400" />
        )}
      </button>

      {/* 展开内容 */}
      {isExpanded && (
        <div className="p-4 pt-0 space-y-4 animate-fade-in">
          {/* 基础参数 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-dark-300 text-sm mb-1.5">最大串点数</label>
              <input
                type="number"
                value={options.maxStops}
                onChange={e => handleOptionChange('maxStops', parseInt(e.target.value) || 8)}
                min={1}
                max={20}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg
                  text-white focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-dark-300 text-sm mb-1.5">发车时间</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="06:00"
                value={options.startTime}
                onChange={e => handleOptionChange('startTime', e.target.value)}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg
                  text-white focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-dark-300 text-sm mb-1.5">司机最晚收车（硬截止）</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="20:00"
                value={options.deadline}
                onChange={e => handleOptionChange('deadline', e.target.value)}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg
                  text-white focus:outline-none focus:border-primary-500 transition-colors"
              />
              <p className="text-xs text-dark-500 mt-1">
                用于标记全局超时（例如司机工作时长）；通常应晚于工厂最晚送货
              </p>
            </div>

            <div>
              <label className="block text-dark-300 text-sm mb-1.5">工厂最晚送货</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="17:00"
                value={options.factoryDeadline}
                onChange={e => handleOptionChange('factoryDeadline', e.target.value)}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg
                  text-white focus:outline-none focus:border-primary-500 transition-colors"
              />
              <p className="text-xs text-dark-500 mt-1">
                未在文档中注明时间窗的订单，会使用该时间作为默认最晚送货时间
              </p>
            </div>
          </div>

          {/* 成本模式 */}
          <div>
            <label className="block text-dark-300 text-sm mb-1.5">成本计算模式</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'mileage', label: '起步价+里程' },
                { value: 'fixed', label: '固定价格' },
                { value: 'hybrid', label: '混合模式' },
              ].map(mode => (
                <button
                  key={mode.value}
                  onClick={() => handleOptionChange('costMode', mode.value)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    options.costMode === mode.value
                      ? 'bg-primary-500 text-dark-900'
                      : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                  )}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* 车型配置 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-dark-300 text-sm">车型配置</label>
              <button
                onClick={() => setShowVehicleConfig(!showVehicleConfig)}
                className="text-primary-400 text-sm hover:underline"
              >
                {showVehicleConfig ? '收起' : '展开配置'}
              </button>
            </div>

            {!showVehicleConfig && (
              <div className="flex flex-wrap gap-2">
                {vehicles.filter(v => v.enabled).map(v => (
                  <span
                    key={v.id}
                    className="px-3 py-1 bg-dark-700 rounded-lg text-sm text-dark-300"
                  >
                    {v.name}
                  </span>
                ))}
              </div>
            )}

            {showVehicleConfig && (
              <div className="bg-dark-700/50 rounded-lg p-4 space-y-4 mt-2">
                {vehicles.map(vehicle => (
                  <div
                    key={vehicle.id}
                    className={cn(
                      'rounded-lg border p-3 space-y-3 transition-all',
                      vehicle.enabled ? 'border-dark-500 bg-dark-600/70' : 'border-dark-700 bg-dark-700/40 opacity-80'
                    )}
                  >
                    <div className="grid md:grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs text-dark-300">车型名称</label>
                        <input
                          className="w-full px-3 py-2 mt-1 bg-dark-800 border border-dark-600 rounded-lg text-white focus:border-primary-500"
                          value={vehicle.name}
                          onChange={e => handleVehicleFieldChange(vehicle.id, 'name', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-dark-300">车型类别</label>
                        <select
                          className="w-full px-3 py-2 mt-1 bg-dark-800 border border-dark-600 rounded-lg text-white focus:border-primary-500"
                          value={vehicle.category}
                          onChange={e => handleVehicleFieldChange(vehicle.id, 'category', e.target.value)}
                        >
                          {vehicleCategories.map(category => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-dark-300">最大载重(kg)</label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 mt-1 bg-dark-800 border border-dark-600 rounded-lg text-white focus:border-primary-500"
                          value={vehicle.maxWeightKg}
                          onChange={e => handleVehicleFieldChange(vehicle.id, 'maxWeightKg', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-dark-300">托盘位</label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 mt-1 bg-dark-800 border border-dark-600 rounded-lg text-white focus:border-primary-500"
                          value={vehicle.palletSlots}
                          onChange={e => handleVehicleFieldChange(vehicle.id, 'palletSlots', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-dark-300">起步价(元)</label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 mt-1 bg-dark-800 border border-dark-600 rounded-lg text-white focus:border-primary-500"
                          value={vehicle.basePrice}
                          onChange={e => handleVehicleFieldChange(vehicle.id, 'basePrice', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-dark-300">里程单价(元/km)</label>
                        <input
                          type="number"
                          step="0.1"
                          className="w-full px-3 py-2 mt-1 bg-dark-800 border border-dark-600 rounded-lg text-white focus:border-primary-500"
                          value={vehicle.pricePerKm}
                          onChange={e => handleVehicleFieldChange(vehicle.id, 'pricePerKm', e.target.value)}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-6">
                        <label className="flex items-center gap-2 text-sm text-dark-300">
                          <input
                            type="checkbox"
                            checked={vehicle.enabled}
                            onChange={() => handleVehicleToggle(vehicle.id)}
                            className="w-4 h-4 accent-primary-500"
                          />
                          本次排线启用
                        </label>
                        <button
                          onClick={() => handleVehicleDelete(vehicle.id)}
                          className="text-red-400 text-sm flex items-center gap-1 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex flex-wrap items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-dark-500">
                    <Info className="w-4 h-4" />
                    <span>取消勾选或删除的车型在本次排线中不会使用</span>
                  </div>
                  <button
                    onClick={handleVehicleAdd}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-dark-600 hover:bg-dark-500 text-white transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    新增车型
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


