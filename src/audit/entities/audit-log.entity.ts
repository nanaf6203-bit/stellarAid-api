import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The action performed, e.g. "CAMPAIGN_SUSPENDED" */
  @Column()
  action: string;

  /** ID of the admin who performed the action */
  @Column()
  actorId: string;

  /** Entity type affected, e.g. "campaign" */
  @Column()
  targetType: string;

  /** ID of the affected entity */
  @Column()
  targetId: string;

  /** Arbitrary metadata (reason, previous state, etc.) */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
