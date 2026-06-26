import { Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerOptions } from '@nestjs/throttler';

@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    return Promise.resolve(req.ip);
  }

  protected async getOptions(): Promise<ThrottlerOptions[]> {
    return [
      {
        name: 'auth',
        ttl: 15 * 60 * 1000,
        limit: 10,
      },
    ];
  }
}
