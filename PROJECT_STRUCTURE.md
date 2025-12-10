# Структура проекта Token Sale Page

## Обзор проекта

Это полнофункциональное веб-приложение для продажи токенов на блокчейне BSC (Binance Smart Chain) с использованием React, Express и Tailwind CSS.

## Основная структура

```
token-sale-page/
├── client/                          # Frontend приложение (React)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx            # Главная страница с кнопкой перехода
│   │   │   ├── TokenSale.tsx       # Страница продажи токенов (ГЛАВНАЯ)
│   │   │   ├── NotFound.tsx        # Страница 404
│   │   │   └── ...
│   │   ├── components/
│   │   │   ├── Web3/               # Компоненты для работы с кошельками
│   │   │   │   ├── connectors/
│   │   │   │   │   ├── metaMask.ts # Коннектор MetaMask
│   │   │   │   │   └── walletConnect.ts # Коннектор WalletConnect
│   │   │   │   └── ...
│   │   │   ├── ui/                 # UI компоненты (shadcn/ui)
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── tabs.tsx
│   │   │   │   └── ...
│   │   │   ├── DashboardLayout.tsx
│   │   │   └── ...
│   │   ├── types/
│   │   │   └── ethereum.d.ts       # Типы для Web3
│   │   ├── contexts/
│   │   │   └── ThemeContext.tsx
│   │   ├── hooks/
│   │   │   └── useAuth.ts
│   │   ├── lib/
│   │   │   └── trpc.ts             # tRPC клиент
│   │   ├── App.tsx                 # Главный компонент приложения
│   │   ├── main.tsx                # Точка входа
│   │   └── index.css               # Глобальные стили
│   ├── public/                     # Статические файлы
│   │   ├── logo.png
│   │   └── ...
│   ├── index.html                  # HTML шаблон
│   └── vite.config.ts              # Конфиг Vite
│
├── server/                         # Backend приложение (Express + tRPC)
│   ├── routers.ts                  # tRPC роутеры (API endpoints)
│   ├── db.ts                       # Функции для работы с БД
│   ├── auth.logout.test.ts         # Тесты
│   ├── token-sale.test.ts          # Тесты для продажи токенов
│   └── _core/                      # Внутренние модули
│       ├── index.ts                # Точка входа сервера
│       ├── context.ts              # tRPC контекст
│       ├── trpc.ts                 # tRPC конфиг
│       ├── cookies.ts              # Управление cookies
│       ├── env.ts                  # Переменные окружения
│       └── ...
│
├── src/                            # Дополнительные утилиты
│   ├── abi/
│   │   └── token_abi.ts            # ABI вашего токена
│   ├── components/
│   │   └── Web3/
│   │       └── connectors/
│   │           ├── metaMask.ts
│   │           └── walletConnect.ts
│   ├── context/
│   │   └── user_info.tsx           # Контекст информации пользователя
│   └── web-utils/
│       ├── constants.ts            # Константы (адреса, цены)
│       ├── contract_functions.ts   # Функции для работы со смарт-контрактом
│       └── types.ts                # TypeScript типы
│
├── drizzle/                        # Миграции и схема БД
│   ├── schema.ts                   # Схема таблиц БД
│   └── migrations/                 # SQL миграции
│
├── shared/                         # Общий код для client и server
│   └── const.ts                    # Общие константы
│
├── storage/                        # Работа с S3 хранилищем
│   └── index.ts
│
├── .env                            # Переменные окружения (НЕ коммитить!)
├── .env.example                    # Пример .env файла
├── package.json                    # Зависимости и скрипты
├── tsconfig.json                   # Конфиг TypeScript
├── tailwind.config.ts              # Конфиг Tailwind CSS
├── vite.config.ts                  # Конфиг Vite
├── DEPLOYMENT_GUIDE.md             # Это руководство по развертыванию
├── PROJECT_STRUCTURE.md            # Описание структуры проекта
└── README.md                       # Основная документация
```

## Ключевые файлы для редактирования

### 1. **src/web-utils/constants.ts** - Конфигурация токена и цен
```typescript
// Здесь находятся:
// - Адрес вашего токена
// - Адрес кошелька получателя платежей
// - Цена токена ($0.01)
// - Адреса USDC и других токенов
// - RPC ссылка на BSC
```

**Что нужно обновить:**
- `tokenAddress` - адрес вашего токена
- `receiverWallet` - ваш кошелек для получения платежей
- `tokenPrice` - цена одного токена

### 2. **client/src/pages/TokenSale.tsx** - Главная страница продажи
```typescript
// Здесь находится:
// - Интерфейс для подключения кошелька
// - Форма для ввода количества токенов
// - Выбор способа оплаты (BNB/USDC)
// - Кнопка для покупки
// - Отображение баланса и стоимости
```

**Что можно изменить:**
- Дизайн и цвета
- Текст и описания
- Сообщения об ошибках
- Минимальное/максимальное количество токенов

### 3. **client/src/pages/Home.tsx** - Главная страница
```typescript
// Простая посадочная страница с кнопкой "Go to Token Sale"
```

