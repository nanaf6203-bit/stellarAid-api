import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
}

export interface RegisterResult {
  id: string;
  fullName: string;
  email: string;
  isVerified: boolean;
}

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private readonly configService: ConfigService,
  ) {}

  async register(input: RegisterInput): Promise<RegisterResult> {
    const normalized = input.email.toLowerCase().trim();

    const existing = await this.usersService.findByEmail(normalized);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const user = await this.usersService.create({
      fullName: input.fullName,
      email: normalized,
      password: input.password,
    });

    const token = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = token;
    user.emailVerificationExpires = new Date(Date.now() + VERIFICATION_TTL_MS);
    await user.save();

    try {
      await this.mailService.sendVerificationEmail({
        to: user.email,
        name: user.fullName,
        token,
      });
    } catch (err) {
      this.logger.warn(
        `Failed to send verification email to ${user.email}: ${(err as Error).message}`,
      );
    }

    return {
      id: user._id?.toString() ?? '',
      fullName: user.fullName,
      email: user.email,
      isVerified: user.isVerified,
    };
  }
}
