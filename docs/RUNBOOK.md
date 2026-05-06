# Runbook: как запустить рабочего Telegram-бота

Этот документ описывает минимальный путь от репозитория до реально работающего Telegram-бота в режиме long polling. Для MVP отдельный webhook/server не нужен: процесс `npm run dev` или `npm start` сам подключается к Telegram Bot API и слушает обновления.

## 1. Что нужно заранее

- Node.js 22 LTS или совместимая актуальная версия Node.js.
- npm.
- Docker и Docker Compose для локального PostgreSQL.
- Telegram-аккаунт с доступом к [@BotFather](https://t.me/BotFather).
- Сетевой доступ к npm registry, Telegram Bot API и Monobank API.

## 2. Создать Telegram-бота

1. Откройте Telegram и напишите `@BotFather`.
2. Выполните `/newbot`.
3. Задайте display name и username бота.
4. Скопируйте token вида `123456789:AA...` — это значение для `BOT_TOKEN`.
5. Не коммитьте token в репозиторий и не отправляйте его в чат.

## 3. Подготовить `.env`

Скопируйте пример окружения:

```bash
cp .env.example .env
```

Заполните минимум:

```dotenv
BOT_TOKEN=telegram_token_from_botfather
DATABASE_URL=postgresql://budget:budget@localhost:5432/shared_budget?schema=public
MONOBANK_API_URL=https://api.monobank.ua/bank/currency
DEFAULT_TIMEZONE=Europe/Kyiv
NODE_ENV=development
```

## 4. Установить зависимости

```bash
npm install
```

Если этот шаг падает с `403`, `ETIMEDOUT` или proxy-ошибками, бот не сможет собраться. Нужно сначала починить доступ к npm registry или настроить корпоративный npm mirror.

## 5. Запустить PostgreSQL

```bash
docker compose up -d postgres
```

Проверить контейнер:

```bash
docker compose ps
```

## 6. Подготовить Prisma

Сгенерируйте Prisma Client:

```bash
npm run prisma:generate
```

Примените миграцию к локальной базе:

```bash
npm run prisma:migrate
```

Для ручной проверки данных можно открыть Prisma Studio:

```bash
npm run prisma:studio
```

## 7. Проверить качество перед запуском

```bash
npm run build
npm test
```

Оба шага должны проходить до тестирования бота вручную. Если build падает, сначала исправьте TypeScript/Prisma ошибки.

## 8. Запустить бота локально

Development режим с автоперезапуском:

```bash
npm run dev
```

Production-like режим:

```bash
npm run build
npm start
```

После запуска в логах должно быть сообщение `Shared Budget Telegram bot started`.

## 9. Проверить основной пользовательский сценарий

1. Откройте созданного бота в Telegram.
2. Отправьте `/start`.
3. Бот должен создать household, показать invite code и кнопку Weekly Center.
4. Отправьте `/invite`, если нужен новый invite для второго пользователя.
5. Со второго Telegram-аккаунта отправьте `/start invite_CODE`.
6. Добавьте расход: `450 THB food`.
7. Добавьте доход: `salary 40000 UAH`.
8. Добавьте долг: `debt 500 USD to Alex due 25 May`.
9. Добавьте лимит: `/limits food 6000 weekly`.
10. Откройте `/center` и проверьте Weekly Financial Center.

## 10. Минимальный production запуск

Для MVP достаточно long polling процесса на VPS/Render/Fly.io/Railway/Docker host:

1. Создайте production PostgreSQL.
2. Установите production `DATABASE_URL` и `BOT_TOKEN`.
3. Выполните `npm ci` или `npm install`.
4. Выполните `npm run prisma:generate`.
5. Примените миграции командой `npx prisma migrate deploy`.
6. Выполните `npm run build`.
7. Запустите `npm start` под process manager (`systemd`, Docker restart policy, PM2 или platform worker).

Важно: одновременно должен работать только один polling-процесс для одного `BOT_TOKEN`, иначе Telegram updates будут конфликтовать.

## 11. Типовые проблемы

- `BOT_TOKEN is required` — не заполнен `.env` или переменная окружения не передана процессу.
- `PrismaClientInitializationError` — PostgreSQL не запущен, неверный `DATABASE_URL` или миграции не применены.
- Бот не отвечает — проверьте, что процесс жив, token корректный, нет второго polling-процесса с тем же token, есть доступ к Telegram API.
- Курсы не обновляются — Monobank недоступен; сервис должен использовать cached/static fallback, но точность статистики будет ниже.
- `npm install` падает — исправьте доступ к registry до любых дальнейших шагов.
