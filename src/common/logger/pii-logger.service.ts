import { Injectable, LoggerService } from '@nestjs/common';

@Injectable()
export class PiiLoggerService implements LoggerService {
  private maskWalletAddress(str: string): string {
    return str.replace(/G[A-Z2-7]{55}/g, (addr) => `${addr.slice(0, 4)}...${addr.slice(-4)}`);
  }

  private maskEmail(str: string): string {
    return str.replace(/[\w.+-]+@[\w-]+\.[\w.]+/gi, (email) => {
      const [local, domain] = email.split('@');
      return `${local.slice(0, 2)}***@${domain}`;
    });
  }

  private maskJwt(str: string): string {
    return str.replace(
      /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g,
      '[JWT_REDACTED]',
    );
  }

  private scrub(message: unknown): string {
    return this.maskJwt(this.maskEmail(this.maskWalletAddress(String(message))));
  }

  log(message: unknown, context?: string): void {
    console.log(`[${context ?? 'App'}] ${this.scrub(message)}`);
  }

  error(message: unknown, trace?: string, context?: string): void {
    console.error(`[${context ?? 'App'}] ${this.scrub(message)}`, trace);
  }

  warn(message: unknown, context?: string): void {
    console.warn(`[${context ?? 'App'}] ${this.scrub(message)}`);
  }

  debug(message: unknown, context?: string): void {
    console.debug(`[${context ?? 'App'}] ${this.scrub(message)}`);
  }

  verbose(message: unknown, context?: string): void {
    console.log(`[${context ?? 'App'}] ${this.scrub(message)}`);
  }
}
