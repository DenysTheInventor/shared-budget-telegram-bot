import type { PrismaClient } from '@prisma/client';

export class NotificationService {
  constructor(private readonly prisma: PrismaClient) {}

  async schedule(input: { householdId: string; userId: string; type: string; payload: unknown; scheduledAt: Date }) {
    return this.prisma.notification.create({
      data: { householdId: input.householdId, userId: input.userId, type: input.type, payloadJson: input.payload ?? {}, scheduledAt: input.scheduledAt, status: 'PENDING' },
    });
  }

  async pending(now = new Date()) {
    return this.prisma.notification.findMany({
      where: { status: 'PENDING', scheduledAt: { lte: now } },
      include: { user: true },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async markSent(notificationId: string, sentAt = new Date()) {
    return this.prisma.notification.update({ where: { id: notificationId }, data: { status: 'SENT', sentAt } });
  }

  async markFailed(notificationId: string, error: unknown) {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { status: 'FAILED', payloadJson: { error: error instanceof Error ? error.message : String(error) } },
    });
  }
}
