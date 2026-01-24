import { useEffect, useRef, useCallback } from 'react';

export interface ExponentialPollingConfig {
  /** 初始轮询间隔 (ms)，默认 500 */
  initialInterval?: number;
  /** 最大轮询间隔 (ms)，默认 3000 */
  maxInterval?: number;
  /** 退避乘数，默认 1.5 */
  backoffMultiplier?: number;
  /** 是否立即执行第一次，默认 true */
  immediate?: boolean;
  /** 轮询成功时是否重置间隔，默认 false */
  resetOnSuccess?: boolean;
}

export interface PollingResult {
  /** 是否应该停止轮询 */
  shouldStop: boolean;
  /** 是否重置间隔到初始值 */
  resetInterval?: boolean;
}

/**
 * 指数退避轮询 Hook
 *
 * 优势:
 * 1. 初期快速响应用户操作 (500ms)
 * 2. 后期减少请求频率节省带宽 (3000ms)
 * 3. 任务完成后自动停止
 *
 * @example
 * ```ts
 * useExponentialPolling(
 *   async () => {
 *     const res = await fetch('/api/status');
 *     const data = await res.json();
 *     if (data.status === 'completed') {
 *       return { shouldStop: true };
 *     }
 *     return { shouldStop: false };
 *   },
 *   isPollingEnabled,
 *   { initialInterval: 500, maxInterval: 3000 }
 * );
 * ```
 */
export function useExponentialPolling(
  callback: () => Promise<PollingResult>,
  enabled: boolean,
  config: ExponentialPollingConfig = {}
) {
  const {
    initialInterval = 500,
    maxInterval = 3000,
    backoffMultiplier = 1.5,
    immediate = true,
    resetOnSuccess = false,
  } = config;

  const currentIntervalRef = useRef(initialInterval);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const attemptRef = useRef(0);

  const clearPolling = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const resetInterval = useCallback(() => {
    currentIntervalRef.current = initialInterval;
    attemptRef.current = 0;
  }, [initialInterval]);

  const poll = useCallback(async () => {
    if (!isMountedRef.current || !enabled) return;

    try {
      const result = await callback();

      if (!isMountedRef.current) return;

      if (result.shouldStop) {
        clearPolling();
        return;
      }

      if (result.resetInterval || resetOnSuccess) {
        resetInterval();
      } else {
        // 指数退避：增加间隔
        attemptRef.current += 1;
        currentIntervalRef.current = Math.min(
          initialInterval * Math.pow(backoffMultiplier, attemptRef.current),
          maxInterval
        );
      }

      // 安排下一次轮询
      timeoutRef.current = setTimeout(poll, currentIntervalRef.current);
    } catch (error) {
      console.error('[useExponentialPolling] Error:', error);

      if (!isMountedRef.current) return;

      // 错误时也使用退避，但不超过最大间隔
      attemptRef.current += 1;
      currentIntervalRef.current = Math.min(
        initialInterval * Math.pow(backoffMultiplier, attemptRef.current),
        maxInterval
      );

      timeoutRef.current = setTimeout(poll, currentIntervalRef.current);
    }
  }, [callback, enabled, initialInterval, maxInterval, backoffMultiplier, resetOnSuccess, clearPolling, resetInterval]);

  useEffect(() => {
    isMountedRef.current = true;

    if (enabled) {
      resetInterval();
      if (immediate) {
        poll();
      } else {
        timeoutRef.current = setTimeout(poll, currentIntervalRef.current);
      }
    }

    return () => {
      isMountedRef.current = false;
      clearPolling();
    };
  }, [enabled, poll, immediate, clearPolling, resetInterval]);

  return {
    /** 手动重置轮询间隔 */
    reset: resetInterval,
    /** 手动停止轮询 */
    stop: clearPolling,
    /** 当前轮询间隔 (ms) */
    currentInterval: currentIntervalRef.current,
  };
}

/**
 * 简化版：适用于不需要控制返回值的场景
 */
export function useSimplePolling(
  callback: () => Promise<boolean>, // 返回 true 表示停止
  enabled: boolean,
  config?: ExponentialPollingConfig
) {
  return useExponentialPolling(
    async () => {
      const shouldStop = await callback();
      return { shouldStop };
    },
    enabled,
    config
  );
}
