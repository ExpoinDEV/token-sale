# Руководство по развертыванию Token Sale Page на Hostinger VPS

## Структура проекта

Проект состоит из двух частей:
- **Frontend** (React + Tailwind CSS) - находится в папке `client/src/`
- **Backend** (Express + tRPC) - находится в папке `server/`

## Системные требования

- Node.js 18+ (рекомендуется 20 LTS)
- npm или pnpm (в проекте используется pnpm)
- MySQL/MariaDB (для базы данных)
- Git

## Шаг 1: Подготовка VPS на Hostinger

### 1.1 Подключитесь к VPS по SSH

```bash
ssh root@your_vps_ip
```

### 1.2 Обновите систему

```bash
apt update && apt upgrade -y
```

### 1.3 Установите необходимые пакеты

```bash
apt install -y curl wget git build-essential
```

### 1.4 Установите Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs
```

### 1.5 Установите pnpm

```bash
npm install -g pnpm
```

### 1.6 Установите MySQL (если его еще нет)

```bash
apt install -y mysql-server
mysql_secure_installation
```

## Шаг 2: Загрузка проекта на VPS

### 2.1 Клонируйте репозиторий (если используете Git)

```bash
cd /var/www
git clone <your_repo_url> token-sale-page
cd token-sale-page
```

**ИЛИ** загрузите файлы через SFTP/SCP:

```bash
# На вашем локальном компьютере
scp -r /path/to/token-sale-page root@your_vps_ip:/var/www/
```

### 2.2 Установите зависимости

```bash
cd /var/www/token-sale-page
pnpm install
```

## Шаг 3: Настройка переменных окружения

### 3.1 Создайте файл `.env`

```bash
cp .env.example .env
# или создайте вручную
nano .env
```

### 3.2 Добавьте необходимые переменные

```env
# Database
DATABASE_URL="mysql://user:password@localhost:3306/token_sale_db"

# OAuth (если используется Manus Auth)
VITE_APP_ID="your_app_id"
OAUTH_SERVER_URL="https://api.manus.im"
VITE_OAUTH_PORTAL_URL="https://portal.manus.im"

# JWT
JWT_SECRET="your_secret_key_here"

# Owner Info
OWNER_NAME="Your Name"
OWNER_OPEN_ID="your_open_id"

# API Keys
BUILT_IN_FORGE_API_KEY="your_api_key"
BUILT_IN_FORGE_API_URL="https://api.manus.im"
VITE_FRONTEND_FORGE_API_KEY="your_frontend_key"
VITE_FRONTEND_FORGE_API_URL="https://api.manus.im"

# App Settings
VITE_APP_TITLE="Token Sale"
VITE_APP_LOGO="/logo.png"
```

## Шаг 4: Настройка базы данных

### 4.1 Создайте базу данных

```bash
mysql -u root -p
```

```sql
CREATE DATABASE token_sale_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'token_user'@'localhost' IDENTIFIED BY 'strong_password';
GRANT ALL PRIVILEGES ON token_sale_db.* TO 'token_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4.2 Запустите миграции

```bash
cd /var/www/token-sale-page
pnpm db:push
```

## Шаг 5: Сборка проекта

```bash
cd /var/www/token-sale-page
pnpm build
```

## Шаг 6: Запуск приложения

### 6.1 Вариант A: Использование PM2 (рекомендуется)

```bash
# Установите PM2 глобально
npm install -g pm2

# Создайте файл ecosystem.config.js в корне проекта
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'token-sale-page',
      script: 'dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log'
    }
  ]
};
EOF

# Запустите приложение
pm2 start ecosystem.config.js

# Сделайте PM2 автозагрузкой при перезагрузке VPS
pm2 startup
pm2 save
```

### 6.2 Вариант B: Использование systemd

Создайте файл `/etc/systemd/system/token-sale.service`:

```bash
sudo nano /etc/systemd/system/token-sale.service
```

Добавьте содержимое:

