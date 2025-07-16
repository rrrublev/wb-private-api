/* eslint-disable camelcase */
/* eslint-disable no-undef */
const Constants = require("../src/Constants");
const WBPrivateAPI = require("../src/WBPrivateAPI");

const wbapi = new WBPrivateAPI({
  destination: Constants.DESTINATIONS.MOSCOW,
});

//Old Method
// describe("Проверка поиска рекламодателей", () => {
//   test("Проверка рекламы по Поиску .getSearchAds()", async () => {
//     const ads = await wbapi.getSearchAds("Платье");
//     expect(ads.adverts.length).toBeGreaterThan(0);
//     expect(ads.prioritySubjects.length).toBeGreaterThan(0);
//     expect(ads.adverts[0].cpm).toBeGreaterThan(0);
//     expect(ads.pages.length).toBeGreaterThan(0);
//   });
// });

describe("Проверка поиска товаров WBPrivateAPI.search()", () => {
  test('Поиск количества товаров по ключевому запросу "Платье"', async () => {
    const totalProducts = await wbapi.searchTotalProducts("Платье");
    expect(totalProducts).toBeGreaterThan(0);
  });

  test('Поиск количества товаров (редких) по ключевому запросу "тату чебурашка"', async () => {
    const totalProducts = await wbapi.searchTotalProducts("тату чебурашка");
    expect(totalProducts).toBeGreaterThan(0);
  });

  test('Поиск данных из фильтров по ключевому запросу "конструктор детский"', async () => {
    const result = await wbapi.searchCustomFilters("конструктор детский", [
      "fbrand",
      "fsupplier",
    ]);
    const [brands, suppliers] = result.filters;
    expect(brands.items.length).toBeGreaterThan(0);
    expect(suppliers.items.length).toBeGreaterThan(0);
  });

  test('Проверка получения Query Params по ключевому запросу "Платье"', async () => {
    const metadata = await wbapi.getQueryMetadata("Платье");
    const { catalog_type, catalog_value } = metadata;
    expect(typeof metadata === "object").toBeTruthy();
    expect(catalog_type).toBe("preset");
    expect(catalog_value).toBe("preset=500060403");
  });

  test("Проверка метода getQueryMetadata на запросы разных страниц", async () => {
    const pageOne = await wbapi.getQueryMetadata("Платье", 3, true, 1);
    const pageTwo = await wbapi.getQueryMetadata("Платье", 3, true, 2);
    expect(pageOne.products[0].id !== pageTwo.products[0].id).toBeTruthy();
  });

  test('Сбор 3 страниц товаров по ключевому запросу "Платье"', async () => {
    const catalog = await wbapi.search("платье", 3, 3);
    expect(catalog.products.length).toBe(300);
  });

  test('Проверка фильтрации товаров по бренду и ключевому запросу "Швабра zetter"', async () => {
    const filters = [{ type: "fbrand", value: 244907 }];
    const catalog = await wbapi.search("Зип пакет", 1, 0, filters);
    expect(catalog.products.length).toBeGreaterThan(0);
    expect(
      catalog.products.every((p) => p.brandId === filters[0].value)
    ).toBeTruthy();
  });

  test('Проверка фильтрации товаров по поставщику и ключевому запросу "Швабра zetter"', async () => {
    const filters = [{ type: "fsupplier", value: 206198 }];
    const catalog = await wbapi.search("Зип пакет", 1, 0, filters);
    expect(catalog.products.length).toBeGreaterThan(0);
    expect(
      catalog.products.every((p) => p.supplierId === filters[0].value)
    ).toBeTruthy();
  });

  test('Проверка фильтрации товаров по бренду и по поставщику с ключевым запросом "Швабра zetter"', async () => {
    const filters = [
      { type: "fbrand", value: 244907 },
      { type: "fsupplier", value: 206198 },
    ];
    const catalog = await wbapi.search("Швабра zetter", 1, 0, filters);
      expect(catalog.products.length).toBeGreaterThan(0);
      expect(
        catalog.products.every((p) => p.brandId === filters[0].value) &&
          catalog.products.every((p) => p.supplierId === filters[1].value)
      ).toBeTruthy();
  });

  test("Проверка совместимости с axios-retry", async () => {
    const catalog = await wbapi.search("Платье", 1, 3);
    expect(catalog.products.length).toBe(100);
  });

  test("Проверка метода .getQueryMetadata на прохождение HTTP 429 ошибки", async () => {
    const catalogs = await Promise.all([
      wbapi.getQueryMetadata("платье", 100, true, 1, 3),
      wbapi.getQueryMetadata("платье", 100, true, 2, 3),
      wbapi.getQueryMetadata("платье", 100, true, 3, 3),
    ]);

    expect(
      catalogs.reduce((acc, current) => {
        return (acc += current.products.length);
      }, 0)
    ).toBe(300);
  });

  test("Проверка аргумента pageCount на понижение кол-ва страниц, если их меньше чем запрошено", async () => {
    const pageCount = 100;
    const catalog = await wbapi.search("nokia 3310", pageCount);
    expect(pageCount).toBeGreaterThan(catalog.pages);
  });

  test('Проверка метода .keyHint(query) на вывод предположений по ключевому запросу "Платье"', async () => {
    const hints = await wbapi.keyHint("Платье");
    expect(hints.suggests[0].type).toBe("suggest");
  });

  test("Проверка метода .searchSimilarByNm(productId) на возврат идентификаторов похожиш товаров", async () => {
    const similarIds = await wbapi.searchSimilarByNm(60059650);
    expect(similarIds.length).toBeGreaterThan(0);
  });

  //Old Method
  // test("Проверка метода .getPromos() на возврат текущих промо-акций", async () => {
  //   const promos = await wbapi.getPromos();
  //   expect(promos.length).toBeGreaterThan(0);
  // });

  test("Проверка метода .getListOfProducts() на возврат найденных товаров", async () => {
    const products = Array(10)
      .fill(304390393)
      .map((v, idx) => v + idx);
      const list = await wbapi.getListOfProducts(products);
    expect(list.length).toBeGreaterThan(0);
  });
});

describe("Проверка выдачи данных по продавцу", () => {
  test("Проверка метода .getSupplierInfo()", async () => {
    const supplier = await wbapi.getSupplierInfo(1136572);
    expect(supplier.supplierId).toBe(1136572);
  });

  test("Проверка метода .SupplierTotalProducts() на получение общего количества товаров поставщика", async () => {
    const supplierId = 18740;
    const totalProducts = await wbapi.SupplierTotalProducts(supplierId);
    expect(totalProducts).toBeGreaterThan(0);
  });

  test("Проверка метода .getSupplierCatalogAll() на получение всех товаров поставщика", async () => {
    const supplierId = 18740;
    const catalog = await wbapi.getSupplierCatalogAll(supplierId, 1); // Получаем только 1 страницу для теста
    expect(catalog).toBeDefined();
    expect(catalog.products).toBeDefined();
    expect(catalog.totalProducts).toBeGreaterThan(0);
    expect(catalog.pages).toBeGreaterThan(0);
    if (catalog.products.length > 0) {
      expect(
        catalog.products.every((p) => p.supplierId === supplierId)
      ).toBeTruthy();
    }
  });

  test("Проверка метода .getSupplierCatalogPage() на получение одной страницы товаров поставщика", async () => {
    const supplierId = 18740;
    const products = await wbapi.getSupplierCatalogPage(supplierId, 1, 0);
    expect(Array.isArray(products)).toBeTruthy();
    if (products.length > 0) {
      expect(products[0]).toHaveProperty("id");
    }
  });
});
