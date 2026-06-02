import { Module } from '@nestjs/common';
import { SorobanService } from './soroban.service';
import { StellarEventService } from './stellar-event.service';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [PrismaModule, QueueModule],
  providers: [SorobanService, StellarEventService],
  exports: [SorobanService, StellarEventService],
})
export class StellarModule {}
