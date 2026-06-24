export class AuditLog {
  id: string;
  action: string;
  actorId: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}
