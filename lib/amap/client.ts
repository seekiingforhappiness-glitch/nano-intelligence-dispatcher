import { rateLimitConfig } from '@/config';
import { tryFallbackGeocode } from './fallback';

const AMAP_KEY = process.env.AMAP_KEY || '';
const GEOCODE_URL = 'https://restapi.amap.com/v3/geocode/geo';
const ROUTE_URL = 'https://restapi.amap.com/v3/direction/driving';

/**
 * 地理编码结果
 */
export interface GeocodeResult {
  success: boolean;
  lng: number;
  lat: number;
  formattedAddress: string;
  source: 'cache' | 'api' | 'fallback';
  error?: string;
  note?: string;
}

/**
 * 路径规划结果
 */
export interface RouteResult {
  success: boolean;
  distance: number;  // 距离（公里）
  duration: number;  // 时间（小时）
  source: 'api' | 'fallback';
  error?: string;
}

// 简单的内存缓存
const geocodeCache = new Map<string, GeocodeResult>();

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 带重试的 fetch
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries: number = rateLimitConfig.amap.retryAttempts
): Promise<Response> {
  let lastError: Error | null = null;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error as Error;
      if (i < retries - 1) {
        await delay(rateLimitConfig.amap.retryDelay * Math.pow(2, i));
      }
    }
  }

  throw lastError || new Error('请求失败');
}

/**
 * 地理编码 - 地址转坐标
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  // 1. 检查缓存
  const cacheKey = address.trim();
  if (geocodeCache.has(cacheKey)) {
    const cached = geocodeCache.get(cacheKey)!;
    return { ...cached, source: 'cache' };
  }

  // 2. 检查 API Key
  if (!AMAP_KEY) {
    const fallback = tryFallbackGeocode(address);
    if (fallback) {
      const result: GeocodeResult = {
        success: true,
        lng: fallback.lng,
        lat: fallback.lat,
        formattedAddress: fallback.formattedAddress,
        source: 'fallback',
        note: fallback.reason,
      };
      geocodeCache.set(cacheKey, result);
      return result;
    }
    return {
      success: false,
      lng: 0,
      lat: 0,
      formattedAddress: '',
      source: 'fallback',
      error: '未配置高德 API Key，且离线库未匹配',
    };
  }

  // 3. 调用高德 API
  try {
    const url = `${GEOCODE_URL}?key=${AMAP_KEY}&address=${encodeURIComponent(address)}&city=江苏`;
    const response = await fetchWithRetry(url);
    const data = await response.json();

    if (data.status === '1' && data.geocodes?.length > 0) {
      const geo = data.geocodes[0];
      const [lng, lat] = geo.location.split(',').map(Number);

      const result: GeocodeResult = {
        success: true,
        lng,
        lat,
        formattedAddress: geo.formatted_address,
        source: 'api',
      };

      // 缓存结果
      geocodeCache.set(cacheKey, result);

      return result;
    } else {
      const fallback = tryFallbackGeocode(address);
      if (fallback) {
        const result: GeocodeResult = {
          success: true,
          lng: fallback.lng,
          lat: fallback.lat,
          formattedAddress: fallback.formattedAddress,
          source: 'fallback',
          note: fallback.reason,
        };
        geocodeCache.set(cacheKey, result);
        return result;
      }
      return {
        success: false,
        lng: 0,
        lat: 0,
        formattedAddress: '',
        source: 'api',
        error: data.info || '地址解析失败',
      };
    }
  } catch (error) {
    const fallback = tryFallbackGeocode(address);
    if (fallback) {
      const result: GeocodeResult = {
        success: true,
        lng: fallback.lng,
        lat: fallback.lat,
        formattedAddress: fallback.formattedAddress,
        source: 'fallback',
        note: fallback.reason,
      };
      geocodeCache.set(cacheKey, result);
      return result;
    }
    return {
      success: false,
      lng: 0,
      lat: 0,
      formattedAddress: '',
      source: 'fallback',
      error: (error as Error).message,
    };
  }
}

/**
 * 批量地理编码
 */
export async function batchGeocode(
  addresses: string[],
  onProgress?: (current: number, total: number, meta?: { cacheHits: number }) => void
): Promise<{
  results: Map<string, GeocodeResult>;
  cacheHits: number;
}> {
  const results = new Map<string, GeocodeResult>();
  const unique = Array.from(new Set(addresses));
  const qps = rateLimitConfig.amap.geocodeQPS;
  let cacheHits = 0;

  for (let i = 0; i < unique.length; i++) {
    const address = unique[i];
    const geocodeResult = await geocodeAddress(address);
    if (geocodeResult.source === 'cache') {
      cacheHits++;
    }
    results.set(address, geocodeResult);

    onProgress?.(i + 1, unique.length, { cacheHits });

    // 限流控制
    if ((i + 1) % qps === 0 && i < unique.length - 1) {
      await delay(1000);
    }
  }

  return { results, cacheHits };
}

/**
 * 路径规划 - 计算两点间驾车距离和时间
 */
export async function calculateRoute(
  origin: { lng: number; lat: number },
  destination: { lng: number; lat: number }
): Promise<RouteResult> {
  if (!AMAP_KEY) {
    return {
      success: false,
      distance: 0,
      duration: 0,
      source: 'fallback',
      error: '未配置高德 API Key',
    };
  }

  try {
    const originStr = `${origin.lng},${origin.lat}`;
    const destStr = `${destination.lng},${destination.lat}`;
    const url = `${ROUTE_URL}?key=${AMAP_KEY}&origin=${originStr}&destination=${destStr}&strategy=10`;

    const response = await fetchWithRetry(url);
    const data = await response.json();

    if (data.status === '1' && data.route?.paths?.length > 0) {
      const path = data.route.paths[0];
      return {
        success: true,
        distance: parseFloat(path.distance) / 1000, // 米转公里
        duration: parseFloat(path.duration) / 3600, // 秒转小时
        source: 'api',
      };
    } else {
      return {
        success: false,
        distance: 0,
        duration: 0,
        source: 'api',
        error: data.info || '路径规划失败',
      };
    }
  } catch (error) {
    return {
      success: false,
      distance: 0,
      duration: 0,
      source: 'fallback',
      error: (error as Error).message,
    };
  }
}

/**
 * 批量计算路径（从一个起点到多个终点）
 */
export async function batchCalculateRoutes(
  origin: { lng: number; lat: number },
  destinations: { lng: number; lat: number; id: string }[],
  onProgress?: (current: number, total: number) => void
): Promise<Map<string, RouteResult>> {
  const results = new Map<string, RouteResult>();
  const qps = rateLimitConfig.amap.routeQPS;

  for (let i = 0; i < destinations.length; i++) {
    const dest = destinations[i];
    results.set(dest.id, await calculateRoute(origin, dest));

    onProgress?.(i + 1, destinations.length);

    // 限流控制
    if ((i + 1) % qps === 0 && i < destinations.length - 1) {
      await delay(1000);
    }
  }

  return results;
}

/**
 * 获取缓存统计
 */
export function getCacheStats() {
  return {
    size: geocodeCache.size,
    entries: Array.from(geocodeCache.keys()),
  };
}

/**
 * 清除缓存
 */
export function clearCache() {
  geocodeCache.clear();
}


