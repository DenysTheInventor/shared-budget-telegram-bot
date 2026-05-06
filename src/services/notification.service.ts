import type { PrismaClient } from '@prisma/client';

export class NotificationService {
  constructor(private readonly prisma: PrismaClient) {}

  async schedule(input: { householdId: string; userId: string; type: string; payload: unknown; scheduledAt: Date }) {
    return this.prisma.notification.create({
      data: { householdId: input.householdId, userId: input.userId, type: input.type, payloadJson: input.payload ?? {}, scheduledAt: input.scheduledAt, status: 'PENDING' },
    });
  }

  async pending(now = new Date()) {
    return this.prisma.notification.findMany({ where: { status: 'PENDING', scheduledAt: { lte: now } }, orderBy: { scheduledAt: 'asc' } });
  }
}
