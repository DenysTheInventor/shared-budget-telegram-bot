# shared-budget-telegram-bot

MVP Telegram bot for two people who share one household budget. The bot focuses on a practical **Weekly Financial Center** that summarizes income, expenses, limits, recurring payments, debts, and warnings in UAH while preserving original transaction currencies.

## MVP scope

- Two-user household with owner/member roles.
- Invite second user with an invite code or `/start invite_CODE` link payload.
- Add expenses, income, debts, debt repayments, limits, and recurring payments.
- Track THB, USD, and UAH with conversion to UAH for statistics.
- Fetch Monobank rates when available and fall back to cached/static rates.
- Weekly center, monthly summary, recent transactions, open debts, active recurring payments, and basic reminder planning.
- Basic audit logging for core mutations.

## Commands

- `/start` — create or join a household.
- `/center` — show Weekly Financial Center.
- `/today`, `/week`, `/month` — summaries.
- `/add_expense`, `/add_income`, `/add_debt`, `/add_recurring` — guided examples and quick-add entry points.
- `/debts`, `/recurring`, `/limits`, `/rates`, `/settings`, `/help` — management and help screens.

The bot also accepts simple natural language messages such as `450 THB food`, `salary 40000 UAH`, `debt 500 USD to Alex due 25 May`, and `weekly center`.

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

3. Start PostgreSQL:

   ```bash
   docker compose up -d postgres
   ```

4. Generate Prisma client and run migrations:

   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

5. Start the bot:

   ```bash
   npm run dev
   ```

## Testing and quality

```bash
npm run build
npm test
```

Unit tests cover currency conversion, parser behavior, weekly summaries, category limits, and debt remaining calculations.

## Product direction after MVP

The service layer is intentionally modular so later releases can add Google Sheets export, a web dashboard, AI analytics/parser improvements, and richer notification scheduling without rewriting command handlers.
