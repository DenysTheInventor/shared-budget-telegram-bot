# Architecture

## Stack

- Node.js + TypeScript in strict mode.
- grammY for Telegram bot commands and inline buttons.
- PostgreSQL for persistence.
- Prisma ORM for schema, migrations, and typed database access.
- Vitest for fast unit tests.
- Docker Compose for local PostgreSQL.

## Directory layout

```text
src/
  bot/             grammY bot factory and lifecycle
  commands/        Telegram command registration
  handlers/        Natural language and callback handlers
  services/        Product/business logic
  repositories/    Thin database access helpers
  middlewares/     Context enrichment and error handling
  utils/           Date, formatting, parsing helpers
  jobs/            Reminder and recurring-payment job entry points
  config/          Environment, logger, Prisma client
prisma/            Prisma schema and migrations
tests/             Unit tests
docs/              Future detailed product/ops docs
```

## Design principles

1. Keep Telegram UX thin: commands parse input, call services, and format replies.
2. Keep all money calculations in services and persist both original and converted values.
3. Use UAH as the statistics currency while supporting THB, USD, and UAH records.
4. Make the parser replaceable: `parseBudgetMessage` returns a simple normalized object that can later be produced by an AI parser.
5. Keep the first reminder implementation basic and database-backed, with room for a real queue later.

## Major services

- `ExchangeRateService` fetches Monobank rates, caches them, and converts amounts to UAH.
- `TransactionService` manages expenses/income and weekly/monthly summaries.
- `DebtService` manages debts, repayments, remaining balances, and status updates.
- `LimitService` manages weekly/monthly/custom limits and warning thresholds.
- `RecurringPaymentService` stores active recurring payments and upcoming items.
- `WeeklyFinancialCenterService` composes the main weekly dashboard message.
- `HouseholdService` creates households, invite codes, memberships, default categories, and permission checks.
- `NotificationService` schedules basic reminders and limit warnings.
