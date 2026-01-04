import { fallbackLocations, FallbackLocation } from '@/config/geoFallback';

interface FallbackResult {
  success: boolean;
  lng: number;
  lat: number;
  formattedAddress: string;
  source: 'fallback';
  reason: string;
}

const normalizedCache = new Map<string, FallbackLocation>();

function normalizeAddress(address: string): string {
  return address
    .replace(/\s+/g, '')
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .replace(/-/g, '')
    .toLowerCase();
}

export function tryFallbackGeocode(address: string): FallbackResult | null {
  if (!address) {
    return null;
  }

  const normalized = normalizeAddress(address);
  if (normalizedCache.has(normalized)) {
    const cached = normalizedCache.get(normalized)!;
    return formatResult(cached);
  }

  for (const location of fallbackLocations) {
    if (
      location.keywords.some((keyword) =>
        normalized.includes(keyword.toLowerCase())
      )
    ) {
      normalizedCache.set(normalized, location);
      return formatResult(location);
    }
  }

  return null;
}

function formatResult(location: FallbackLocation): FallbackResult {
  const formatted = `${location.province}${location.city}${
    location.district ? location.district : ''
  }`;
  return {
    success: true,
    lng: location.coordinates.lng,
    lat: location.coordinates.lat,
    formattedAddress: formatted,
    source: 'fallback',
    reason: location.district
      ? `匹配到${location.city}${location.district}离线坐标`
      : `匹配到${location.city}离线坐标`,
  };
}


