import { Module } from '@nestjs/common';
import { SorobanService } from './soroban.service';
import { StellarEventService } from './stellar-event.service';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from '../queue/queue.module';
import { StellarTransactionsService } from './stellar-transactions.service';
import { HorizonService } from './horizon.service';

@Module({
  imports: [PrismaModule, QueueModule],
  providers: [SorobanService, StellarEventService, StellarTransactionsService, HorizonService],
  exports: [SorobanService, StellarEventService, StellarTransactionsService, HorizonService],
})
export class StellarModule {}
