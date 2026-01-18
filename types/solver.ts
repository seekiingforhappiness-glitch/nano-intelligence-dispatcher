/**
 * 调度引擎策略模式类型定义
 * 支持多算法可插拔调度
 */

import { CleanedOrder, Order } from './order';
import { VehicleConfig } from './vehicle';
import { Trip, ScheduleSummary, ScheduleOptions, ScheduleProgress } from './schedule';

/**
 * 坐标点
 */
export interface Coordinates {
    lng: number;
    lat: number;
}

/**
 * 进度回调函数类型
 */
export type ProgressCallback = (progress: ScheduleProgress) => void;

/**
 * 策略输入参数
 */
export interface SolverInput {
    /** 清洗后的有效订单 */
    orders: CleanedOrder[];

    /** 仓库/发货点坐标 */
    depot: Coordinates;

    /** 可用车型配置 */
    vehicles: VehicleConfig[];

    /** 调度选项 */
    options: ScheduleOptions;

    /** 进度回调 */
    onProgress?: ProgressCallback;
}

/**
 * 策略输出结果
 */
export interface SolverOutput {
    /** 生成的车次列表 */
    trips: Trip[];

    /** 调度汇总 */
    summary: ScheduleSummary;

    /** 无法排线的订单（地址解析失败等） */
    invalidOrders: Order[];
}

/**
 * 求解器策略接口
 * 所有调度算法必须实现此接口
 */
export interface SolverStrategy {
    /** 策略唯一标识 */
    id: string;

    /** 策略显示名称 */
    name: string;

    /** 策略描述 */
    description: string;

    /** 策略适用场景说明 */
    suitableFor?: string;

    /**
     * 执行调度计算
     * @param input 调度输入参数
     * @returns 调度结果
     */
    solve(input: SolverInput): Promise<SolverOutput>;
}

/**
 * 策略元数据（用于 UI 展示）
 */
export interface SolverMeta {
    id: string;
    name: string;
    description: string;
    suitableFor?: string;
}

/**
 * 策略注册表
 */
export interface SolverRegistry {
    /** 获取所有可用策略元数据 */
    list(): SolverMeta[];

    /** 获取指定策略实例 */
    get(id: string): SolverStrategy | undefined;

    /** 注册新策略 */
    register(strategy: SolverStrategy): void;
}
