import type { PrismaClient, User } from '@prisma/client';
import { addDays } from 'date-fns';
import { nanoid } from 'nanoid';
import { CategoryService } from './category.service.js';

export class HouseholdService {
  private readonly categories: CategoryService;

  constructor(private readonly prisma: PrismaClient) {
    this.categories = new CategoryService(prisma);
  }

  async upsertTelegramUser(input: { telegramId: string; username?: string; firstName?: string }): Promise<User> {
    return this.prisma.user.upsert({
      where: { telegramId: input.telegramId },
      create: input,
      update: { username: input.username, firstName: input.firstName },
    });
  }

  async getHouseholdForUser(userId: string) {
    const member = await this.prisma.householdMember.findFirst({ where: { userId }, include: { household: true } });
    return member?.household;
  }

  async createHouseholdForUser(userId: string, name = 'Shared household') {
    const existing = await this.getHouseholdForUser(userId);
    if (existing) return existing;
    const household = await this.prisma.household.create({
      data: { name, members: { create: { userId, role: 'OWNER' } } },
    });
    await this.categories.ensureDefaultCategories(household.id);
    await this.audit(household.id, userId, 'CREATE', 'Household', household.id, undefined, household);
    return household;
  }

  async createInvite(userId: string): Promise<{ code: string; expiresAt: Date; householdId: string }> {
    const household = await this.getHouseholdForUser(userId);
    if (!household) throw new Error('Create a household first with /start.');
    const members = await this.prisma.householdMember.count({ where: { householdId: household.id } });
    if (members >= 2) throw new Error('MVP households support only two users.');
    const invite = await this.prisma.invite.create({
      data: { householdId: household.id, code: nanoid(8), createdByUserId: userId, expiresAt: addDays(new Date(), 7) },
    });
    await this.audit(household.id, userId, 'CREATE', 'Invite', invite.id, undefined, invite);
    return { code: invite.code, expiresAt: invite.expiresAt, householdId: household.id };
  }

  async joinByInvite(userId: string, code: string) {
    const invite = await this.prisma.invite.findUnique({ where: { code } });
    if (!invite || invite.usedAt || invite.expiresAt < new Date()) throw new Error('Invite code is invalid or expired.');
    const members = await this.prisma.householdMember.count({ where: { householdId: invite.householdId } });
    if (members >= 2) throw new Error('This household already has two members.');
    const membership = await this.prisma.householdMember.create({ data: { householdId: invite.householdId, userId, role: 'MEMBER' } });
    await this.prisma.invite.update({ where: { id: invite.id }, data: { usedAt: new Date() } });
    await this.audit(invite.householdId, userId, 'JOIN', 'Household', invite.householdId, undefined, membership);
    return membership;
  }

  async requireHousehold(userId: string): Promise<string> {
    const household = await this.getHouseholdForUser(userId);
    if (!household) throw new Error('No household yet. Use /start to create one or join an invite.');
    return household.id;
  }

  async audit(householdId: string, userId: string, action: string, entityType: string, entityId: string, beforeJson?: unknown, afterJson?: unknown): Promise<void> {
    await this.prisma.auditLog.create({
      data: { householdId, userId, action, entityType, entityId, beforeJson: beforeJson ?? undefined, afterJson: afterJson ?? undefined },
    });
  }
}