### 4. **src/web-utils/contract_functions.ts** - Функции для работы со смарт-контрактом
```typescript
// Здесь находятся функции:
// - purchaseWithBNB() - покупка за BNB
// - purchaseWithUSDC() - покупка за USDC
// - approveUSDC() - одобрение USDC
// - transferTokens() - отправка токенов
// - getTokenBalance() - получение баланса
```

### 5. **server/routers.ts** - API endpoints
```typescript
// Здесь можно добавить свои API endpoints для:
// - Сохранения информации о покупках
// - Отправки уведомлений
// - Получения статистики продаж
```

### 6. **drizzle/schema.ts** - Схема базы данных
```typescript
// Здесь определены таблицы БД
// По умолчанию есть таблица users
// Можно добавить таблицы для:
// - Покупок (purchases)
// - Транзакций (transactions)
// - Статистики (statistics)
```

## Основные технологии

| Технология | Назначение |
|-----------|-----------|
| **React 19** | Frontend фреймворк |
| **TypeScript** | Типизация кода |
| **Tailwind CSS 4** | Стилизация |
| **Vite** | Сборка и dev сервер |
| **Express** | Backend фреймворк |
| **tRPC** | Type-safe API |
| **Drizzle ORM** | Работа с БД |
| **Web3.js** | Взаимодействие с блокчейном |
| **ethers.js** | Работа с контрактами |
| **shadcn/ui** | UI компоненты |

## Переменные окружения (.env)

```env
# База данных
DATABASE_URL="mysql://user:password@localhost:3306/token_sale_db"

# OAuth (опционально)
VITE_APP_ID="your_app_id"
OAUTH_SERVER_URL="https://api.manus.im"
JWT_SECRET="your_secret"

# Владелец приложения
OWNER_NAME="Your Name"
OWNER_OPEN_ID="your_open_id"

# API ключи
BUILT_IN_FORGE_API_KEY="your_api_key"
VITE_FRONTEND_FORGE_API_KEY="your_frontend_key"

# Настройки приложения
VITE_APP_TITLE="Token Sale"
VITE_APP_LOGO="/logo.png"
```

## Скрипты npm/pnpm

```bash
# Разработка
pnpm dev              # Запуск dev сервера (http://localhost:5173)

# Сборка
pnpm build            # Сборка для продакшена
pnpm preview          # Предпросмотр собранного приложения

# Тестирование
pnpm test             # Запуск тестов
pnpm check            # Проверка типов TypeScript

# Форматирование
pnpm format           # Форматирование кода с Prettier

# База данных
pnpm db:push          # Применить миграции БД
```

## Поток данных

### Покупка токенов:

```
1. Пользователь → Подключает кошелек (MetaMask)
2. Пользователь → Вводит количество токенов
3. Пользователь → Выбирает способ оплаты (BNB/USDC)
4. Frontend → Отправляет транзакцию в блокчейн
5. Блокчейн → Переводит BNB/USDC на ваш кошелек
6. Frontend → Отправляет уведомление о успешной покупке
7. (В будущем) Backend → Отправляет токены пользователю
```

## Важные адреса и константы

```typescript
// Токен
Token Address: 0xBfF629448eE52e8AfB6dAEe47b64838228Bc5667

// Кошелек получателя платежей
Receiver Wallet: 0xf1829111dce451f62a3f0267bc1ed05328c03360

// Цена
Price: $0.01 per token

// Сеть
Network: BSC Mainnet (Chain ID: 56)
RPC: https://bsc-dataseed1.binance.org

// USDC на BSC
USDC Address: 0x8AC76a51cc950d9822D68b83FE1Ad97B32Cd580d
```

## Безопасность

1. **Никогда не коммитьте .env файл** - содержит секретные ключи
2. **Используйте HTTPS** - на продакшене обязательно
3. **Проверяйте адреса** - перед отправкой платежей
4. **Ограничивайте доступ** - к админ функциям
5. **Регулярно обновляйте** - зависимости и пакеты

## Дальнейшее развитие

### Для добавления смарт-контракта продажи:

1. Создайте контракт в Solidity
2. Разверните его на BSC
3. Обновите `constants.ts` с адресом контракта
4. Обновите `contract_functions.ts` для взаимодействия с контрактом
5. Обновите `TokenSale.tsx` для использования нового контракта

### Для добавления БД функционала:

1. Обновите `drizzle/schema.ts` с новыми таблицами
2. Запустите `pnpm db:push`
3. Добавьте функции в `server/db.ts`
4. Создайте новые tRPC роутеры в `server/routers.ts`
5. Используйте в компонентах через `trpc` хуки

## Контакты и поддержка

Если у вас есть вопросы по структуре или использованию проекта, обратитесь к документации каждого пакета:
- React: https://react.dev
- Tailwind: https://tailwindcss.com
- Web3.js: https://docs.web3js.org
- tRPC: https://trpc.io

---

**Версия:** 1.0.0  
**Последнее обновление:** December 2024
