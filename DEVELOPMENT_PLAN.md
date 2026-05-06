# Development plan

## Step 1 — Project setup

- Create TypeScript, Prisma, Docker Compose, dotenv, and bot bootstrap.
- Implement `/start`, health-safe startup, and PostgreSQL connection plumbing.

## Step 2 — Household and invites

- Create first household for owner.
- Generate invite code/link for second user.
- Join household from invite payload.
- Enforce maximum two members in MVP.

## Step 3 — Categories, transactions, conversion

- Seed default categories per household.
- Add expenses and income from commands or simple natural language.
- Fetch Monobank rates, cache latest values, and persist conversion details.

## Step 4 — Weekly Financial Center

- Calculate weekly totals, balance, safe-to-spend per day, category limit progress, upcoming recurring payments/debts, top categories, top expenses, and warnings.

## Step 5 — Debts

- Add debt, add repayments, calculate remaining balance, and auto-close fully paid debts.

## Step 6 — Limits

- Create/update weekly and monthly category limits.
- Calculate remaining budget and detect 50%, 80%, 100%, and over-limit states.

## Step 7 — Recurring payments

- Create recurring payments.
- List active/upcoming recurring payments.
- Leave automatic transaction creation behind a confirmation flag for MVP safety.

## Step 8 — Reminders

- Add basic notification records for debts, recurring payments, daily reminders, weekly summaries, and limit warnings.

## Step 9 — Tests

- Unit tests for conversion, parsing, weekly summary, limit status, and debt remaining calculations.
- Add integration tests once a CI database is available.
