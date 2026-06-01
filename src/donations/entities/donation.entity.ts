import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Campaign } from '../../campaigns/entities/campaign.entity';

@Entity('donations')
export class Donation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  campaignId: string;

  @ManyToOne(() => Campaign, (campaign) => campaign.donations)
  @JoinColumn({ name: 'campaignId' })
  campaign: Campaign;

  @Column()
  donorId: string;

  /** Stellar asset code, e.g. "XLM" or "USDC" */
  @Column({ default: 'XLM' })
  assetCode: string;

  @Column({ nullable: true })
  assetIssuer: string;

  @Column({ type: 'decimal', precision: 18, scale: 7 })
  amount: number;

  /** Stellar transaction hash */
  @Column({ nullable: true })
  txHash: string;

  @CreateDateColumn()
  createdAt: Date;
}
