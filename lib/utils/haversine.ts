/**
 * 哈弗辛公式计算两点间的球面距离
 * @param lat1 点1纬度
 * @param lng1 点1经度
 * @param lat2 点2纬度
 * @param lng2 点2经度
 * @returns 距离（公里）
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // 地球半径，单位：公里

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * 角度转弧度
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * 计算点相对于原点的角度（用于极坐标分组）
 * @param originLat 原点纬度
 * @param originLng 原点经度
 * @param pointLat 目标点纬度
 * @param pointLng 目标点经度
 * @returns 角度（0-360度）
 */
export function calculateAngle(
  originLat: number,
  originLng: number,
  pointLat: number,
  pointLng: number
): number {
  const dLng = pointLng - originLng;
  const dLat = pointLat - originLat;
  
  // 计算角度（弧度）
  let angle = Math.atan2(dLng, dLat);
  
  // 转换为度数（0-360）
  let degrees = angle * (180 / Math.PI);
  if (degrees < 0) {
    degrees += 360;
  }
  
  return degrees;
}

/**
 * 根据直线距离估算实际行驶距离
 * 经验系数：实际道路距离约为直线距离的 1.3-1.5 倍
 */
export function estimateRoadDistance(straightDistance: number): number {
  const roadFactor = 1.4; // 道路绕行系数
  return straightDistance * roadFactor;
}

/**
 * 根据距离估算行驶时间
 * @param distanceKm 距离（公里）
 * @param avgSpeedKmh 平均时速（默认 40km/h，考虑城市道路）
 * @returns 时间（小时）
 */
export function estimateDuration(distanceKm: number, avgSpeedKmh: number = 40): number {
  return distanceKm / avgSpeedKmh;
}


