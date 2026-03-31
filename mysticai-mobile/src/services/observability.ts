import axios from 'axios/dist/browser/axios.cjs';

type LogContextValue = string | number | boolean | null | undefined;
type LogContext = Record<string, LogContextValue>;

type ServiceName = 'api' | 'daily' | 'home-dashboard';

const SERVICE_NOT_CONFIGURED = 'SERVICE_NOT_CONFIGURED';
const warnedKeys = new Set<string>();

function compactContext(context?: LogContext): LogContext | undefined {
  if (!context) return undefined;
  const entries = Object.entries(context).filter(([, value]) => value !== undefined);
  if (!entries.length) return undefined;
  return Object.fromEntries(entries);
}

function once(key: string, fn: () => void): void {
  if (warnedKeys.has(key)) return;
  warnedKeys.add(key);
  fn();
}

export function logInfo(scope: string, message: string, context?: LogContext): void {
  const safe = compactContext(context);
  if (safe) {
    console.info(`[obs][${scope}] ${message}`, safe);
    return;
  }
  console.info(`[obs][${scope}] ${message}`);
}

export function logWarn(scope: string, message: string, context?: LogContext): void {
  const safe = compactContext(context);
  if (safe) {
    console.warn(`[obs][${scope}] ${message}`, safe);
    return;
  }
  console.warn(`[obs][${scope}] ${message}`);
}

export function logWarnOnce(scope: string, key: string, message: string, context?: LogContext): void {
  once(`${scope}:${key}`, () => logWarn(scope, message, context));
}

export function logApiError(scope: string, error: unknown, context?: LogContext): void {
  const safeBase = compactContext(context) ?? {};
  if (axios.isAxiosError(error)) {
    const baseUrl = error.config?.baseURL;
    const path = error.config?.url;
    console.error(`[obs][${scope}] api_error`, {
      ...safeBase,
      code: error.code,
      status: error.response?.status,
      serverMessage: (error.response?.data as any)?.message,
      method: error.config?.method,
      path,
      baseUrl,
      requestUrl: baseUrl && path ? `${baseUrl}${path}` : undefined,
      timeout: error.code === 'ECONNABORTED',
      network: !error.response,
    });
    return;
  }
  if (error instanceof Error) {
    console.error(`[obs][${scope}] error`, {
      ...safeBase,
      name: error.name,
      message: error.message,
    });
    return;
  }
  console.error(`[obs][${scope}] error`, safeBase);
}

export class ServiceNotConfiguredError extends Error {
  code: string;
  service: ServiceName;

  constructor(service: ServiceName) {
    super('Service not configured');
    this.name = 'ServiceNotConfiguredError';
    this.code = SERVICE_NOT_CONFIGURED;
    this.service = service;
  }
}

export function createServiceNotConfiguredError(service: ServiceName): ServiceNotConfiguredError {
  return new ServiceNotConfiguredError(service);
}

export function isServiceNotConfiguredError(error: unknown): error is ServiceNotConfiguredError {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (error as any).code === SERVICE_NOT_CONFIGURED,
  );
}
