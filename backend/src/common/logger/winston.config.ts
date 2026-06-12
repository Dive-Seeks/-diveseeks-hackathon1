import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import * as path from 'path';
import { trace } from '@opentelemetry/api';

export const winstonConfig: WinstonModuleOptions = {
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.ms(),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, context, ms }) => {
          const ctx = (context as string) || 'Application';
          const ts = (timestamp as string) || '';
          const lvl = level || '';
          const msg = (message as string) || '';
          const msec = (ms as string) || '';

          const activeSpan = trace.getActiveSpan();
          const traceId = activeSpan?.spanContext().traceId ?? 'no-trace';

          return `[DivePOS] ${ts} ${lvl} [${ctx}] [traceId: ${traceId}] ${msg} ${msec}`;
        }),
      ),
    }),
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs/error.log'),
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs/combined.log'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  ],
};
