# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Unit-тесты (без сети)
npm test

# Интеграционные тесты (требуют токен и сеть)
npm run test:integration

# Конкретный файл
npx jest tests/WBPrivateAPI.test.js --verbose

# Группа тестов по паттерну
npx jest tests/Constants.URLs --verbose

# Конкретный тест по названию
npx jest -t "Проверка URL изображений товаров"

# С покрытием
npx jest --coverage

# Watch-режим
npx jest --watch
```

## Токен

Для работы с внутренним API WB нужен токен `x_wbaas_token`. Получается из браузера скриптом `scripts/get-wb-token.js`, сохраняется в `.wbaas_token` в корне проекта. Файл в `.gitignore`.

Для интеграционных тестов токен подхватывается автоматически через `jest.setup.js` → `.wbaas_token` / `process.env.WBAAS_TOKEN`.

## Architecture

Библиотека — обёртка над приватным API Wildberries. Точка входа — `index.js`, экспортирует `WBPrivateAPI`, `WBProduct`, `Constants`, `Utils`.

**Поток данных:**

```
WBPrivateAPI (src/WBPrivateAPI.js)
 ├─ SessionBuilder (src/SessionBuilder.js)  — HTTP-клиент на undici с retry/backoff
 ├─ Constants.URLs (src/Constants.js)       — все URL-шаблоны (плейсхолдеры {0}, {1}…)
 └─ возвращает WBCatalog (src/WBCatalog.js) с массивом WBProduct (src/WBProduct.js)
     └─ WBProduct.getStocks() / getFeedbacks() / getQuestions()
         └─ WBFeedback (src/WBFeedback.js) / WBQuestion (src/WBQuestion.js)
```

**Ключевые модули:**

- `src/Constants.js` — единственный источник истины для URL, складов (`WAREHOUSES`), направлений доставки (`DESTINATIONS`), типов приложений, валют, локалей. При добавлении нового URL — добавлять сюда.
- `src/SessionBuilder.js` — фабрика HTTP-клиента на `undici`. Экспоненциальный backoff, retry, общие заголовки. Не создавать `fetch`/HTTP-клиенты вне него. `SessionBuilder.setAntibotToken(session, token)` устанавливает токен в Cookie.
- `src/WBPrivateAPI.js` — основной класс. Конструктор `{ destination, wbaasToken }` — токен можно передать явно или он читается из `.wbaas_token`. При наличии токена переключается на `__internal` URL. Методы: `search()`, `getSearchAds()`, `getCarouselAds()`, `keyHint()`, `searchSimilarByNm()`, `getDeliveryDataByNms()`, `getPromos()`, `getListOfProducts()`, `getSupplierInfo()`, `getSupplierShipment()`, `getSupplierCatalog()`, `getSupplierCatalogAll()`, `getSupplierCatalogPage()`, `SupplierTotalProducts()`, `setToken()`.
- `src/Utils.js` — вспомогательные функции: построение URL изображений (`Utils.Card.imageURL()`), вычисление номера корзины, генерация query ID.

**Инициализация:**

```js
const { WBPrivateAPI, Constants } = require("wb-private-api");

// токен подхватывается автоматически из .wbaas_token
const wbapi = new WBPrivateAPI({ destination: Constants.DESTINATIONS.MOSCOW });

// или передать явно
const wbapi = new WBPrivateAPI({ destination: Constants.DESTINATIONS.MOSCOW, wbaasToken: "..." });
```

## Tests

Тесты живут в `tests/`. Подробная документация — в [tests/README.md](tests/README.md).
