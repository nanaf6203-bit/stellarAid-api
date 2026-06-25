import { PiiLoggerService } from './pii-logger.service';

describe('PiiLoggerService', () => {
  let logger: PiiLoggerService;

  beforeEach(() => {
    logger = new PiiLoggerService();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('masks Stellar wallet addresses', () => {
    const wallet = 'GBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
    logger.log(wallet);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('...'));
    expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining(wallet));
  });

  it('masks email addresses', () => {
    logger.log('user@example.com logged in');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('***@'));
  });

  it('redacts JWT tokens', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.SflKxwRJSMeKKF2QT4fwpMeJf36';
    logger.log(jwt);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[JWT_REDACTED]'));
  });

  it('passes through non-PII messages unchanged', () => {
    logger.log('Campaign created successfully');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Campaign created successfully'));
  });
});
