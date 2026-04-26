import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './database/prisma.module';
import { RequestLoggerMiddleware } from './common/middleware';
import { winstonConfig } from './config/winston.config';
import { AppConfigurationModule } from './config/app-configuration.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AdminModule } from './modules/admin/admin.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { DonationsModule } from './modules/donations/donations.module';
import { JwtAuthGuard, RolesGuard } from './modules/auth';

@Module({
  imports: [
    AppConfigurationModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    AdminModule,
    ProjectsModule,
    DonationsModule,
    WinstonModule.forRoot(winstonConfig),
    DonationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
