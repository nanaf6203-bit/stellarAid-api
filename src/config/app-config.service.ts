import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private configService: ConfigService) {}

  // Application
  get port(): number {
    return this.configService.get<number>('PORT') || 3000;
  }

  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV') || 'development';
  }

  get corsOrigin(): string {
    return (
      this.configService.get<string>('CORS_ORIGIN') || 'http://localhost:3000'
    );
  }

  // Database
  get databaseUrl(): string {
    return this.configService.get<string>('DATABASE_URL') || '';
  }

  // JWT Configuration
  get jwtSecret(): string {
    return this.configService.get<string>('JWT_SECRET') || '';
  }

  get jwtAccessTokenExpiration(): string {
    return (
      this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRATION') || '15m'
    );
  }

  get jwtRefreshTokenExpiration(): string {
    return (
      this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRATION') || '7d'
    );
  }

  // Email Verification
  get emailVerificationTokenExpiration(): string {
    return (
      this.configService.get<string>('EMAIL_VERIFICATION_TOKEN_EXPIRATION') ||
      '24h'
    );
  }

  // Email Service
  get emailService(): string | undefined {
    return this.configService.get<string>('EMAIL_SERVICE');
  }

  get emailApiKey(): string | undefined {
    return this.configService.get<string>('EMAIL_API_KEY');
  }

  get emailFrom(): string | undefined {
    return this.configService.get<string>('EMAIL_FROM');
  }

  // Stellar Network
  get stellarNetwork(): string {
    return this.configService.get<string>('STELLAR_NETWORK') || 'testnet';
  }

  get stellarHorizonUrl(): string | undefined {
    return this.configService.get<string>('STELLAR_HORIZON_URL');
  }

  get stellarPlatformPublicKey(): string | undefined {
    return this.configService.get<string>('STELLAR_PLATFORM_PUBLIC_KEY');
  }

  get stellarPlatformSecret(): string | undefined {
    return this.configService.get<string>('STELLAR_PLATFORM_SECRET');
  }

  // Logging
  get logLevel(): string {
    return this.configService.get<string>('LOG_LEVEL') || 'info';
  }
}
