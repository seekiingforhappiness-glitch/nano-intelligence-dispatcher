import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * 错误码枚举
 */
export enum ErrorCode {
  // 认证相关 (4xx)
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',

  // 验证相关 (4xx)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_FIELD = 'MISSING_FIELD',

  // 资源相关 (4xx)
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',

  // 业务逻辑相关 (4xx)
  BUSINESS_ERROR = 'BUSINESS_ERROR',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  OPERATION_FAILED = 'OPERATION_FAILED',

  // 服务器相关 (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
}

/**
 * 基础应用错误类
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: ErrorCode | string = ErrorCode.INTERNAL_ERROR,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    // 保持原型链
    Object.setPrototypeOf(this, AppError.prototype);
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      ...(this.details && { details: this.details }),
    };
  }
}

/**
 * 验证错误
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, details);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * 认证错误
 */
export class AuthenticationError extends AppError {
  constructor(message: string = '请先登录') {
    super(message, ErrorCode.UNAUTHORIZED, 401);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * 权限错误
 */
export class AuthorizationError extends AppError {
  constructor(message: string = '权限不足') {
    super(message, ErrorCode.FORBIDDEN, 403);
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * 资源未找到错误
 */
export class NotFoundError extends AppError {
  constructor(resource: string = '资源') {
    super(`${resource}不存在`, ErrorCode.NOT_FOUND, 404);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * 资源冲突错误
 */
export class ConflictError extends AppError {
  constructor(message: string = '资源已存在') {
    super(message, ErrorCode.CONFLICT, 409);
    this.name = 'ConflictError';
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * 业务逻辑错误
 */
export class BusinessError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ErrorCode.BUSINESS_ERROR, 422, details);
    this.name = 'BusinessError';
    Object.setPrototypeOf(this, BusinessError.prototype);
  }
}

/**
 * 数据库错误
 */
export class DatabaseError extends AppError {
  constructor(message: string = '数据库操作失败') {
    super(message, ErrorCode.DATABASE_ERROR, 500);
    this.name = 'DatabaseError';
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * 外部服务错误
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super(`${service}: ${message}`, ErrorCode.EXTERNAL_SERVICE_ERROR, 502);
    this.name = 'ExternalServiceError';
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}

/**
 * 将 Zod 验证错误转换为 ValidationError
 */
export function fromZodError(error: ZodError): ValidationError {
  const issues = error.issues.map(issue => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));

  const message = issues.length === 1
    ? issues[0].message
    : `验证失败: ${issues.length} 个字段有误`;

  return new ValidationError(message, { issues });
}

/**
 * 错误响应辅助函数
 */
export function errorResponse(error: unknown): NextResponse {
  // 已知的应用错误
  if (error instanceof AppError) {
    return NextResponse.json(error.toJSON(), { status: error.statusCode });
  }

  // Zod 验证错误
  if (error instanceof ZodError) {
    const validationError = fromZodError(error);
    return NextResponse.json(validationError.toJSON(), { status: 400 });
  }

  // 标准 Error
  if (error instanceof Error) {
    console.error('Unhandled error:', error);
    return NextResponse.json(
      { error: '服务器内部错误', code: ErrorCode.INTERNAL_ERROR },
      { status: 500 }
    );
  }

  // 未知错误类型
  console.error('Unknown error type:', error);
  return NextResponse.json(
    { error: '未知错误', code: ErrorCode.INTERNAL_ERROR },
    { status: 500 }
  );
}

/**
 * API 路由处理器包装函数
 *
 * 自动处理错误响应，减少样板代码
 *
 * @example
 * ```ts
 * export const GET = apiHandler(async (request) => {
 *   const data = await fetchData();
 *   return NextResponse.json(data);
 * });
 * ```
 */
export function apiHandler<T extends NextRequest>(
  handler: (request: T) => Promise<NextResponse>
): (request: T) => Promise<NextResponse> {
  return async (request: T) => {
    try {
      return await handler(request);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

/**
 * 带上下文的 API 路由处理器
 *
 * @example
 * ```ts
 * export const GET = apiHandlerWithContext(async (request, { params }) => {
 *   const { id } = params;
 *   const data = await fetchById(id);
 *   return NextResponse.json(data);
 * });
 * ```
 */
export function apiHandlerWithContext<T extends NextRequest, C>(
  handler: (request: T, context: C) => Promise<NextResponse>
): (request: T, context: C) => Promise<NextResponse> {
  return async (request: T, context: C) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

/**
 * 断言函数：确保条件为真，否则抛出错误
 */
export function assertOrThrow(
  condition: boolean,
  ErrorClass: new (message: string) => AppError,
  message: string
): asserts condition {
  if (!condition) {
    throw new ErrorClass(message);
  }
}

/**
 * 确保值存在，否则抛出 NotFoundError
 */
export function assertFound<T>(
  value: T | null | undefined,
  resource: string = '资源'
): asserts value is T {
  if (value === null || value === undefined) {
    throw new NotFoundError(resource);
  }
}
