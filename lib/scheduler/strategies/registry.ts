import { SolverStrategy, SolverRegistry, SolverMeta } from '@/types/solver';
import { GreedyNearestNeighborStrategy } from './greedy';
import { KMeansTSPStrategy } from './kmeans';

class DefaultSolverRegistry implements SolverRegistry {
    private strategies: Map<string, SolverStrategy> = new Map();

    constructor() {
        // 注册预置策略
        this.register(new GreedyNearestNeighborStrategy());
        this.register(new KMeansTSPStrategy());
    }

    list(): SolverMeta[] {
        return Array.from(this.strategies.values()).map(s => ({
            id: s.id,
            name: s.name,
            description: s.description,
            suitableFor: s.suitableFor,
        }));
    }

    get(id: string): SolverStrategy | undefined {
        return this.strategies.get(id);
    }

    register(strategy: SolverStrategy): void {
        this.strategies.set(strategy.id, strategy);
    }
}

// 导出单例
export const solverRegistry = new DefaultSolverRegistry();
