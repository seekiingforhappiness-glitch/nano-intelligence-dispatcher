/**
 * 仓库/发货点配置
 */
export interface DepotConfig {
  id: string;
  name: string;
  address: string;
  coordinates: {
    lng: number;
    lat: number;
  };
  isDefault: boolean;
}

/**
 * 默认发货仓 - 江苏金发科技新材料有限公司
 */
export const defaultDepot: DepotConfig = {
  id: 'kunshan-jf',
  name: '江苏金发科技新材料有限公司',
  address: '苏州市昆山市西江路388号',
  coordinates: {
    lng: parseFloat(process.env.DEPOT_LNG || '120.9427'),
    lat: parseFloat(process.env.DEPOT_LAT || '31.3256'),
  },
  isDefault: true,
};

/**
 * 获取当前发货仓配置
 */
export function getDepotConfig(): DepotConfig {
  return {
    id: 'kunshan-jf',
    name: process.env.DEPOT_NAME || defaultDepot.name,
    address: process.env.DEPOT_ADDRESS || defaultDepot.address,
    coordinates: {
      lng: parseFloat(process.env.DEPOT_LNG || '121.2367'),
      lat: parseFloat(process.env.DEPOT_LAT || '31.2156'),
    },
    isDefault: true,
  };
}
