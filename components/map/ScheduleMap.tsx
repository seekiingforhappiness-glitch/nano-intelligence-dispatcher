import dynamic from 'next/dynamic';
import { MapIcon } from 'lucide-react';

/**
 * 地图加载骨架屏
 */
function MapSkeleton() {
  return (
    <div className="relative w-full h-[calc(100vh-8rem)] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#0b0b14] animate-pulse">
      {/* 模拟控制面板 */}
      <div className="absolute left-4 top-4 bottom-4 w-72 bg-black/40 backdrop-blur-2xl rounded-3xl border border-white/10 p-5">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 bg-white/5 rounded-xl" />
          <div className="space-y-2">
            <div className="h-4 w-20 bg-white/10 rounded" />
            <div className="h-2 w-16 bg-white/5 rounded" />
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-white/5 rounded-2xl" />
          ))}
        </div>
      </div>

      {/* 模拟统计卡片 */}
      <div className="absolute top-8 right-8 flex gap-4">
        <div className="bg-black/40 backdrop-blur-xl px-5 py-3 rounded-2xl border border-white/10 w-28 h-16" />
        <div className="bg-black/40 backdrop-blur-xl px-5 py-3 rounded-2xl border border-white/10 w-28 h-16" />
      </div>

      {/* 中央加载指示器 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center border border-white/10 mb-4">
          <MapIcon className="w-10 h-10 text-white/20" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-3 font-bold">
          正在加载地图引擎...
        </p>
      </div>

      {/* 模拟图例 */}
      <div className="absolute bottom-8 right-8 bg-black/40 backdrop-blur-2xl px-6 py-4 rounded-3xl border border-white/10 w-80 h-16" />
    </div>
  );
}

/**
 * 动态导入地图组件
 * - SSR: false 确保仅在客户端加载
 * - loading: 显示骨架屏提供良好的加载体验
 *
 * 优势:
 * 1. 减少首屏 JS bundle 约 200KB (高德地图 + Loca 库)
 * 2. 服务端渲染时不会尝试加载地图 SDK
 * 3. 用户看到骨架屏时知道正在加载
 */
const ScheduleMapClient = dynamic(
  () => import('./ScheduleMapClient').then((mod) => mod.ScheduleMapClient),
  {
    ssr: false,
    loading: MapSkeleton,
  }
);

/**
 * 地图组件入口
 * 这是一个轻量级的包装器，实际渲染延迟到客户端
 */
export function ScheduleMap() {
  return <ScheduleMapClient />;
}
