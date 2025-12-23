# Gemini API Checker

Простое веб-приложение для проверки работоспособности Gemini API с подробным логированием всех операций.

## Возможности

- Отправка тестовых запросов к Gemini API
- Подробное логирование всех взаимодействий (запросы, ответы, ошибки)
- История последних 50 запросов
- Просмотр логов с фильтрацией по уровню
- Health check endpoint для мониторинга

## Требования

- Node.js 18+
- npm
- API ключ Google Gemini

## Установка

1. Клонируйте репозиторий:

```bash
git clone <repository-url>
cd gemini-api-checker
```

2. Установите зависимости:

```bash
npm install
```

3. Создайте файл `.env` на основе примера:

```bash
cp .env.example .env
```

4. Отредактируйте `.env` и добавьте ваш API ключ:

```
GEMINI_API_KEY=your_actual_api_key_here
PORT=3000
```

## Получение API ключа

1. Перейдите на [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Создайте новый API ключ
3. Скопируйте ключ в файл `.env`

## Запуск

### Production режим

```bash
npm start
```

### Development режим (с автоперезагрузкой)

```bash
npm run dev
```

Сервер запустится на `http://localhost:3000` (или на порту, указанном в `PORT`).

## API Endpoints

| Метод | Путь               | Описание                      |
| ----- | ------------------ | ----------------------------- |
| GET   | `/`                | Главная страница              |
| POST  | `/api/check`       | Отправка запроса к Gemini API |
| GET   | `/api/history`     | Получение истории запросов    |
| GET   | `/api/history/:id` | Получение конкретного запроса |
| GET   | `/api/logs`        | Получение логов               |
| GET   | `/health`          | Health check                  |

### Примеры запросов

**Отправка запроса к Gemini:**

```bash
curl -X POST http://localhost:3000/api/check \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello, how are you?"}'
```

**Получение истории:**

```bash
curl http://localhost:3000/api/history
```

**Получение логов с фильтрацией:**

```bash
curl http://localhost:3000/api/logs?level=error
```

**Health check:**

```bash
curl http://localhost:3000/health
```

## Структура проекта

```
gemini-api-checker/
├── src/
│   ├── server.js        # Express сервер
│   ├── geminiClient.js  # Клиент Gemini API
│   ├── historyStore.js  # Хранилище истории
│   └── logger.js        # Модуль логирования
├── public/
│   ├── index.html       # Главная страница
│   ├── styles.css       # Стили
│   └── app.js           # Клиентский JavaScript
├── logs/
│   └── app.log          # Файл логов
├── .env.example         # Пример конфигурации
├── package.json
└── README.md
```

## Переменные окружения

| Переменная       | Описание               | По умолчанию    |
| ---------------- | ---------------------- | --------------- |
| `GEMINI_API_KEY` | API ключ Google Gemini | - (обязательно) |
| `PORT`           | Порт сервера           | 3000            |

## Логирование

Логи записываются в:

- Консоль (все уровни)
- Файл `logs/app.log` (все уровни)

Уровни логирования: `debug`, `info`, `warn`, `error`

## Тестирование

```bash
npm test
```

## Лицензия

ISC
