import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(query: DashboardQueryDto) {
    const { startDate, endDate } = query;
    const dateFilter = startDate && endDate
      ? { createdAt: { gte: new Date(startDate), lte: new Date(endDate) } }
      : {};

    const [
      totalUsers,
      usersByRole,
      totalProjects,
      projectsByStatus,
      donationStats,
      recentActivity,
    ] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { deletedAt: null, ...dateFilter } }),
      this.prisma.user.groupBy({ by: ['role'], _count: { id: true }, where: { deletedAt: null } }),
      this.prisma.project.count({ where: dateFilter }),
      this.prisma.project.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.donation.aggregate({
        _sum: { amount: true },
        _count: { id: true },
        where: dateFilter,
      }),
      this.prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { admin: { select: { id: true, firstName: true, lastName: true, email: true } } },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        byRole: Object.fromEntries(usersByRole.map((r) => [r.role, r._count.id])),
      },
      projects: {
        total: totalProjects,
        byStatus: Object.fromEntries(projectsByStatus.map((p) => [p.status, p._count.id])),
      },
      donations: {
        total: donationStats._count.id,
        totalAmount: donationStats._sum.amount ?? 0,
      },
      recentActivity,
    };
  }
}
