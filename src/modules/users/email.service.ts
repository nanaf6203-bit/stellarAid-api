import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendPasswordChangeConfirmation(email: string, userId: string): Promise<void> {
    this.logger.log(`Password change confirmation email would be sent to ${email} (user: ${userId})`);
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    // TODO: Implement actual email sending (SendGrid, AWS SES, SMTP)
    this.logger.log(`Password reset email would be sent to ${email} with token: ${token}`);
  }

  async sendKycStatusEmail(email: string, status: string): Promise<void> {
    this.logger.log(`KYC status update email (${status}) would be sent to ${email}`);
  }

  async sendProjectApprovalEmail(creatorEmail: string, projectTitle: string, remarks?: string): Promise<void> {
    this.logger.log(
      `Project approval email would be sent to ${creatorEmail} for project: ${projectTitle}. Remarks: ${remarks || 'None'}`,
    );
    // TODO: Implement actual email sending with project details and approval confirmation
  }

  async sendProjectRejectionEmail(
    creatorEmail: string,
    projectTitle: string,
    rejectionReason: string,
  ): Promise<void> {
    this.logger.log(
      `Project rejection email would be sent to ${creatorEmail} for project: ${projectTitle}. Reason: ${rejectionReason}`,
    );
    // TODO: Implement actual email sending with rejection reason and appeal instructions
  }

  async sendWithdrawalRequestSubmittedToAdmin(
    adminEmail: string,
    projectTitle: string,
    amount: string,
    creatorEmail: string,
  ): Promise<void> {
    this.logger.log(
      `Withdrawal request alert would be sent to admin ${adminEmail}. Project: ${projectTitle}, Amount: ${amount}, Creator: ${creatorEmail}`,
    );
  }

  async sendWithdrawalApprovedEmail(
    creatorEmail: string,
    projectTitle: string,
    amount: string,
    transactionHash?: string,
  ): Promise<void> {
    this.logger.log(
      `Withdrawal approval email would be sent to ${creatorEmail}. Project: ${projectTitle}, Amount: ${amount}, Tx: ${transactionHash || 'pending'}`,
    );
  }

  async sendWithdrawalRejectedEmail(
    creatorEmail: string,
    projectTitle: string,
    amount: string,
    reason: string,
  ): Promise<void> {
    this.logger.log(
      `Withdrawal rejection email would be sent to ${creatorEmail}. Project: ${projectTitle}, Amount: ${amount}, Reason: ${reason}`,
    );
  }
}
