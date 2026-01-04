export * from './defaultFleet';
export * from './depot';

/**
 * 默认调度参数
 */
export const defaultScheduleOptions = {
  maxStops: 8,                   // 最大串点数
  startTime: '06:00',            // 发车开始时间
  deadline: '20:00',             // 最晚送达截止
  factoryDeadline: '17:00',      // 工厂最晚送货时间
  costMode: 'mileage' as const,  // 成本计算模式
  showMarketReference: true,     // 显示市场参考价
};

/**
 * 应用配置
 */
export const appConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME || '纳米智能排线助手',
  version: '1.0.0',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  supportedFileTypes: ['.xlsx', '.xls', '.csv'],
};

/**
 * API 限流配置
 */
export const rateLimitConfig = {
  amap: {
    geocodeQPS: 10,              // 地理编码每秒请求数
    routeQPS: 5,                 // 路径规划每秒请求数
    retryAttempts: 3,            // 重试次数
    retryDelay: 1000,            // 重试延迟 (ms)
  },
};


