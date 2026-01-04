'use client';

import { CheckCircle, Circle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressStage {
  id: number;
  name: string;
  status: 'pending' | 'processing' | 'completed';
}

interface ProgressPanelProps {
  currentStage: number;
  percent: number;
  message: string;
  isComplete?: boolean;
}

const STAGES: { id: number; name: string }[] = [
  { id: 1, name: '读取与校验表格' },
  { id: 2, name: '地址解析与坐标获取' },
  { id: 3, name: '区域分组' },
  { id: 4, name: '排线与选车优化' },
  { id: 5, name: '生成结果与汇总' },
];

export function ProgressPanel({
  currentStage,
  percent,
  message,
  isComplete = false,
}: ProgressPanelProps) {
  const stages: ProgressStage[] = STAGES.map(stage => ({
    ...stage,
    status:
      stage.id < currentStage
        ? 'completed'
        : stage.id === currentStage
        ? 'processing'
        : 'pending',
  }));

  if (isComplete) {
    stages.forEach(s => (s.status = 'completed'));
  }

  return (
    <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Loader2 className={cn('w-5 h-5', !isComplete && 'animate-spin text-primary-500')} />
        {isComplete ? '✅ 排线完成' : '排线进度'}
      </h3>

      {/* 进度条 */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-dark-400">{message}</span>
          <span className="text-primary-400">{percent}%</span>
        </div>
        <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500 ease-out',
              isComplete
                ? 'bg-gradient-to-r from-green-500 to-green-400'
                : 'bg-gradient-to-r from-primary-600 to-primary-400'
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* 阶段列表 */}
      <div className="space-y-3">
        {stages.map((stage, index) => (
          <div
            key={stage.id}
            className={cn(
              'flex items-center gap-3 transition-all duration-300',
              stage.status === 'pending' && 'opacity-40'
            )}
            style={{
              animationDelay: `${index * 100}ms`,
            }}
          >
            {/* 状态图标 */}
            {stage.status === 'completed' ? (
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            ) : stage.status === 'processing' ? (
              <Loader2 className="w-5 h-5 text-primary-500 animate-spin flex-shrink-0" />
            ) : (
              <Circle className="w-5 h-5 text-dark-500 flex-shrink-0" />
            )}

            {/* 阶段名称 */}
            <span
              className={cn(
                'text-sm',
                stage.status === 'completed'
                  ? 'text-green-400'
                  : stage.status === 'processing'
                  ? 'text-primary-400'
                  : 'text-dark-500'
              )}
            >
              阶段 {stage.id}: {stage.name}
            </span>

            {/* 连接线 */}
            {index < stages.length - 1 && (
              <div className="flex-1 h-px bg-dark-700 mx-2" />
            )}

            {/* 状态文字 */}
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded-full',
                stage.status === 'completed'
                  ? 'bg-green-500/20 text-green-400'
                  : stage.status === 'processing'
                  ? 'bg-primary-500/20 text-primary-400'
                  : 'bg-dark-700 text-dark-500'
              )}
            >
              {stage.status === 'completed'
                ? '完成'
                : stage.status === 'processing'
                ? '进行中'
                : '等待'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}


