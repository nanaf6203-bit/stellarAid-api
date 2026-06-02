import { Module } from '@nestjs/common';
import { StellarTransactionsService } from './stellar-transactions.service.js';

@Module({
  providers: [StellarTransactionsService],
  exports: [StellarTransactionsService],
})
export class StellarModule {}
