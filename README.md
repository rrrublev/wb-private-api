# @rrrublev/wb-private-api

NodeJS модуль. Работает через приватное API Wildberries.

![GitHub package.json version](https://img.shields.io/github/package-json/v/rrrublev/wb-private-api) ![npm](https://img.shields.io/npm/v/@rrrublev/wb-private-api) ![GitHub last commit](https://img.shields.io/github/last-commit/rrrublev/wb-private-api) ![GitHub commit activity](https://img.shields.io/github/commit-activity/m/rrrublev/wb-private-api)

[![NPM](https://nodei.co/npm/@rrrublev/wb-private-api.png)](https://www.npmjs.com/package/@rrrublev/wb-private-api)

## Установка

```bash
npm i @rrrublev/wb-private-api
```

## Получение токена

Библиотека использует внутреннее API Wildberries, для доступа к которому требуется токен `x_wbaas_token`. Авторизация на сайте не нужна.

**Как получить:**

1. Откройте [wildberries.ru](https://www.wildberries.ru) в браузере, дождитесь полной загрузки страницы
2. Откройте DevTools (`F12`) → вкладка **Console**
3. Вставьте и выполните содержимое файла [`scripts/get-wb-token.js`](https://github.com/rrrublev/wb-private-api/blob/main/scripts/get-wb-token.js)
4. Скопируйте выведенную строку JSON и сохраните в файл `.wbaas_token` в корне проекта

Токен действителен ~14 дней. По истечении повторите процедуру.

**Использование токена в коде:**

```js
// Вариант 1 — файл .wbaas_token подхватывается автоматически
const wbapi = new WBPrivateAPI({ destination: Constants.DESTINATIONS.MOSCOW });

// Вариант 2 — передать токен явно
const wbapi = new WBPrivateAPI({
  destination: Constants.DESTINATIONS.MOSCOW,
  wbaasToken: "ВАШ_ТОКЕН"
});

// Вариант 3 — установить после создания
wbapi.setToken("ВАШ_ТОКЕН");
```

## Примеры

<details>
<summary>Вывод данных о первом товаре из поисковой выдачи</summary>

```js
import { WBPrivateAPI, Constants } from "@rrrublev/wb-private-api";

const destination = Constants.DESTINATIONS.MOSCOW;
const wbapi = new WBPrivateAPI({ destination });

const catalog = await wbapi.search("HotWheels", 2);
const product = catalog.products[0];

const stocks = await product.getStocks();
const feedbacks = await product.getFeedbacks();
const { items: questions } = await product.getQuestions();
```

</details>

<details>
<summary>Получение всех товаров поставщика</summary>

```js
import { WBPrivateAPI, Constants } from "@rrrublev/wb-private-api";

const wbapi = new WBPrivateAPI({ destination: Constants.DESTINATIONS.MOSCOW });
const supplierId = 845298;

const total = await wbapi.getSupplierProductCount(supplierId);
console.log(`Всего товаров: ${total}`);

// pageCount = 0 — все страницы (до 100), pageCount = 3 — только первые 3
const catalog = await wbapi.getSupplierCatalogAll(supplierId, 3);

console.log(`Получено: ${catalog.products.length}`);
console.log(`Страниц: ${catalog.pages}`);
```

</details>

## API

### `WBPrivateAPI`

```js
new WBPrivateAPI({ destination, wbaasToken? })
```

| Параметр | Тип | Описание |
|----------|-----|----------|
| `destination` | `object` | Направление доставки из `Constants.DESTINATIONS` |
| `wbaasToken` | `string` | Токен. Если не передан — читается из `.wbaas_token` |

#### Поиск

| Метод | Возвращает | Описание |
|-------|-----------|----------|
| `search(keyword, pageCount?, retries?, filters?)` | `WBCatalog` | Поиск товаров по ключевому слову. `pageCount = 0` — все страницы (до 100) |
| `keyHint(query)` | `array` | Поисковые подсказки WB |
| `searchSimilarByNm(productId)` | `object` | Похожие товары (как в разделе «Похожие товары» на WB) |

#### Товары

| Метод | Возвращает | Описание |
|-------|-----------|----------|
| `getListOfProducts(productIds)` | `array` | Данные по массиву артикулов |
| `getDeliveryDataByNms(productIds, retries?)` | `array` | Данные о доставке по массиву артикулов |
| `getPromos()` | `array` | Текущие промо-акции на WB |

#### Поставщики

| Метод | Возвращает | Описание |
|-------|-----------|----------|
| `getSupplierInfo(sellerId)` | `object` | Информация о поставщике |
| `getSupplierShipment(sellerId)` | `object` | Данные об отгрузке поставщика |
| `getSupplierProductCount(supplierId)` | `number` | Общее количество товаров поставщика |
| `getSupplierCatalogAll(supplierId, pageCount?, retries?)` | `WBCatalog` | Все товары поставщика с постраничным перебором |
| `getSupplierCatalogPage(supplierId, page?, retries?)` | `array` | Товары поставщика с указанной страницы |

#### Бренды

| Метод | Возвращает | Описание |
|-------|-----------|----------|
| `getBrandProductCount(brandId)` | `number` | Общее количество товаров бренда |
| `getBrandCatalogPage(brandId, page?, retries?)` | `array` | Товары бренда с указанной страницы |

#### Токен

| Метод | Описание |
|-------|----------|
| `setToken(token)` | Устанавливает токен `x_wbaas_token` |

---

### `WBCatalog`

Объект, возвращаемый методами `search()` и `getSupplierCatalogAll()`.

#### Свойства

| Свойство | Тип | Описание |
|----------|-----|----------|
| `products` | `WBProduct[]` | Массив товаров |
| `pages` | `number` | Количество страниц |
| `totalProducts` | `number` | Общее количество товаров в выдаче |

#### Методы

| Метод | Возвращает | Описание |
|-------|-----------|----------|
| `page(number)` | `WBProduct[]` | Товары с заданной страницы (нумерация с 1) |
| `getPosition(productId)` | `number` | Позиция товара по артикулу. `-1` если не найден |

---

### `WBProduct`

#### Создание

```js
// Из поисковой выдачи — WBProduct создаётся автоматически внутри WBCatalog
const product = catalog.products[0];

// По артикулу напрямую
const product = await WBProduct.create(12345678);
```

#### Свойства

| Свойство | Тип | Описание |
|----------|-----|----------|
| `totalStocks` | `number` | Суммарный остаток по всем складам (требует предварительного вызова `getStocks()`) |
| `currentPrice` | `number` | Текущая цена товара |

#### Методы

| Метод | Возвращает | Описание |
|-------|-----------|----------|
| `getStocks()` | `array` | Остатки на складах |
| `getPromo()` | `object` | Участие в промо-акции |
| `getFeedbacks()` | `WBFeedback[]` | Все отзывы о товаре |
| `getQuestions()` | `object` | Все вопросы о товаре. Возвращает `{ items, totalQuestions, fetchedQuestions, truncated }` |
| `getVideo(quality?)` | `object` | Видео товара. `quality` по умолчанию `"1440p"`. Возвращает `{ hasVideo, playlistUrl, hls, mp4Preview, duration, chunks }` |

---

### `WBFeedback`

| Метод | Возвращает | Описание |
|-------|-----------|----------|
| `getPhotos(size?)` | `string[]` | Ссылки на фото в отзыве. `size`: `"min"` (по умолчанию) или `"full"` |

## Credits

Based on [glmn/wb-private-api](https://github.com/glmn/wb-private-api) by Stanislav Gelman.  
Licensed under ISC.