```ini
[Unit]
Description=Token Sale Page
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/token-sale-page
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Запустите сервис:

```bash
sudo systemctl daemon-reload
sudo systemctl enable token-sale
sudo systemctl start token-sale
```

## Шаг 7: Настройка Nginx (обратный прокси)

### 7.1 Установите Nginx

```bash
apt install -y nginx
```

### 7.2 Создайте конфиг

```bash
sudo nano /etc/nginx/sites-available/token-sale
```

Добавьте:

```nginx
server {
    listen 80;
    server_name your_domain.com;

    # Редирект на HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your_domain.com;

    # SSL сертификаты (используйте Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/your_domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your_domain.com/privkey.pem;

    # Оптимизация SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Логи
    access_log /var/log/nginx/token-sale.access.log;
    error_log /var/log/nginx/token-sale.error.log;

    # Проксирование на приложение
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 7.3 Активируйте конфиг

```bash
sudo ln -s /etc/nginx/sites-available/token-sale /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7.4 Установите SSL сертификат (Let's Encrypt)

```bash
apt install -y certbot python3-certbot-nginx
certbot certonly --nginx -d your_domain.com
```

## Шаг 8: Проверка статуса

```bash
# Если используете PM2
pm2 status
pm2 logs token-sale-page

# Если используете systemd
sudo systemctl status token-sale
sudo journalctl -u token-sale -f

# Проверьте логи Nginx
sudo tail -f /var/log/nginx/token-sale.error.log
```

## Структура папок на VPS

```
/var/www/token-sale-page/
├── client/                 # Frontend React приложение
│   ├── src/
│   │   ├── pages/         # Страницы (Home.tsx, TokenSale.tsx)
│   │   ├── components/    # Компоненты
│   │   └── App.tsx        # Главный компонент
│   └── public/            # Статические файлы
├── server/                # Backend Express приложение
│   ├── routers.ts         # tRPC роутеры
│   └── db.ts              # Функции БД
├── drizzle/               # Миграции БД
├── dist/                  # Скомпилированный код (после build)
├── package.json
├── tsconfig.json
└── .env                   # Переменные окружения
```

## Важные файлы проекта

### Основные файлы для редактирования:

1. **client/src/pages/TokenSale.tsx** - страница продажи токенов
2. **client/src/pages/Home.tsx** - главная страница
3. **server/routers.ts** - API endpoints
4. **drizzle/schema.ts** - схема базы данных
5. **src/web-utils/constants.ts** - константы (адреса контрактов, цены)

### Файлы для конфигурации:

1. **.env** - переменные окружения
2. **package.json** - зависимости
3. **tsconfig.json** - конфиг TypeScript

## Команды для управления

```bash
# Установка зависимостей
pnpm install

# Разработка локально
pnpm dev

# Сборка
pnpm build

# Запуск в продакшене
pnpm start

# Миграции БД
pnpm db:push

# Тесты
pnpm test

# Форматирование кода
pnpm format

# Проверка типов
pnpm check
```

## Обновление приложения на VPS

```bash
cd /var/www/token-sale-page

# Получите новые изменения
git pull origin main

# Установите новые зависимости
pnpm install

# Запустите миграции (если были изменения в БД)
pnpm db:push

# Пересоберите
pnpm build

# Перезагрузите приложение
pm2 restart token-sale-page
# или
sudo systemctl restart token-sale
```

## Решение проблем

### Приложение не запускается

```bash
# Проверьте логи
pm2 logs token-sale-page

# Проверьте переменные окружения
cat .env

# Проверьте подключение к БД
mysql -u token_user -p token_sale_db
```

### Проблемы с портом

```bash
# Проверьте, какой процесс использует порт 3000
lsof -i :3000

# Убейте процесс если нужно
kill -9 <PID>
```

### Проблемы с Nginx

```bash
# Проверьте синтаксис конфига
sudo nginx -t

# Перезагрузите Nginx
sudo systemctl reload nginx

# Проверьте логи
sudo tail -f /var/log/nginx/error.log
```

## Безопасность

1. **Используйте HTTPS** - обязательно установите SSL сертификат
2. **Защитите .env** - не коммитьте файл в Git
3. **Используйте сильные пароли** - для БД и других сервисов
4. **Регулярно обновляйте** - пакеты и зависимости
5. **Настройте firewall** - разрешите только необходимые порты

```bash
# Базовая настройка firewall
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable
```

## Поддержка

Если возникнут проблемы при развертывании, проверьте:
- Версию Node.js: `node -v` (должна быть 18+)
- Версию pnpm: `pnpm -v`
- Подключение к БД: `mysql -u token_user -p token_sale_db`
- Логи приложения: `pm2 logs`

---

**Готово!** Ваше приложение должно быть доступно по адресу `https://your_domain.com`
