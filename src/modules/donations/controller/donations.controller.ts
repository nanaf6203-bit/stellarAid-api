import { Controller, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { StellarService } from '../services/stellar.service';
import { VerifyTransactionDto } from '../dto/verify-transaction.dto';
import { VerificationResult } from '../interfaces/stellar-verification.interface';

@Controller('donations')
export class DonationsController {
  constructor(private readonly stellarService: StellarService) {}

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyTransaction(@Body() verifyDto: VerifyTransactionDto): Promise<VerificationResult> {
    return this.stellarService.verifyTransaction(verifyDto.transactionHash, {
      expectedRecipient: verifyDto.expectedRecipient,
    return this.stellarService.verifyTransaction(verifyDto.transactionHash, {
      expectedRecipient: verifyDto.expectedRecipient,
      expectedAmount: verifyDto.expectedAmount,
      expectedAsset: verifyDto.asset,
      allowOverpayment: verifyDto.allowOverpayment,
      tolerancePercentage: verifyDto.tolerancePercentage,
    });
  }

  @Get('verify/:transactionHash')
  async verifyTransactionByHash(@Param('transactionHash') transactionHash: string): Promise<VerificationResult> {
    return this.stellarService.verifyTransaction(transactionHash);
  }

  @Get('asset/:assetCode/:issuer?')
  async getAssetInfo(
    @Param('assetCode') assetCode: string,
    @Param('issuer') issuer?: string,
  ): Promise<any> {
    return this.stellarService.getAssetInfo(assetCode, issuer);
  }

  @Get('account/:accountId/exists')
  @ApiOperation({ summary: 'Check if Stellar account exists' })
  @ApiResponse({ status: 200, description: 'Account existence checked successfully' })
  @ApiResponse({ status: 400, description: 'Invalid account ID' })
  async checkAccountExists(@Param('accountId') accountId: string): Promise<{ exists: boolean }> {
    const exists = await this.stellarService.accountExists(accountId);
    return { exists };
  }
}
