import { Injectable, Logger } from '@nestjs/common';

/**
 * Stub MailService used while the nodemailer-backed implementation (#363)
 * is being built. Records every email in `sent` so tests and dev can read
 * what would have been sent, then logs it.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  public readonly sent: Array<{
    to: string;
    subject: string;
    html: string;
  }> = [];

  async sendEmail(args: { to: string; subject: string; html: string }): Promise<void> {
    this.sent.push(args);
    this.logger.log(`(stub) email queued to=${args.to} subject="${args.subject}"`);
  }

  async sendVerificationEmail(args: { to: string; name: string; token: string }): Promise<void> {
    const link = `${process.env.APP_BASE_URL ?? 'http://localhost:3000'}/api/auth/verify-email/${args.token}`;
    const html = `
      <p>Hi ${args.name},</p>
      <p>Welcome to StellarAid. Please verify your email by clicking the link below:</p>
      <p><a href="${link}">${link}</a></p>
      <p>This link expires in 24 hours.</p>
    `;
    return this.sendEmail({ to: args.to, subject: 'Verify your StellarAid email', html });
  }
}
