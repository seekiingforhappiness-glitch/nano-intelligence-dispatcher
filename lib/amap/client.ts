import { rateLimitConfig } from '@/config';
import { tryFallbackGeocode } from './fallback';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

const AMAP_KEY = process.env.AMAP_KEY || '';
const GEOCODE_URL = 'https://restapi.amap.com/v3/geocode/geo';
const ROUTE_URL = 'https://restapi.amap.com/v3/direction/driving';

/**
 * 路径规划缓存 Key
 */
function getRouteCacheKey(origin: { lng: number; lat: number }, destination: { lng: number; lat: number }): string {
  return `${origin.lng.toFixed(6)},${origin.lat.toFixed(6)}|${destination.lng.toFixed(6)},${destination.lat.toFixed(6)}`;
}

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

// 内存缓存（用于当前会话的快速查找）
const memoryCache = new Map<string, GeocodeResult>();

/**
 * 生成地址哈希（用于数据库唯一索引）
 */
function hashAddress(address: string): string {
  const normalized = address.trim().toLowerCase().replace(/\s+/g, '');
  return crypto.createHash('md5').update(normalized).digest('hex');
}

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
 * 从数据库加载缓存
 */
async function loadFromDbCache(address: string): Promise<GeocodeResult | null> {
  try {
    const hash = hashAddress(address);
    const cached = await prisma.geoCache.findUnique({
      where: { addressHash: hash },
    });

    if (cached) {
      // 更新使用统计
      await prisma.geoCache.update({
        where: { addressHash: hash },
        data: {
          hitCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      }).catch(() => { }); // 忽略更新错误

      return {
        success: true,
        lng: cached.lng,
        lat: cached.lat,
        formattedAddress: cached.formattedAddress || '',
        source: 'cache',
      };
    }
  } catch (error) {
    console.warn('GeoCache DB read error:', error);
  }
  return null;
}

/**
 * 保存到数据库缓存
 */
async function saveToDbCache(
  address: string,
  result: GeocodeResult
): Promise<void> {
  if (!result.success) return;

  try {
    const hash = hashAddress(address);
    await prisma.geoCache.upsert({
      where: { addressHash: hash },
      create: {
        addressHash: hash,
        originalAddress: address,
        normalizedAddress: address.trim(),
        formattedAddress: result.formattedAddress,
        lng: result.lng,
        lat: result.lat,
        source: result.source === 'cache' ? 'api' : result.source,
      },
      update: {
        hitCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });
  } catch (error) {
    console.warn('GeoCache DB write error:', error);
  }
}

/**
 * 地理编码 - 地址转坐标
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const cacheKey = address.trim();

  // 1. 检查内存缓存
  if (memoryCache.has(cacheKey)) {
    const cached = memoryCache.get(cacheKey)!;
    return { ...cached, source: 'cache' };
  }

  // 2. 检查数据库缓存
  const dbCached = await loadFromDbCache(cacheKey);
  if (dbCached) {
    memoryCache.set(cacheKey, dbCached); // 同时加入内存缓存
    return dbCached;
  }

  // 3. 检查 API Key
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
      memoryCache.set(cacheKey, result);
      await saveToDbCache(cacheKey, result);
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

  // 4. 调用高德 API
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

      // 保存到缓存
      memoryCache.set(cacheKey, result);
      await saveToDbCache(cacheKey, result);

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
        memoryCache.set(cacheKey, result);
        await saveToDbCache(cacheKey, result);
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
      memoryCache.set(cacheKey, result);
      await saveToDbCache(cacheKey, result);
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
  let apiCalls = 0;

  for (let i = 0; i < unique.length; i++) {
    const address = unique[i];
    const geocodeResult = await geocodeAddress(address);
    if (geocodeResult.source === 'cache') {
      cacheHits++;
    } else if (geocodeResult.source === 'api') {
      apiCalls++;
    }
    results.set(address, geocodeResult);

    onProgress?.(i + 1, unique.length, { cacheHits });

    // 限流控制（只对 API 调用计数）
    if (apiCalls > 0 && apiCalls % qps === 0 && i < unique.length - 1) {
      await delay(1000);
    }
  }

  console.log(`📍 地址解析统计: 总数=${unique.length}, 缓存命中=${cacheHits}, API调用=${apiCalls}`);

  return { results, cacheHits };
}

/**
 * 路径规划 - 计算两点间驾车距离和时间
 */
export async function calculateRoute(
  origin: { lng: number; lat: number },
  destination: { lng: number; lat: number }
): Promise<RouteResult> {
  const cacheKey = getRouteCacheKey(origin, destination);

  // 1. 检查数据库缓存
  try {
    const cached = await prisma.routeCache.findUnique({
      where: { routeKey: cacheKey },
    });

    if (cached) {
      return {
        success: true,
        distance: cached.distance,
        duration: cached.duration,
        source: 'api', // 视为 API 结果
      };
    }
  } catch (error) {
    console.warn('RouteCache read error:', error);
  }

  // 2. 调用 API
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
      const result: RouteResult = {
        success: true,
        distance: parseFloat(path.distance) / 1000, // 米转公里
        duration: parseFloat(path.duration) / 3600, // 秒转小时
        source: 'api',
      };

      // 保存到缓存
      try {
        await prisma.routeCache.upsert({
          where: { routeKey: cacheKey },
          create: {
            routeKey: cacheKey,
            originLng: origin.lng,
            originLat: origin.lat,
            destLng: destination.lng,
            destLat: destination.lat,
            distance: result.distance,
            duration: result.duration,
          },
          update: {
            hitCount: { increment: 1 },
            lastUsedAt: new Date(),
          },
        });
      } catch (error) {
        console.warn('RouteCache write error:', error);
      }

      return result;
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
export async function getCacheStats() {
  try {
    const dbCount = await prisma.geoCache.count();
    const totalHits = await prisma.geoCache.aggregate({
      _sum: { hitCount: true },
    });
    return {
      memorySize: memoryCache.size,
      dbSize: dbCount,
      totalHits: totalHits._sum.hitCount || 0,
    };
  } catch {
    return {
      memorySize: memoryCache.size,
      dbSize: 0,
      totalHits: 0,
    };
  }
}

/**
 * 清除缓存
 */
export async function clearCache(dbToo = false) {
  memoryCache.clear();
  if (dbToo) {
    try {
      await prisma.geoCache.deleteMany({});
    } catch (error) {
      console.warn('GeoCache clear error:', error);
    }
  }
}
