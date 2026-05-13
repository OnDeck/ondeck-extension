type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  module: string;
  message?: string;
  context?: unknown;
  error?: unknown;
}

const IS_DEV = import.meta.env.DEV;

function emit(level: LogLevel, entry: LogEntry): void {
  if (level === 'debug' && !IS_DEV) return;
  const tag = `[${level.toUpperCase()}][${entry.module}]`;
  const msg = entry.message ?? '';
  const extras: unknown[] = [];
  if (entry.context !== undefined) extras.push(entry.context);
  if (entry.error !== undefined) extras.push(entry.error);

  if (level === 'error') console.error(tag, msg, ...extras);
  else if (level === 'warn') console.warn(tag, msg, ...extras);
  else console.log(tag, msg, ...extras);
}

export const logger = {
  debug: (entry: LogEntry) => emit('debug', entry),
  info: (entry: LogEntry) => emit('info', entry),
  warn: (entry: LogEntry) => emit('warn', entry),
  error: (entry: LogEntry) => emit('error', entry),
};
