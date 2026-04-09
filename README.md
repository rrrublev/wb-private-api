# wb-private-api (форк от [glmn/wb-private-api](https://github.com/glmn/wb-private-api))
**Доработано и оптимизировано** [rrrublev](https://github.com/rrrublev)

## Оригинальный проект
Этот модуль является форком репозитория [glmn/wb-private-api](https://github.com/glmn/wb-private-api) под лицензией ISC.  
Оригинальный автор: Stanislav Gelman (@glmn)  
Лицензия: ISC

![GitHub package.json version](https://img.shields.io/github/package-json/v/rrrublev/wb-private-api) ![GitHub last commit](https://img.shields.io/github/last-commit/rrrublev/wb-private-api) ![GitHub commit activity](https://img.shields.io/github/commit-activity/m/rrrublev/wb-private-api)

![npm](https://nodei.co/npm/wb-private-api.png)

NodeJS модуль. Работает через приватное API Wildberries

<p align="center"><h3>🍒 wb-private-api</h3></p>

Установка: `npm i wb-private-api`

## Получение токена

Библиотека использует внутреннее API Wildberries, для доступа к которому требуется токен `x_wbaas_token`. Авторизация на сайте не нужна.

**Как получить:**

1. Откройте [wildberries.ru](https://www.wildberries.ru) в браузере, дождитесь полной загрузки страницы
2. Откройте DevTools (`F12`) → вкладка **Console**
3. Вставьте и выполните содержимое файла [`scripts/get-wb-token.js`](scripts/get-wb-token.js)
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

После установки рекомендую протестировать работоспособность

![image](https://github.com/glmn/wb-private-api/assets/1326151/e1d04808-1ba3-40cf-96bf-c6c5868ad4b8)

Если все результаты положительные, значит библиотека полностью работоспособна и сервера WB отвечают верно. В случае, если каки-либо тесты отрицательные, прошу создать обращение https://github.com/glmn/wb-private-api/issues

## Пример работы

### Вывод данных о первом товаре из поисковой выдачи по ключевому слову

```js
import { WBPrivateAPI, Constants } from "wb-private-api";

const keyword = "HotWheels";

/*
 * Select destination and init WBPrivateAPI with it
 * You can find more destionations in Constants.DESTINATIONS
 */
const destination = Constants.DESTINATIONS.MOSCOW;
const wbapi = new WBPrivateAPI({ destination });

const initiate = async () => {
  /*
   * Search and Grab first 2 pages
   * with specified keyword
   */
  const catalog = await wbapi.search(keyword, 2);
  const product = catalog.products[0];

  /*
   * Returning all Stocks with Warehouses Ids
   * Then you can compare these Ids
   * using Constants.WAREHOUSES
   */
  const stocks = await product.getStocks();

  /* No comments here :P */
  const feedbacks = await product.getFeedbacks();
  const questions = await product.getQuestions();
};

initiate();
```

### Вывод рекламодателей из поисковой выдачи по ключевому слову

```js
import { WBPrivateAPI, Constants } from "wb-private-api";

const keyword = "Менструальные чаши";

/*
 * Select destination and init WBPrivateAPI with it
 * You can find more destionations in Constants.DESTINATIONS
 */
const destination = Constants.DESTINATIONS.MOSCOW;
const wbapi = new WBPrivateAPI({ destination });

const initiate = async () => {
  /*
   * Search ads in search results
   * with specified keyword
   */
  const { pages, prioritySubjects, adverts } = await wbapi.getSearchAds(
    keyword
  );

  // Ads positions on each page
  console.log(pages);

  // Subjects ordered by priority
  console.log(prioritySubjects);

  // Adverts including CPM
  console.log(adverts);
};

initiate();
```

### Получение всех товаров поставщика с постраничным перебором

```js
import { WBPrivateAPI, Constants } from "wb-private-api";

const supplierId = 845298; // ID поставщика

/*
 * Select destination and init WBPrivateAPI with it
 */
const destination = Constants.DESTINATIONS.MOSCOW;
const wbapi = new WBPrivateAPI({ destination });

const initiate = async () => {
  /*
   * Get total products count for supplier
   */
  const totalProducts = await wbapi.SupplierTotalProducts(supplierId);
  console.log(`Общее количество товаров поставщика: ${totalProducts}`);

  /*
   * Get all supplier products with pagination
   * pageCount = 0 means get all pages (up to 100 pages max)
   * pageCount = 3 means get only first 3 pages
   */
  const catalog = await wbapi.getSupplierCatalogAll(supplierId, 3);
  
  console.log(`Получено товаров: ${catalog.products.length}`);
  console.log(`Всего страниц: ${catalog.pages}`);
  console.log(`Общее количество товаров: ${catalog.totalProducts}`);

  // Display first 5 products
  catalog.products.slice(0, 5).forEach((product, index) => {
    console.log(`${index + 1}. ${product.name} - ${product.price?.afterSale || 'N/A'} руб.`);
  });
};

initiate();
```

## `WBPrivateAPI` методы

`.search(keyword, pageCount, retries = 0, filters = [])` - Поиск всех товаров по Ключевому слову `keyword`. `pageCount` отвечает за кол-во необходимых страниц для прохода. Если `pageCount = 0`, то будет взяты все страницы или `100`, если их больше. `retries` отвечает за количество попыток выполнить запрос, если в ответ был получен статус 5хх или 429. `filters` это массив с объектами вида `[{type: 'fbrand' value: 11399 }]`, необходим для фильтрации поисковой выдачи по брендам, поставщикам, цене и т.д. Метод возвращает объект `WBCatalog`

`.getSearchAds(keyword)` - Поиск рекламодателей (в разделе Поиск) по Ключевому слову

`.getCarouselAds(keyword)` - Поиск рекламодателей внутри карточке в каруселе "Рекламный блок"

`.keyHint(query)` - Возвращает список подсказок из поиска WB по фразе `query`

`.searchSimilarByNm(productId)` - Возвращает список похожих товаров (как в разделе "Похожие товары" внутри карточки на WB)

`.getPromos()` - Возвращает массив текущих промо-акций на WB

`.getListOfProducts(productIds)` - Возвращает массив найденных артикулов на WB с деталями (Не оборачивается в WBProduct)

`.SupplierTotalProducts(supplierId)` - Возвращает общее количество товаров поставщика

`.getSupplierCatalogAll(supplierId, pageCount = 0, retries = 0)` - Получает все товары поставщика с постраничным перебором. `pageCount` отвечает за кол-во необходимых страниц для прохода. Если `pageCount = 0`, то будет взяты все страницы или `100`, если их больше. `retries` отвечает за количество попыток выполнить запрос, если в ответ был получен статус 5хх или 429. Метод возвращает объект `WBCatalog`

`.getSupplierCatalogPage(supplierId, page = 1, retries = 0)` - Получает товары поставщика с указанной страницы. Используется внутри `getSupplierCatalogAll` для постраничного перебора

## `WBCatalog` методы

`.page(number)` - Возвращает массив товаров с заданной страницы (массив состоит из объектов `WBProduct`)

`.getPosition(productId)` - Возвращает номер позиции по заданному SKU. Если такого SKU в выдаче нет, то вернёт `-1`

## `WBProduct` методы

`.create(id)` - Статичный метод. Использовать в виде `WBProduct.create(id)`. Где `id` = `Артикул товара`. Метод асинхронный, поэтому перед вызовом используйте `await`. Вернет объект `WBProduct`

`.totalStocks` - Вернёт сумму остатков товара со всех складов (!) предварительно вызвать `.getStocks()`)

`.getStocks()` - Присвоет (и вернет) свойству `stocks` массив с данными об остатках на складе

`.getPromo()` - Присвоет (и вернет) свойству `promo` объект с данными об участии в промо-акции

`.getFeedbacks()` - Присвоет (и вернет) свойству `feedbacks` массив со всеми отзывами `WBFeedback` о товаре

`.getQuestions()` - Присвоет (и вернет) свойству `questions` массив со всеми вопросами `WBQuestion` о товаре

## `WBFeedback` методы

`.getPhotos(size='min')` - Вернет ссылки на все фотографии в текущем отзыве. `size` по умолчанию = `min`. Заменить на `full` если необходим большой размер
