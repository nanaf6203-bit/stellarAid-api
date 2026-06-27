import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';

interface FauxUser {
  _id: { toString: () => string };
  fullName: string;
  email: string;
  isVerified: boolean;
  emailVerificationToken: string | null;
  emailVerificationExpires: Date | null;
  save: jest.Mock;
}

describe('AuthService.register', () => {
  let auth: AuthService;
  let users: jest.Mocked<Pick<UsersService, 'findByEmail' | 'create'>>;
  let mail: jest.Mocked<Pick<MailService, 'sendVerificationEmail'>>;

  beforeEach(async () => {
    users = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    };
    mail = {
      sendVerificationEmail: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: MailService, useValue: mail },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    auth = moduleRef.get(AuthService);
  });

  it('creates a user, generates a verification token, and emails it', async () => {
    users.findByEmail.mockResolvedValue(null);
    const fauxUser: FauxUser = {
      _id: { toString: () => 'user-id-1' },
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      isVerified: false,
      emailVerificationToken: null,
      emailVerificationExpires: null,
      save: jest.fn(async function (this: FauxUser) {
        return this;
      }),
    };
    users.create.mockResolvedValue(
      fauxUser as unknown as Awaited<ReturnType<UsersService['create']>>,
    );

    const result = await auth.register({
      fullName: 'Ada Lovelace',
      email: 'ADA@example.com  ',
      password: 'superSecret123',
    });

    expect(result.id).toBe('user-id-1');
    expect(result.email).toBe('ada@example.com');
    expect(result.fullName).toBe('Ada Lovelace');
    expect(result.isVerified).toBe(false);

    expect(users.findByEmail).toHaveBeenCalledWith('ada@example.com');
    expect(users.create).toHaveBeenCalledWith({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'superSecret123',
    });

    expect(fauxUser.emailVerificationToken).toMatch(/^[a-f0-9]{64}$/);
    expect(fauxUser.emailVerificationExpires).toBeInstanceOf(Date);
    expect(fauxUser.save).toHaveBeenCalledTimes(1);

    expect(mail.sendVerificationEmail).toHaveBeenCalledTimes(1);
    expect(mail.sendVerificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ada@example.com',
        name: 'Ada Lovelace',
        token: fauxUser.emailVerificationToken,
      }),
    );
  });

  it('throws ConflictException when email is already registered', async () => {
    users.findByEmail.mockResolvedValue({
      _id: 'existing',
    } as unknown as Awaited<ReturnType<UsersService['findByEmail']>>);

    await expect(
      auth.register({
        fullName: 'Existing User',
        email: 'existing@example.com',
        password: 'whatever123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(users.create).not.toHaveBeenCalled();
    expect(mail.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it('still returns success when email delivery fails (logged warning)', async () => {
    users.findByEmail.mockResolvedValue(null);
    const fauxUser: FauxUser = {
      _id: { toString: () => 'user-id-2' },
      fullName: 'Bob',
      email: 'bob@example.com',
      isVerified: false,
      emailVerificationToken: null,
      emailVerificationExpires: null,
      save: jest.fn(async function (this: FauxUser) {
        return this;
      }),
    };
    users.create.mockResolvedValue(
      fauxUser as unknown as Awaited<ReturnType<UsersService['create']>>,
    );
    mail.sendVerificationEmail.mockRejectedValue(new Error('SMTP down'));

    const result = await auth.register({
      fullName: 'Bob',
      email: 'bob@example.com',
      password: 'superSecret123',
    });
    expect(result.email).toBe('bob@example.com');
  });
});
