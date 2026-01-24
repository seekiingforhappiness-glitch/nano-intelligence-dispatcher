import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { ScheduleResult, ScheduleProgress, Trip, ScheduleSummary } from '@/types/schedule';

interface TaskState {
  currentTaskId: string | null;
  scheduleResult: ScheduleResult | null;
  progress: ScheduleProgress | null;
  error: string | null;
  setTask: (params: { taskId: string; result: ScheduleResult }) => void;
  setProgress: (progress: ScheduleProgress | null) => void;
  setError: (message: string | null) => void;
  clear: () => void;
}

/**
 * 核心任务状态 Store
 */
export const useTaskStore = create<TaskState>((set) => ({
  currentTaskId: null,
  scheduleResult: null,
  progress: null,
  error: null,
  setTask: ({ taskId, result }) =>
    set({
      currentTaskId: taskId,
      scheduleResult: result,
      progress: null,
      error: null,
    }),
  setProgress: (progress) => set({ progress }),
  setError: (error) => set({ error }),
  clear: () => set({ currentTaskId: null, scheduleResult: null, progress: null, error: null }),
}));

// ============================================================================
// 选择性订阅 Hooks - 避免不必要的重渲染
// ============================================================================

/**
 * 仅订阅调度结果
 * 适用于: 地图、结果面板等需要完整结果的组件
 */
export function useScheduleResult(): ScheduleResult | null {
  return useTaskStore((state) => state.scheduleResult);
}

/**
 * 仅订阅车次列表
 * 适用于: 车次筛选面板等仅需要 trips 的组件
 */
export function useTrips(): Trip[] {
  return useTaskStore((state) => state.scheduleResult?.trips ?? []);
}

/**
 * 仅订阅汇总数据
 * 适用于: 统计卡片、成本概览等仅需要 summary 的组件
 */
export function useSummary(): ScheduleSummary | null {
  return useTaskStore((state) => state.scheduleResult?.summary ?? null);
}

/**
 * 仅订阅进度信息
 * 适用于: 进度条、加载指示器等组件
 * 进度更新频繁，隔离订阅可大幅减少其他组件的重渲染
 */
export function useProgress(): ScheduleProgress | null {
  return useTaskStore((state) => state.progress);
}

/**
 * 仅订阅错误状态
 * 适用于: 错误提示组件
 */
export function useError(): string | null {
  return useTaskStore((state) => state.error);
}

/**
 * 仅订阅任务 ID
 * 适用于: 需要判断是否有活跃任务的组件
 */
export function useCurrentTaskId(): string | null {
  return useTaskStore((state) => state.currentTaskId);
}

/**
 * 订阅多个状态片段 (使用 useShallow 避免引用变化导致的重渲染)
 * 适用于: 需要组合多个状态的复杂组件
 *
 * @example
 * const { progress, error } = useTaskSlice((state) => ({
 *   progress: state.progress,
 *   error: state.error,
 * }));
 */
export function useTaskSlice<T>(selector: (state: TaskState) => T): T {
  return useTaskStore(useShallow(selector));
}

/**
 * 获取 Store 操作方法 (不订阅状态变化)
 * 适用于: 事件处理器、异步操作中需要调用 store 方法但不需要响应状态变化
 *
 * @example
 * const actions = useTaskActions();
 * actions.setProgress({ ... });
 */
export function useTaskActions() {
  return useTaskStore(
    useShallow((state) => ({
      setTask: state.setTask,
      setProgress: state.setProgress,
      setError: state.setError,
      clear: state.clear,
    }))
  );
}


