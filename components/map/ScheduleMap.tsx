'use client';

import { useEffect, useRef, useState } from 'react';
import { useTaskStore } from '@/store/useTaskStore';
import { Layers, ChevronRight, ChevronLeft, Map as MapIcon, RotateCcw, Box, Truck } from 'lucide-react';

// 高对比度颜色，便于区分不同车次
const COLORS = [
  '#3B82F6', '#10B981', '#F97316', '#EC4899', '#A855F7',
  '#14B8A6', '#EAB308', '#EF4444', '#6366F1', '#84CC16'
];

// 默认仓库坐标
const DEFAULT_DEPOT = {
  lng: 121.2367,
  lat: 31.2156,
  name: '江苏金发科技生产基地',
};

declare global {
  interface Window {
    _AMapSecurityConfig: {
      securityJsCode: string;
    };
    Loca: any;
  }
}

export function ScheduleMap() {
  const mapRef = useRef<any>(null);
  const locaRef = useRef<any>(null);
  const { scheduleResult } = useTaskStore();
  const [selectedTrips, setSelectedTrips] = useState<Set<number>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const AMapRef = useRef<any>(null);

  // 初始化地图与 Loca
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let mapInstance: any = null;

    window._AMapSecurityConfig = {
      securityJsCode: process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE || '',
    };

    import('@amap/amap-jsapi-loader').then((AMapLoader) => {
      AMapLoader.default.load({
        key: process.env.NEXT_PUBLIC_AMAP_JS_KEY || '',
        version: '2.0',
        plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.ControlBar'],
        Loca: {
          version: '2.0.0'
        }
      })
        .then((AMap: any) => {
          AMapRef.current = AMap;
          mapInstance = new AMap.Map('schedule-map-container', {
            viewMode: '3D',
            pitch: 50,
            rotation: 0,
            zoom: 11,
            center: [DEFAULT_DEPOT.lng, DEFAULT_DEPOT.lat],
            mapStyle: 'amap://styles/darkblue',
            skyColor: '#0b0b14',
          });

          // 初始化 Loca
          const loca = new window.Loca.Container({
            map: mapInstance,
          });

          // 添加光照系统
          loca.ambLight = {
            intensity: 0.7,
            color: '#7b7bff',
          };
          loca.dirLight = {
            intensity: 0.8,
            color: '#fff',
            target: [0, 0, 0],
            position: [0, -1, 1],
          };
          loca.pointLight = {
            color: 'rgb(100,100,255)',
            position: [DEFAULT_DEPOT.lng, DEFAULT_DEPOT.lat, 2000],
            intensity: 3,
            distance: 10000,
          };

          mapInstance.addControl(new AMap.ToolBar({ position: 'RB' }));

          mapRef.current = mapInstance;
          locaRef.current = loca;
          setMapLoaded(true);
        })
        .catch((error: any) => {
          console.error('加载高德地图 Loca 失败', error);
        });
    });

    return () => {
      if (mapInstance) {
        mapInstance.destroy();
      }
    };
  }, []);

  // 渲染可视化层
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !locaRef.current || !AMapRef.current || !scheduleResult) return;

    const AMap = AMapRef.current;
    const map = mapRef.current;
    const loca = locaRef.current;

    // 清空现有图层
    loca.clear();
    map.clearMap();

    const tripsToRender = isAllSelected
      ? scheduleResult.trips
      : scheduleResult.trips.filter((_: any, idx: number) => selectedTrips.has(idx));

    // 1. 渲染仓库 (AMap Marker for interaction)
    const depotMarker = new AMap.Marker({
      position: [DEFAULT_DEPOT.lng, DEFAULT_DEPOT.lat],
      title: DEFAULT_DEPOT.name,
      offset: new AMap.Pixel(-24, -48),
      content: `
        <div class="relative group">
          <div class="absolute -inset-8 bg-blue-500/30 rounded-full blur-2xl animate-pulse"></div>
          <div class="relative w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-700 rounded-xl border-2 border-white/80 flex items-center justify-center text-2xl shadow-[0_0_30px_rgba(59,130,246,0.8)]">
            🏭
          </div>
          <div class="absolute -bottom-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/80 backdrop-blur-md border border-white/20 rounded-lg text-white text-[10px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            CENTRAL DEPOT
          </div>
        </div>
      `,
      zIndex: 100,
    });
    map.add(depotMarker);

    if (tripsToRender.length === 0) return;

    // 2. 准备数据源
    const pulseData: any[] = [];
    const scatterData: any[] = [];

    tripsToRender.forEach((trip: any, idx: number) => {
      const originalIdx = scheduleResult.trips.indexOf(trip);
      const color = COLORS[originalIdx % COLORS.length];

      const fullPath: [number, number][] = [[DEFAULT_DEPOT.lng, DEFAULT_DEPOT.lat]];

      trip.stops.forEach((stop: any, sIdx: number) => {
        const { lng, lat } = stop.order.coordinates;
        fullPath.push([lng, lat]);

        // 收集站点点位数据
        scatterData.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
          properties: {
            tripId: trip.tripId,
            customer: stop.order.customerName,
            color,
            sequence: sIdx + 1,
            eta: stop.eta || '--:--',
            address: stop.order.address,
          },
        });

        // 渲染站号 Marker (保持交互性)
        const stopMarker = new AMap.Marker({
          position: [lng, lat],
          offset: new AMap.Pixel(-14, -14),
          content: `
              <div class="w-7 h-7 rounded-full bg-white/10 backdrop-blur-sm border border-white/30 flex items-center justify-center text-[10px] font-bold text-white shadow-lg hover:bg-white/30 transition-all cursor-pointer">
                ${sIdx + 1}
              </div>
            `,
          zIndex: 40
        });

        stopMarker.on('click', () => {
          new AMap.InfoWindow({
            isCustom: true,
            autoMove: true,
            content: `
                  <div class="glass-panel p-4 rounded-2xl min-w-[260px] text-white border border-white/10 shadow-3xl backdrop-blur-xl bg-black/60 overflow-hidden">
                    <div class="absolute top-0 left-0 w-full h-1" style="background:${color}"></div>
                    <div class="flex items-center gap-2 mb-4">
                      <div class="p-1.5 rounded-lg bg-white/5 border border-white/10">
                        <Box class="w-4 h-4 text-primary" />
                      </div>
                      <span class="font-bold text-lg tracking-tight">${stop.order.customerName}</span>
                    </div>
                    <div class="space-y-3 text-xs text-slate-400">
                      <div class="flex justify-between items-center">
                        <span class="flex items-center gap-1.5"><Truck class="w-3.5 h-3.5" /> 配送车次:</span>
                        <span class="text-white font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5">${trip.tripId}</span>
                      </div>
                      <div class="flex justify-between items-center">
                         <span>📍 站序:</span>
                         <span class="text-white">第 ${sIdx + 1} 站 / 共 ${trip.stops.length} 站</span>
                      </div>
                      <div class="space-y-1">
                         <span>🏠 送货地址:</span>
                         <p class="text-white leading-relaxed break-all">${stop.order.address}</p>
                      </div>
                      <div class="flex justify-between items-center pt-2 border-t border-white/5">
                         <span class="text-primary font-semibold text-[10px] uppercase">ETA</span>
                         <span class="text-primary font-mono text-base font-bold">${stop.eta || '--:--'}</span>
                      </div>
                    </div>
                  </div>
                `,
            offset: new AMap.Pixel(0, -30),
          }).open(map, stopMarker.getPosition());
        });
        map.add(stopMarker);
      });

      // 收集路径数据
      pulseData.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: fullPath,
        },
        properties: {
          color,
          tripId: trip.tripId,
        },
      });
    });

    // 3. 创建 Loca 图层 - 脉冲光效路径
    const pulseLayer = new window.Loca.PulseLineLayer({
      zIndex: 10,
      opacity: 1,
      visible: true,
      zooms: [2, 22],
    });

    const geoData = {
      type: 'FeatureCollection',
      features: pulseData,
    };

    pulseLayer.setSource(new window.Loca.GeoJSONSource({
      data: geoData,
    }));

    pulseLayer.setStyle({
      altitude: 0,
      lineWidth: 8,
      headColor: (index: number, f: any) => f.properties.color,
      trailColor: (index: number, f: any) => 'rgba(255, 255, 255, 0.1)',
      interval: 1.5, // 脉冲间隔
      duration: 3000, // 脉冲周期
    });

    loca.add(pulseLayer);

    // 4. 创建 Loca 图层 - 呼吸点位 (ScatterLayer)
    const scatterLayer = new window.Loca.ScatterLayer({
      zIndex: 20,
      opacity: 0.8,
      visible: true,
      zooms: [2, 22],
    });

    scatterLayer.setSource(new window.Loca.GeoJSONSource({
      data: {
        type: 'FeatureCollection',
        features: scatterData,
      }
    }));

    scatterLayer.setStyle({
      unit: 'px',
      size: [24, 24],
      borderWidth: 2,
      borderColor: '#ffffff',
      color: (index: number, f: any) => f.properties.color,
      animate: true,
      duration: 2000,
    });

    loca.add(scatterLayer);

    // 自动调整视野
    if (tripsToRender.length > 0) {
      map.setFitView();
    }

    // 启动动画
    loca.animate.start();

  }, [mapLoaded, scheduleResult, selectedTrips, isAllSelected]);

  const toggleTrip = (idx: number) => {
    setIsAllSelected(false);
    const newSelected = new Set(selectedTrips);
    if (newSelected.has(idx)) {
      newSelected.delete(idx);
    } else {
      newSelected.add(idx);
    }
    setSelectedTrips(newSelected);
  };

  const selectAll = () => {
    setIsAllSelected(true);
    setSelectedTrips(new Set());
  };

  const resetView = () => {
    mapRef.current?.setFitView();
  };

  return (
    <div className="relative w-full h-[calc(100vh-8rem)] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#0b0b14]">
      {/* Map Container */}
      <div id="schedule-map-container" className="w-full h-full" />

      {/* Floating Control Panel */}
      <div className={`absolute left-4 top-4 bottom-4 w-72 transition-transform duration-500 z-20 flex flex-col ${isPanelOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="bg-black/40 backdrop-blur-2xl flex-1 flex flex-col rounded-3xl border border-white/10 overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]">
          {/* Panel Header */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-primary/20 rounded-xl border border-primary/30">
                <Layers className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">指挥中心</h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Command Center</p>
              </div>
            </div>
            <button onClick={resetView} className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all group" title="重置视角">
              <RotateCcw className="w-4 h-4 group-active:rotate-180 transition-transform" />
            </button>
          </div>

          {/* Filter Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
            {scheduleResult && scheduleResult.trips.length > 0 ? (
              <>
                <button
                  onClick={selectAll}
                  className={`w-full px-4 py-3.5 rounded-2xl text-sm font-bold transition-all flex items-center justify-between group border ${isAllSelected
                    ? 'bg-primary border-primary shadow-[0_8px_20px_rgba(59,130,246,0.3)] text-white'
                    : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:border-white/10 hover:text-white'
                    }`}
                >
                  <span className="flex items-center gap-2">
                    <MapIcon className="w-4 h-4 opacity-70" />
                    显示全部航线
                  </span>
                  <span className="text-xs bg-black/30 px-2 py-0.5 rounded-full text-white/80 font-mono tracking-tighter">
                    {scheduleResult.trips.length}
                  </span>
                </button>

                <div className="space-y-2.5">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider pl-1">单车航线</p>
                  {scheduleResult.trips.map((trip: any, idx: number) => {
                    const color = COLORS[idx % COLORS.length];
                    const isSelected = isAllSelected || selectedTrips.has(idx);
                    const stopCount = trip.stops?.length || 0;

                    return (
                      <button
                        key={trip.tripId}
                        onClick={() => toggleTrip(idx)}
                        className={`w-full px-3.5 py-3 rounded-2xl text-left transition-all border group relative overflow-hidden ${isSelected
                          ? 'bg-white/10 border-white/10 text-white shadow-lg'
                          : 'bg-transparent border-transparent text-slate-500 hover:bg-white/5 hover:text-slate-300'
                          }`}
                      >
                        {/* Selected Indicator */}
                        {isSelected && (
                          <div className="absolute left-0 top-0 w-1 h-full" style={{ background: color }}></div>
                        )}

                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${isSelected ? 'border-white/20' : 'border-white/5 opacity-40'}`}
                            style={{ backgroundColor: `${color}20` }}
                          >
                            <Truck className="w-5 h-5" style={{ color: isSelected ? color : '#64748b' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-sm truncate tracking-tight">{trip.tripId}</span>
                              <span className="text-[10px] opacity-40 font-mono tracking-tighter">TRIP_{idx + 1}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] opacity-60 mt-1 font-semibold uppercase tracking-tighter">
                              <span className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-slate-400"></div> {stopCount} 站</span>
                              <span className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-slate-400"></div> {(trip.totalDistance || 0).toFixed(1)} KM</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-20 text-slate-500">
                <div className="w-16 h-16 mx-auto mb-4 bg-white/5 rounded-3xl flex items-center justify-center border border-white/5">
                  <MapIcon className="w-8 h-8 opacity-20" />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest opacity-40">航线监测未就绪</p>
                <p className="text-[10px] opacity-30 mt-1">请先上传数据并生成调度方案</p>
              </div>
            )}
          </div>

          {/* Panel Footer */}
          <div className="p-4 bg-white/5 border-t border-white/5">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <span>系统状态</span>
              <span className="flex items-center gap-1.5 text-emerald-500">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                实时更新
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Toggle Panel Button */}
      <button
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        className={`absolute top-1/2 -translate-y-1/2 z-10 transition-all duration-500 p-2.5 rounded-r-2xl bg-black/60 border border-l-0 border-white/10 text-white backdrop-blur-xl hover:bg-primary hover:border-primary shadow-2xl ${isPanelOpen ? 'left-72' : 'left-0'}`}
      >
        {isPanelOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {/* Floating Legend (Bottom Right) */}
      <div className="absolute bottom-8 right-8 z-10 bg-black/40 backdrop-blur-2xl px-6 py-4 rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col gap-3">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">数据图例</h4>
        <div className="flex items-center gap-6 text-[11px] font-bold text-slate-300">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-lg bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
            <span>中央仓库</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-white border-2 border-slate-500 shadow-[0_0_10px_rgba(255,255,255,0.3)]"></div>
            <span>配送站点</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-1.5 bg-gradient-to-r from-blue-500/10 via-white to-blue-500/10 rounded-full"></div>
            <span>流动航线</span>
          </div>
        </div>
      </div>

      {/* Environment Stats Overlay (Top Right) */}
      <div className="absolute top-8 right-8 z-10 flex gap-4">
        <div className="bg-black/40 backdrop-blur-xl px-5 py-3 rounded-2xl border border-white/10 shadow-2xl">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">活跃航线</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">{scheduleResult?.trips.length || 0}</span>
            <span className="text-[10px] text-emerald-500 font-bold">ROUTES</span>
          </div>
        </div>
        <div className="bg-black/40 backdrop-blur-xl px-5 py-3 rounded-2xl border border-white/10 shadow-2xl">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">覆盖点位</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">
              {scheduleResult?.trips.reduce((acc: number, t: any) => acc + (t.stops?.length || 0), 0) || 0}
            </span>
            <span className="text-[10px] text-primary font-bold">STOPS</span>
          </div>
        </div>
      </div>
    </div>
  );
}
