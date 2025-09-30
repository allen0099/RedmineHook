import { config } from './config';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private formatMessage(level: LogLevel, ...args: any[]): string {
    const now = new Date().toISOString();
    const prefix = `[${level.toUpperCase()}] [${now}]`;
    return `${prefix} ${args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ')}`;
  }

  info(...args: any[]): void {
    console.log(this.formatMessage('info', ...args));
  }

  warn(...args: any[]): void {
    console.warn(this.formatMessage('warn', ...args));
  }

  error(...args: any[]): void {
    console.error(this.formatMessage('error', ...args));
  }

  debug(...args: any[]): void {
    if (config.debug) {
      console.log(this.formatMessage('debug', ...args));
    }
  }
}

export const logger = new Logger();
