# Тесты для wb-private-api

## Проекты Jest

Конфигурация в `jest.config.js` разбита на два проекта:

| Проект | Команда | Требования |
|--------|---------|------------|
| `unit` | `npm test` | без сети, без токена |
| `integration` | `npm run test:integration` | сеть + токен `.wbaas_token` |

## Файлы тестов

| Файл | Проект | Назначение |
|------|--------|-----------|
| `SessionBuilder.test.js` | unit | HTTP-клиент, retry, заголовки |
| `Constants.URLs.utils.test.js` | unit | Формирование динамических URL |
| `Constants.URLs.test.js` | integration | Доступность и структура URL из Constants.js |
| `Constants.URLs.integration.test.js` | integration | Соответствие URL реальным методам API |
| `WBPrivateAPI.test.js` | integration | Методы поиска и работы с поставщиками |
| `WBCatalog.test.js` | integration | Методы WBCatalog |
| `WBProduct.test.js` | integration | Методы WBProduct |
| `WBProduct.getStocks.test.js` | integration | Получение остатков товара |

## Токен для интеграционных тестов

Интеграционные тесты требуют токен `x_wbaas_token`. `jest.setup.js` читает его автоматически из:
1. `process.env.WBAAS_TOKEN`
2. Файла `.wbaas_token` в корне проекта

Как получить токен — см. `scripts/get-wb-token.js` и раздел **Получение токена** в `README.md`.

## Тестовые ID

| Тип | ID | Используется в |
|-----|----|---------------|
| Товар | `177899980` | `Utils.test.js` (корзина 12) |
| Товар | `60059650` | `WBPrivateAPI.test.js` (похожие товары) |
| Товар | `304390393` | `WBPrivateAPI.test.js` (список товаров) |
| Товар | `67858518` | `Constants.URLs.test.js` |
| Поставщик | `1136572` | `WBPrivateAPI.test.js` (getSupplierInfo) |
| Поставщик | `18740` | `WBPrivateAPI.test.js` (каталог) |
| Поставщик | `206198` | фильтр fsupplier (Zetter) |
| Бренд | `244907` | фильтр fbrand (Zetter) |

## Добавление тестов

**Новый URL в `Constants.js`:**
1. Добавить тест доступности в `Constants.URLs.test.js`
2. Добавить тест соответствия методу в `Constants.URLs.integration.test.js`
3. Если URL динамический — добавить тест формирования в `Constants.URLs.utils.test.js`

**Новый метод API:**
1. Добавить тест метода в `WBPrivateAPI.test.js`
2. Добавить проверку соответствия URL в `Constants.URLs.integration.test.js`

## Полезные команды

```bash
# Конкретный файл
npx jest tests/WBPrivateAPI.test.js --verbose

# Группа по паттерну
npx jest tests/Constants.URLs --verbose

# Конкретный тест по названию
npx jest -t "Проверка URL изображений товаров"

# С покрытием
npx jest --coverage

# Watch-режим
npx jest --watch

# Без кэша
npx jest --no-cache --detectOpenHandles
```
