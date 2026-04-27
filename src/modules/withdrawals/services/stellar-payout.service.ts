import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { Asset, Horizon, Keypair, Networks, Operation, Server, TransactionBuilder } from '@stellar/stellar-sdk';
import { AppConfigService } from '../../../config/app-config.service';

interface PayoutRequest {
  amount: string | number;
  assetCode: string;
  assetIssuer?: string | null;
  destinationAddress: string;
}

@Injectable()
export class StellarPayoutService {
  private readonly logger = new Logger(StellarPayoutService.name);
  private readonly server: Server;

  constructor(private readonly config: AppConfigService) {
    this.server = new Server(
      this.config.stellarHorizonUrl || 'https://horizon-testnet.stellar.org',
    );
  }

  async sendPayout(request: PayoutRequest): Promise<{ transactionHash: string }> {
    const platformSecret = this.config.stellarPlatformSecret;
    if (!platformSecret) {
      throw new InternalServerErrorException('Platform Stellar secret key is not configured');
    }

    try {
      const sourceKeypair = Keypair.fromSecret(platformSecret);
      const configuredPublicKey = this.config.stellarPlatformPublicKey;
      if (configuredPublicKey && configuredPublicKey !== sourceKeypair.publicKey()) {
        throw new InternalServerErrorException('Configured Stellar public key does not match secret key');
      }

      const account = await this.server.loadAccount(sourceKeypair.publicKey());
      const baseFee = await this.server.fetchBaseFee();

      const tx = new TransactionBuilder(account, {
        fee: String(baseFee),
        networkPassphrase: this.getNetworkPassphrase(),
      })
        .addOperation(
          Operation.payment({
            destination: request.destinationAddress,
            amount: this.toStellarAmount(request.amount),
            asset: this.toAsset(request.assetCode, request.assetIssuer),
          }),
        )
        .setTimeout(30)
        .build();

      tx.sign(sourceKeypair);

      const response = await this.server.submitTransaction(tx);
      return { transactionHash: response.hash };
    } catch (error) {
      this.logger.error('Failed to submit Stellar payout transaction', error as Error);

      if (error instanceof Horizon.Error) {
        throw new BadRequestException(`Stellar payout failed: ${error.message}`);
      }

      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }

      throw new InternalServerErrorException('Unable to process Stellar payout transaction');
    }
  }

  private toAsset(assetCode: string, assetIssuer?: string | null) {
    if (!assetCode || assetCode.toUpperCase() === 'XLM') {
      return Asset.native();
    }

    if (!assetIssuer) {
      throw new BadRequestException('Asset issuer is required for non-native assets');
    }

    return new Asset(assetCode, assetIssuer);
  }

  private toStellarAmount(value: string | number): string {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Withdrawal amount must be greater than zero');
    }

    return amount.toFixed(7);
  }

  private getNetworkPassphrase(): string {
    switch ((this.config.stellarNetwork || '').toLowerCase()) {
      case 'public':
        return Networks.PUBLIC;
      case 'futurenet':
        return Networks.FUTURENET;
      case 'testnet':
      default:
        return Networks.TESTNET;
    }
  }
}
