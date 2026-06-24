import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { Horizon } from '@stellar/stellar-sdk';

const ACCOUNT_CACHE_TTL = 30_000; // 30 s
const TX_CACHE_TTL = 60_000; // 60 s

@Injectable()
export class HorizonService {
  private readonly server: Horizon.Server;
  private readonly logger = new Logger(HorizonService.name);

  constructor(
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    const url =
      this.config.get<string>('STELLAR_HORIZON_URL') ??
      'https://horizon-testnet.stellar.org';
    this.server = new Horizon.Server(url, { allowHttp: url.startsWith('http://') });
  }

  /** Load account info with caching (30 s TTL). */
  async loadAccount(accountId: string): Promise<Horizon.AccountResponse> {
    const key = `horizon:account:${accountId}`;
    const cached = await this.cache.get<Horizon.AccountResponse>(key);
    if (cached) return cached;

    const account = await this.withRetry(() => this.server.loadAccount(accountId));
    await this.cache.set(key, account, ACCOUNT_CACHE_TTL);
    return account;
  }

  /** Fetch transaction by hash with caching (60 s TTL). */
  async getTransaction(txHash: string): Promise<Horizon.ServerApi.TransactionRecord> {
    const key = `horizon:tx:${txHash}`;
    const cached = await this.cache.get<Horizon.ServerApi.TransactionRecord>(key);
    if (cached) return cached;

    const tx = await this.withRetry(() =>
      this.server.transactions().transaction(txHash).call(),
    );
    await this.cache.set(key, tx, TX_CACHE_TTL);
    return tx;
  }

  /** Fetch operations for a transaction. */
  async getTransactionOperations(
    txHash: string,
  ): Promise<Horizon.ServerApi.OperationRecord[]> {
    const key = `horizon:tx-ops:${txHash}`;
    const cached = await this.cache.get<Horizon.ServerApi.OperationRecord[]>(key);
    if (cached) return cached;

    const page = await this.withRetry(() =>
      this.server.operations().forTransaction(txHash).limit(200).call(),
    );
    const records = page.records;
    await this.cache.set(key, records, TX_CACHE_TTL);
    return records;
  }

  /** Expose the raw Horizon.Server for callers that need full access. */
  getServer(): Horizon.Server {
    return this.server;
  }

  private async withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
    let lastErr: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        const isRetryable =
          err instanceof Error &&
          (err.message.includes('429') || err.message.includes('503') || err.message.includes('timeout'));
        if (!isRetryable || attempt === maxAttempts) throw err;
        const delay = 300 * Math.pow(2, attempt - 1);
        this.logger.warn(`Horizon retry ${attempt}/${maxAttempts} in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw new ServiceUnavailableException(`Horizon unavailable after ${maxAttempts} attempts`, { cause: lastErr });
  }
}
