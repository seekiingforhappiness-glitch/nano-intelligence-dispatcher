/**
 * 地图可视化常量 - 提取为独立模块避免重复打包
 */

// 高对比度颜色，便于区分不同车次
export const ROUTE_COLORS = [
  '#3B82F6', '#10B981', '#F97316', '#EC4899', '#A855F7',
  '#14B8A6', '#EAB308', '#EF4444', '#6366F1', '#84CC16'
] as const;

// 默认仓库坐标
export const DEFAULT_DEPOT = {
  lng: 121.2367,
  lat: 31.2156,
  name: '江苏金发科技生产基地',
} as const;

// 地图初始化配置
export const MAP_CONFIG = {
  viewMode: '3D' as const,
  pitch: 50,
  rotation: 0,
  zoom: 11,
  mapStyle: 'amap://styles/darkblue',
  skyColor: '#0b0b14',
} as const;

// Loca 光照配置
export const LOCA_LIGHTING = {
  ambLight: {
    intensity: 0.7,
    color: '#7b7bff',
  },
  dirLight: {
    intensity: 0.8,
    color: '#fff',
    target: [0, 0, 0] as [number, number, number],
    position: [0, -1, 1] as [number, number, number],
  },
  pointLight: {
    color: 'rgb(100,100,255)',
    intensity: 3,
    distance: 10000,
  },
} as const;

// 脉冲路径样式
export const PULSE_STYLE = {
  altitude: 0,
  lineWidth: 8,
  interval: 1.5,
  duration: 3000,
} as const;

// 散点样式
export const SCATTER_STYLE = {
  unit: 'px' as const,
  size: [24, 24] as [number, number],
  borderWidth: 2,
  borderColor: '#ffffff',
  animate: true,
  duration: 2000,
} as const;
