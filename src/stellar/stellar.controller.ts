import { Controller, Get, Inject, Param } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { HorizonService } from './horizon.service';
import { Horizon } from '@stellar/stellar-sdk';

const WALLET_BALANCE_TTL = 10_000; // 10 s per acceptance criteria

@Controller('stellar')
export class StellarController {
  constructor(
    private readonly horizonService: HorizonService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  /**
   * GET /stellar/balance/:walletAddress
   * Returns all trustline balances for a Stellar wallet.
   * Fetched from Horizon, cached per wallet for 10 seconds.
   */
  @Get('balance/:walletAddress')
  async getWalletBalance(
    @Param('walletAddress') walletAddress: string,
  ): Promise<{ asset: string; balance: string; limit: string | null }[]> {
    const cacheKey = `wallet:balance:${walletAddress}`;
    const cached = await this.cache.get<{ asset: string; balance: string; limit: string | null }[]>(cacheKey);
    if (cached) return cached;

    const server = this.horizonService.getServer();
    let account: Horizon.AccountResponse;
    try {
      account = await server.loadAccount(walletAddress);
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.message?.includes('404')) {
        return [];
      }
      throw err;
    }

    const result = account.balances.map((b) => {
      const asset = b.asset_type === 'native' ? 'XLM' : `${(b as any).asset_code}:${(b as any).asset_issuer}`;
      const limit = b.asset_type === 'native' ? null : String((b as any).limit ?? '');
      return { asset, balance: b.balance, limit };
    });

    await this.cache.set(cacheKey, result, WALLET_BALANCE_TTL);
    return result;
  }
}
