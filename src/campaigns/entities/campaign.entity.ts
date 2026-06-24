export enum CampaignStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  SUSPENDED = 'suspended',
}

export class Campaign {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  goalAmount: number;
  status: CampaignStatus;
  suspensionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}
