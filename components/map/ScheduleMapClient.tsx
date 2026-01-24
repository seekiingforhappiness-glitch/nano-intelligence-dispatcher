'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTaskStore } from '@/store/useTaskStore';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { TripControlPanel } from './TripControlPanel';
import { MapOverlays } from './MapOverlays';
import {
  ROUTE_COLORS,
  DEFAULT_DEPOT,
  MAP_CONFIG,
  LOCA_LIGHTING,
  PULSE_STYLE,
  SCATTER_STYLE,
} from './constants';

declare global {
  interface Window {
    _AMapSecurityConfig: {
      securityJsCode: string;
    };
    Loca: any;
  }
}

/**
 * 地图客户端组件 - 负责高德地图渲染和可视化
 */
export function ScheduleMapClient() {
  const mapRef = useRef<any>(null);
  const locaRef = useRef<any>(null);
  const AMapRef = useRef<any>(null);

  const { scheduleResult } = useTaskStore();
  const [selectedTrips, setSelectedTrips] = useState<Set<number>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  // 初始化地图与 Loca
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let mapInstance: any = null;

    window._AMapSecurityConfig = {
      securityJsCode: process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE || '',
    };

    import('@amap/amap-jsapi-loader').then((AMapLoader) => {
      AMapLoader.default
        .load({
          key: process.env.NEXT_PUBLIC_AMAP_JS_KEY || '',
          version: '2.0',
          plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.ControlBar'],
          Loca: {
            version: '2.0.0',
          },
        })
        .then((AMap: any) => {
          AMapRef.current = AMap;
          mapInstance = new AMap.Map('schedule-map-container', {
            ...MAP_CONFIG,
            center: [DEFAULT_DEPOT.lng, DEFAULT_DEPOT.lat],
          });

          // 初始化 Loca
          const loca = new window.Loca.Container({
            map: mapInstance,
          });

          // 添加光照系统
          loca.ambLight = LOCA_LIGHTING.ambLight;
          loca.dirLight = LOCA_LIGHTING.dirLight;
          loca.pointLight = {
            ...LOCA_LIGHTING.pointLight,
            position: [DEFAULT_DEPOT.lng, DEFAULT_DEPOT.lat, 2000],
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
    if (!mapLoaded || !mapRef.current || !locaRef.current || !AMapRef.current || !scheduleResult) {
      return;
    }

    const AMap = AMapRef.current;
    const map = mapRef.current;
    const loca = locaRef.current;

    // 清空现有图层
    loca.clear();
    map.clearMap();

    const tripsToRender = isAllSelected
      ? scheduleResult.trips
      : scheduleResult.trips.filter((_: any, idx: number) => selectedTrips.has(idx));

    // 1. 渲染仓库 Marker
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
      const color = ROUTE_COLORS[originalIdx % ROUTE_COLORS.length];

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

        // 渲染站号 Marker
        const stopMarker = new AMap.Marker({
          position: [lng, lat],
          offset: new AMap.Pixel(-14, -14),
          content: `
            <div class="w-7 h-7 rounded-full bg-white/10 backdrop-blur-sm border border-white/30 flex items-center justify-center text-[10px] font-bold text-white shadow-lg hover:bg-white/30 transition-all cursor-pointer">
              ${sIdx + 1}
            </div>
          `,
          zIndex: 40,
        });

        stopMarker.on('click', () => {
          new AMap.InfoWindow({
            isCustom: true,
            autoMove: true,
            content: createInfoWindowContent(trip, stop, sIdx, color),
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

    pulseLayer.setSource(
      new window.Loca.GeoJSONSource({
        data: {
          type: 'FeatureCollection',
          features: pulseData,
        },
      })
    );

    pulseLayer.setStyle({
      ...PULSE_STYLE,
      headColor: (_index: number, f: any) => f.properties.color,
      trailColor: () => 'rgba(255, 255, 255, 0.1)',
    });

    loca.add(pulseLayer);

    // 4. 创建 Loca 图层 - 呼吸点位 (ScatterLayer)
    const scatterLayer = new window.Loca.ScatterLayer({
      zIndex: 20,
      opacity: 0.8,
      visible: true,
      zooms: [2, 22],
    });

    scatterLayer.setSource(
      new window.Loca.GeoJSONSource({
        data: {
          type: 'FeatureCollection',
          features: scatterData,
        },
      })
    );

    scatterLayer.setStyle({
      ...SCATTER_STYLE,
      color: (_index: number, f: any) => f.properties.color,
    });

    loca.add(scatterLayer);

    // 自动调整视野
    if (tripsToRender.length > 0) {
      map.setFitView();
    }

    // 启动动画
    loca.animate.start();
  }, [mapLoaded, scheduleResult, selectedTrips, isAllSelected]);

  // 回调函数使用 useCallback 优化
  const toggleTrip = useCallback((idx: number) => {
    setIsAllSelected(false);
    setSelectedTrips((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(idx)) {
        newSelected.delete(idx);
      } else {
        newSelected.add(idx);
      }
      return newSelected;
    });
  }, []);

  const selectAll = useCallback(() => {
    setIsAllSelected(true);
    setSelectedTrips(new Set());
  }, []);

  const resetView = useCallback(() => {
    mapRef.current?.setFitView();
  }, []);

  const togglePanel = useCallback(() => {
    setIsPanelOpen((prev) => !prev);
  }, []);

  const trips = scheduleResult?.trips || [];

  return (
    <div className="relative w-full h-[calc(100vh-8rem)] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#0b0b14]">
      {/* Map Container */}
      <div id="schedule-map-container" className="w-full h-full" />

      {/* Floating Control Panel */}
      <TripControlPanel
        trips={trips}
        selectedTrips={selectedTrips}
        isAllSelected={isAllSelected}
        isPanelOpen={isPanelOpen}
        onToggleTrip={toggleTrip}
        onSelectAll={selectAll}
        onResetView={resetView}
        onTogglePanel={togglePanel}
      />

      {/* Toggle Panel Button */}
      <button
        onClick={togglePanel}
        className={`absolute top-1/2 -translate-y-1/2 z-10 transition-all duration-500 p-2.5 rounded-r-2xl bg-black/60 border border-l-0 border-white/10 text-white backdrop-blur-xl hover:bg-primary hover:border-primary shadow-2xl ${
          isPanelOpen ? 'left-72' : 'left-0'
        }`}
      >
        {isPanelOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      {/* Overlay Components */}
      <MapOverlays trips={trips} />
    </div>
  );
}

/**
 * 生成信息窗口内容
 */
function createInfoWindowContent(trip: any, stop: any, sIdx: number, color: string): string {
  return `
    <div class="glass-panel p-4 rounded-2xl min-w-[260px] text-white border border-white/10 shadow-3xl backdrop-blur-xl bg-black/60 overflow-hidden">
      <div class="absolute top-0 left-0 w-full h-1" style="background:${color}"></div>
      <div class="flex items-center gap-2 mb-4">
        <div class="p-1.5 rounded-lg bg-white/5 border border-white/10">
          <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
          </svg>
        </div>
        <span class="font-bold text-lg tracking-tight">${stop.order.customerName}</span>
      </div>
      <div class="space-y-3 text-xs text-slate-400">
        <div class="flex justify-between items-center">
          <span class="flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 17l4 4 4-4m-4-5v9"/>
            </svg>
            配送车次:
          </span>
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
  `;
}
