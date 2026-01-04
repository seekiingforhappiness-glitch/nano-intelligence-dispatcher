import { create } from 'zustand';
import { ScheduleResult, ScheduleProgress } from '@/types/schedule';

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


