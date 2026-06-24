import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthChallengeController } from './auth-challenge.controller';
import { AuthVerifyController } from './auth-verify.controller';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'stellaraid-default-secret'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
    PrismaModule,
  ],
  controllers: [AuthChallengeController, AuthVerifyController],
  providers: [JwtStrategy],
  exports: [JwtModule],
})
export class AuthModule {}
