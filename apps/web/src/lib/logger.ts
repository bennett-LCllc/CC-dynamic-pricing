import pino from 'pino';

const serviceName = 'cc-ops-web';
const serviceVersion = process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0';

/**
 * Check if we're running in the browser
 */
const isBrowser = typeof window !== 'undefined';

/**
 * Browser-safe logger using console with structured format
 */
interface BrowserLogger {
  trace: (msg: string, meta?: Record<string, any>) => void;
  debug: (msg: string, meta?: Record<string, any>) => void;
  info: (msg: string, meta?: Record<string, any>) => void;
  warn: (msg: string, meta?: Record<string, any>) => void;
  error: (msg: string, meta?: Record<string, any>) => void;
  fatal: (msg: string, meta?: Record<string, any>) => void;
  child: (meta: Record<string, any>) => BrowserLogger;
}

function createBrowserLogger(): BrowserLogger {
  const levels = {
    trace: 10,
    debug: 20,
    info: 30,
    warn: 40,
    error: 50,
    fatal: 60,
  };

  const currentLevel =
    levels[process.env.NEXT_PUBLIC_LOG_LEVEL as keyof typeof levels] || levels.info;

  function log(level: keyof typeof levels, message: string, meta?: Record<string, any>) {
    if (levels[level] < currentLevel) return;

    const timestamp = new Date().toISOString();
    const baseMeta = {
      service: serviceName,
      version: serviceVersion,
      env: process.env.NODE_ENV || 'development',
      timestamp,
      level,
    };

    const output = { ...baseMeta, msg: message, ...meta };

    // Use appropriate console method
    switch (level) {
      case 'trace':
      case 'debug':
        console.debug(JSON.stringify(output));
        break;
      case 'info':
        console.info(JSON.stringify(output));
        break;
      case 'warn':
        console.warn(JSON.stringify(output));
        break;
      case 'error':
      case 'fatal':
        console.error(JSON.stringify(output));
        break;
    }
  }

  return {
    trace: (msg: string, meta?: Record<string, any>) => log('trace', msg, meta),
    debug: (msg: string, meta?: Record<string, any>) => log('debug', msg, meta),
    info: (msg: string, meta?: Record<string, any>) => log('info', msg, meta),
    warn: (msg: string, meta?: Record<string, any>) => log('warn', msg, meta),
    error: (msg: string, meta?: Record<string, any>) => log('error', msg, meta),
    fatal: (msg: string, meta?: Record<string, any>) => log('fatal', msg, meta),
    child: (meta: Record<string, any>) => createBrowserLogger().child(meta),
  };
}

/**
 * Create the appropriate logger for the environment
 */
export const logger = isBrowser
  ? createBrowserLogger()
  : pino({
      level: process.env.LOG_LEVEL || 'info',
      timestamp: pino.stdTimeFunctions.isoTime,
      base: {
        service: serviceName,
        version: serviceVersion,
        env: process.env.NODE_ENV || 'development',
      },
      redact: {
        paths: [
          '*.password',
          '*.token',
          '*.secret',
          '*.apiKey',
          '*.api_key',
          '*.authorization',
          '*.cookie',
        ],
        censor: '[REDACTED]',
      },
      transport:
        process.env.NODE_ENV !== 'production'
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'HH:MM:ss Z',
                singleLine: true,
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    });

/**
 * Create a child logger for a specific module/context
 */
export function createModuleLogger(moduleName: string, extraMeta?: Record<string, any>) {
  return logger.child({ module: moduleName, ...extraMeta });
}

export default logger;
