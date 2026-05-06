import type { CategoryType, PrismaClient } from '@prisma/client';

const defaultCategories = [
  { name: 'Food', type: 'EXPENSE' as const, emoji: '🍔' },
  { name: 'Transport', type: 'EXPENSE' as const, emoji: '🚕' },
  { name: 'Entertainment', type: 'EXPENSE' as const, emoji: '🎮' },
  { name: 'Rent', type: 'EXPENSE' as const, emoji: '🏠' },
  { name: 'Utilities', type: 'EXPENSE' as const, emoji: '💡' },
  { name: 'Subscription', type: 'EXPENSE' as const, emoji: '📺' },
  { name: 'Shopping', type: 'EXPENSE' as const, emoji: '🛍️' },
  { name: 'Health', type: 'EXPENSE' as const, emoji: '💊' },
  { name: 'Other', type: 'EXPENSE' as const, emoji: '📦' },
  { name: 'Salary', type: 'INCOME' as const, emoji: '💼' },
  { name: 'Other income', type: 'INCOME' as const, emoji: '💰' },
];

export class CategoryService {
  constructor(private readonly prisma: PrismaClient) {}

  async ensureDefaultCategories(householdId: string): Promise<void> {
    for (const category of defaultCategories) {
      await this.prisma.category.upsert({
        where: { householdId_name_type: { householdId, name: category.name, type: category.type } },
        create: { ...category, householdId, isDefault: true },
        update: {},
      });
    }
  }

  async findOrCreate(householdId: string, type: CategoryType, name?: string) {
    const normalizedName = this.normalizeName(name, type);
    return this.prisma.category.upsert({
      where: { householdId_name_type: { householdId, name: normalizedName, type } },
      create: { householdId, name: normalizedName, type, emoji: this.emojiFor(normalizedName), isDefault: false },
      update: {},
    });
  }

  private normalizeName(name: string | undefined, type: CategoryType): string {
    if (!name) return type === 'INCOME' ? 'Other income' : 'Other';
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }

  private emojiFor(name: string): string {
    return defaultCategories.find((category) => category.name.toLowerCase() === name.toLowerCase())?.emoji ?? '📦';
  }
}
