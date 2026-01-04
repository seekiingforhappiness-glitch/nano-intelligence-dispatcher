'use client';

import { useEffect, useRef } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';
import { useTaskStore } from '@/store/useTaskStore';

const COLORS = ['#3B82F6', '#10B981', '#F97316', '#EC4899', '#A855F7', '#14B8A6'];

declare global {
  interface Window {
    _AMapSecurityConfig: {
      securityJsCode: string;
    };
  }
}

export function ScheduleMap() {
  const mapRef = useRef<AMap.Map | null>(null);
  const { scheduleResult } = useTaskStore();

  useEffect(() => {
    let mapInstance: AMap.Map | null = null;

    // Set security config before loading
    window._AMapSecurityConfig = {
      securityJsCode: process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE || '',
    };

    AMapLoader.load({
      key: process.env.NEXT_PUBLIC_AMAP_JS_KEY || '',
      version: '2.0',
      plugins: ['AMap.Scale', 'AMap.ToolBar'],
    })
      .then((AMap) => {
        mapInstance = new AMap.Map('schedule-map-container', {
          viewMode: '3D',
          zoom: 8,
          pitch: 40,
          center: [118.796, 32.059], // 默认南京
          mapStyle: 'amap://styles/whitesmoke',
        });
        mapRef.current = mapInstance;
        if (scheduleResult && mapInstance) {
          renderTrips(AMap, mapInstance, scheduleResult);
        }
      })
      .catch((error) => {
        console.error('加载高德地图失败', error);
      });

    return () => {
      if (mapInstance) {
        mapInstance?.destroy();
      }
    };
  }, [scheduleResult]);

  useEffect(() => {
    if (scheduleResult && mapRef.current && (window as any).AMap) {
      const AMap = (window as any).AMap;
      clearMap(mapRef.current);
      renderTrips(AMap, mapRef.current, scheduleResult);
    }
  }, [scheduleResult]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-white">调度图谱</h2>
        <p className="text-dark-400 text-sm mt-1">
          展示当前任务的车次路线、停靠点和关键指标。可通过左侧控制台上传新的调度任务。
        </p>
      </div>
      <div
        id="schedule-map-container"
        className="w-full h-[560px] rounded-2xl border border-dark-700 overflow-hidden bg-dark-900"
      />
      {!scheduleResult && (
        <div className="rounded-xl border border-dashed border-dark-700 p-6 text-dark-400 text-sm">
          暂无调度结果。请先在“任务控制台”上传并完成一次排线任务。
        </div>
      )}
    </div>
  );
}

function clearMap(map: AMap.Map) {
  map.clearMap();
}

function renderTrips(AMap: any, map: AMap.Map, result: any) {
  const bounds = new AMap.Bounds();
  result.trips.forEach((trip: any, idx: number) => {
    const color = COLORS[idx % COLORS.length];
    const path = trip.stops.map((stop: any) => {
      const { lng, lat } = stop.order.coordinates;
      bounds.extend([lng, lat]);
      return [lng, lat];
    });

    const polyline = new AMap.Polyline({
      path,
      strokeColor: color,
      strokeWeight: 6,
      lineJoin: 'round',
      lineCap: 'round',
      zIndex: 20,
    });
    map.add(polyline);

    trip.stops.forEach((stop: any, seq: number) => {
      const { lng, lat } = stop.order.coordinates;
      const marker = new AMap.Marker({
        position: [lng, lat],
        title: stop.order.customerName,
        offset: new AMap.Pixel(-8, -8),
        content: `<div style="
          width: 16px; height: 16px; border-radius: 50%;
          background: ${color}; border: 2px solid #ffffff;
          display:flex; align-items:center; justify-content:center;
          font-size:10px; color:#000; font-weight:bold;
        ">${seq + 1}</div>`,
      });

      marker.on('click', () => {
        new AMap.InfoWindow({
          content: `
            <div style="min-width:200px;">
              <strong>${trip.tripId} · 第 ${seq + 1} 站</strong><br/>
              客户：${stop.order.customerName}<br/>
              地址：${stop.order.address}<br/>
              ETA：${stop.eta}，装卸：30min<br/>
              载重：${stop.order.weightKg} kg
            </div>
          `,
        }).open(map, marker.getPosition());
      });

      map.add(marker);
    });
  });

  if (!bounds.isEmpty()) {
    map.setFitView();
  }
}


