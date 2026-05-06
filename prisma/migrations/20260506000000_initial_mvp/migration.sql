-- Initial MVP schema for shared-budget-telegram-bot.
CREATE TYPE "HouseholdRole" AS ENUM ('OWNER', 'MEMBER');
CREATE TYPE "CategoryType" AS ENUM ('EXPENSE', 'INCOME');
CREATE TYPE "CurrencyCode" AS ENUM ('THB', 'USD', 'UAH');
CREATE TYPE "DebtStatus" AS ENUM ('OPEN', 'PARTIALLY_PAID', 'CLOSED', 'OVERDUE');
CREATE TYPE "DebtPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "LimitPeriod" AS ENUM ('WEEKLY', 'MONTHLY', 'CUSTOM');
CREATE TYPE "RecurringFrequency" AS ENUM ('WEEKLY', 'MONTHLY', 'EVERY_X_DAYS', 'CUSTOM');

CREATE TABLE "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "telegramId" TEXT NOT NULL UNIQUE,
  "username" TEXT,
  "firstName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "Household" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "baseCurrency" "CurrencyCode" NOT NULL DEFAULT 'UAH',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "HouseholdMember" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "householdId" TEXT NOT NULL REFERENCES "Household"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "role" "HouseholdRole" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HouseholdMember_householdId_userId_key" UNIQUE ("householdId", "userId")
);
CREATE INDEX "HouseholdMember_userId_idx" ON "HouseholdMember"("userId");

CREATE TABLE "Invite" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "householdId" TEXT NOT NULL REFERENCES "Household"("id") ON DELETE CASCADE,
  "code" TEXT NOT NULL UNIQUE,
  "createdByUserId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Category" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "householdId" TEXT NOT NULL REFERENCES "Household"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "type" "CategoryType" NOT NULL,
  "emoji" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Category_householdId_name_type_key" UNIQUE ("householdId", "name", "type")
);
CREATE INDEX "Category_householdId_type_idx" ON "Category"("householdId", "type");

CREATE TABLE "Transaction" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "householdId" TEXT NOT NULL REFERENCES "Household"("id") ON DELETE CASCADE,
  "addedByUserId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "type" "CategoryType" NOT NULL,
  "categoryId" TEXT NOT NULL REFERENCES "Category"("id"),
  "originalAmount" DECIMAL(14,2) NOT NULL,
  "originalCurrency" "CurrencyCode" NOT NULL,
  "convertedAmountUAH" DECIMAL(14,2) NOT NULL,
  "exchangeRate" DECIMAL(18,8) NOT NULL,
  "exchangeRateSource" TEXT NOT NULL,
  "exchangeRateTimestamp" TIMESTAMP(3) NOT NULL,
  "note" TEXT,
  "transactionDate" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3)
);
CREATE INDEX "Transaction_householdId_transactionDate_idx" ON "Transaction"("householdId", "transactionDate");
CREATE INDEX "Transaction_householdId_type_idx" ON "Transaction"("householdId", "type");

CREATE TABLE "Debt" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "householdId" TEXT NOT NULL REFERENCES "Household"("id") ON DELETE CASCADE,
  "addedByUserId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "creditorName" TEXT NOT NULL,
  "originalAmount" DECIMAL(14,2) NOT NULL,
  "originalCurrency" "CurrencyCode" NOT NULL,
  "convertedAmountUAH" DECIMAL(14,2) NOT NULL,
  "exchangeRate" DECIMAL(18,8) NOT NULL,
  "exchangeRateSource" TEXT NOT NULL,
  "exchangeRateTimestamp" TIMESTAMP(3) NOT NULL,
  "dueDate" TIMESTAMP(3),
  "status" "DebtStatus" NOT NULL DEFAULT 'OPEN',
  "priority" "DebtPriority" NOT NULL DEFAULT 'MEDIUM',
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3)
);
CREATE INDEX "Debt_householdId_status_idx" ON "Debt"("householdId", "status");
CREATE INDEX "Debt_householdId_dueDate_idx" ON "Debt"("householdId", "dueDate");

CREATE TABLE "DebtPayment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "debtId" TEXT NOT NULL REFERENCES "Debt"("id") ON DELETE CASCADE,
  "householdId" TEXT NOT NULL REFERENCES "Household"("id") ON DELETE CASCADE,
  "addedByUserId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "originalAmount" DECIMAL(14,2) NOT NULL,
  "originalCurrency" "CurrencyCode" NOT NULL,
  "convertedAmountUAH" DECIMAL(14,2) NOT NULL,
  "exchangeRate" DECIMAL(18,8) NOT NULL,
  "exchangeRateSource" TEXT NOT NULL,
  "exchangeRateTimestamp" TIMESTAMP(3) NOT NULL,
  "paymentDate" TIMESTAMP(3) NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Limit" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "householdId" TEXT NOT NULL REFERENCES "Household"("id") ON DELETE CASCADE,
  "categoryId" TEXT NOT NULL REFERENCES "Category"("id") ON DELETE CASCADE,
  "amountUAH" DECIMAL(14,2) NOT NULL,
  "period" "LimitPeriod" NOT NULL,
  "customStartDate" TIMESTAMP(3),
  "customEndDate" TIMESTAMP(3),
  "warning50Sent" BOOLEAN NOT NULL DEFAULT false,
  "warning80Sent" BOOLEAN NOT NULL DEFAULT false,
  "warning100Sent" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Limit_householdId_categoryId_period_key" UNIQUE ("householdId", "categoryId", "period")
);

CREATE TABLE "RecurringPayment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "householdId" TEXT NOT NULL REFERENCES "Household"("id") ON DELETE CASCADE,
  "addedByUserId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "type" "CategoryType" NOT NULL,
  "categoryId" TEXT NOT NULL REFERENCES "Category"("id"),
  "originalAmount" DECIMAL(14,2) NOT NULL,
  "originalCurrency" "CurrencyCode" NOT NULL,
  "note" TEXT,
  "frequency" "RecurringFrequency" NOT NULL,
  "intervalDays" INTEGER,
  "nextRunDate" TIMESTAMP(3) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "autoCreateTransaction" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "RecurringPayment_householdId_isActive_nextRunDate_idx" ON "RecurringPayment"("householdId", "isActive", "nextRunDate");

CREATE TABLE "ExchangeRate" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "baseCurrency" "CurrencyCode" NOT NULL,
  "quoteCurrency" "CurrencyCode" NOT NULL,
  "rate" DECIMAL(18,8) NOT NULL,
  "source" TEXT NOT NULL,
  "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ExchangeRate_baseCurrency_quoteCurrency_fetchedAt_idx" ON "ExchangeRate"("baseCurrency", "quoteCurrency", "fetchedAt");

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "householdId" TEXT NOT NULL REFERENCES "Household"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL,
  "payloadJson" JSONB NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3),
  "status" TEXT NOT NULL
);
CREATE INDEX "Notification_status_scheduledAt_idx" ON "Notification"("status", "scheduledAt");

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "householdId" TEXT NOT NULL REFERENCES "Household"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "beforeJson" JSONB,
  "afterJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AuditLog_householdId_entityType_entityId_idx" ON "AuditLog"("householdId", "entityType", "entityId");
