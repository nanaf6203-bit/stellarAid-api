import { Module } from '@nestjs/common';
import { SorobanService } from './soroban.service';
import { StellarEventService } from './stellar-event.service';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from '../queue/queue.module';
import { StellarTransactionsService } from './stellar-transactions.service';
import { HorizonService } from './horizon.service';
import { StellarController } from './stellar.controller';

@Module({
  imports: [PrismaModule, QueueModule],
  controllers: [StellarController],
  providers: [SorobanService, StellarEventService, StellarTransactionsService, HorizonService],
  exports: [SorobanService, StellarEventService, StellarTransactionsService, HorizonService],
})
export class StellarModule {}
