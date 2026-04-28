import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LogsQueryDto } from './dto/logs-query.dto';

@Injectable()
export class AdminLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async getLogs(query: LogsQueryDto) {
    const { action, startDate, endDate, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (action) where.action = action;
    if (startDate && endDate) {
      where.createdAt = { gte: new Date(startDate), lte: new Date(endDate) };
    }

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.adminLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { admin: { select: { id: true, firstName: true, lastName: true, email: true } } },
      }),
      this.prisma.adminLog.count({ where }),
    ]);

    return { data: logs, total, page, limit };
  }

  async exportCsv(query: LogsQueryDto): Promise<string> {
    const { data } = await this.getLogs({ ...query, limit: 10000 });
    const header = 'id,adminId,adminEmail,action,target,details,createdAt';
    const rows = data.map((l: any) =>
      [l.id, l.adminId, l.admin?.email ?? '', l.action, l.target ?? '', (l.details ?? '').replace(/,/g, ';'), l.createdAt.toISOString()].join(','),
    );
    return [header, ...rows].join('\n');
  }

  async createLog(adminId: string, action: string, target?: string, details?: string) {
    return this.prisma.adminLog.create({
      data: { adminId, action, target, details },
    });
  }
}
