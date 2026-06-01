import { Injectable, Logger } from '@nestjs/common';

export interface SuspensionEmailPayload {
  toEmail: string;
  campaignId: string;
  campaignTitle: string;
  reason: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  /**
   * Sends a suspension notice to the campaign creator.
   * Replace the logger stub with a real mailer (e.g. nodemailer / @nestjs-modules/mailer)
   * when an SMTP transport is configured.
   */
  async sendCampaignSuspensionEmail(payload: SuspensionEmailPayload): Promise<void> {
    this.logger.log(
      `[EMAIL] To: ${payload.toEmail} | Subject: Your campaign "${payload.campaignTitle}" has been suspended | Reason: ${payload.reason}`,
    );
    // TODO: replace with real mailer call, e.g.:
    // await this.mailerService.sendMail({
    //   to: payload.toEmail,
    //   subject: `Your campaign "${payload.campaignTitle}" has been suspended`,
    //   template: 'campaign-suspension',
    //   context: { campaignTitle: payload.campaignTitle, reason: payload.reason },
    // });
  }
}
