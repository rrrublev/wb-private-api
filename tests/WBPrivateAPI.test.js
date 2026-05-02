/* eslint-disable camelcase */
/* eslint-disable no-undef */
const Constants = require("../src/Constants");
const WBPrivateAPI = require("../src/WBPrivateAPI");

let wbapi;

beforeAll(() => {
  wbapi = new WBPrivateAPI({ destination: Constants.DESTINATIONS.MOSCOW });
  const token = process.env.WBAAS_TOKEN;
  if (token) wbapi.setToken(token);
});

describe("Проверка поиска товаров WBPrivateAPI.search()", () => {
  test('Поиск количества товаров по ключевому запросу "Платье"', async () => {
    const totalProducts = await wbapi.searchTotalProducts("Платье");
    expect(totalProducts).toBeGreaterThan(0);
  }, 15000);

  test('Поиск количества товаров (редких) по ключевому запросу "тату чебурашка"', async () => {
    const totalProducts = await wbapi.searchTotalProducts("тату чебурашка");
    expect(totalProducts).toBeGreaterThan(0);
  }, 15000);

  test('Поиск данных из фильтров по ключевому запросу "конструктор детский"', async () => {
    const result = await wbapi.searchCustomFilters("конструктор детский", [
      "fbrand",
      "fsupplier",
    ]);
    const [brands, suppliers] = result.filters;
    expect(brands.items.length).toBeGreaterThan(0);
    expect(suppliers.items.length).toBeGreaterThan(0);
  }, 15000);

  test('Проверка получения Query Params по ключевому запросу "Платье"', async () => {
    const metadata = await wbapi.getQueryMetadata("Платье");
    const { catalog_type, catalog_value } = metadata;
    expect(typeof metadata === "object").toBeTruthy();
    expect(catalog_type).toBe("preset");
    expect(catalog_value).toContain("preset=");
  }, 15000);

  test("Проверка метода getQueryMetadata на запросы разных страниц", async () => {
    const pageOne = await wbapi.getQueryMetadata("Платье", 3, true, 1);
    const pageTwo = await wbapi.getQueryMetadata("Платье", 3, true, 2);
    expect(pageOne.products[0].id !== pageTwo.products[0].id).toBeTruthy();
  }, 15000);

  test('Сбор 3 страниц товаров по ключевому запросу "Платье"', async () => {
    const catalog = await wbapi.search("платье", 3, 3);
    expect(catalog.products.length).toBe(300);
  }, 15000);

  test('Проверка фильтрации товаров по бренду и ключевому запросу "Швабра zetter"', async () => {
    const filters = [{ type: "fbrand", value: 244907 }];
    const catalog = await wbapi.search("Швабра zetter", 1, 0, filters);
    expect(catalog.products.length).toBeGreaterThan(0);
    expect(
      catalog.products.every((p) => p.brandId === filters[0].value)
    ).toBeTruthy();
  }, 15000);

  test('Проверка фильтрации товаров по поставщику и ключевому запросу "Швабра zetter"', async () => {
    const filters = [{ type: "fsupplier", value: 206198 }];
    const catalog = await wbapi.search("Швабра zetter", 1, 0, filters);
    expect(catalog.products.length).toBeGreaterThan(0);
    expect(
      catalog.products.every((p) => p.supplierId === filters[0].value)
    ).toBeTruthy();
  }, 15000);

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
  }, 15000);

  test("Проверка retry-механизма при HTTP 429", async () => {
    const catalog = await wbapi.search("Платье", 1, 3);
    console.log(`retry-тест: products.length=${catalog.products?.length}`);
    expect(catalog.products.length).toBe(100);
  }, 15000);

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
  }, 15000);

  test("Проверка аргумента pageCount на понижение кол-ва страниц, если их меньше чем запрошено", async () => {
    const pageCount = 100;
    const catalog = await wbapi.search("nokia 3310", pageCount);
    expect(pageCount).toBeGreaterThan(catalog.pages);
  }, 15000);

  test('Проверка метода .keyHint(query) на вывод предположений по ключевому запросу "Платье"', async () => {
    const hints = await wbapi.keyHint("Платье");
    expect(hints.suggests[0].type).toBe("suggest");
  }, 15000);

  test("Проверка метода .searchSimilarByNm(productId) на возврат идентификаторов похожих товаров", async () => {
    const similarIds = await wbapi.searchSimilarByNm(60059650);
    expect(similarIds.length).toBeGreaterThan(0);
  }, 15000);

  test("Проверка метода .getListOfProducts() на возврат найденных товаров", async () => {
    const products = Array(10)
      .fill(304390393)
      .map((v, idx) => v + idx);
    const list = await wbapi.getListOfProducts(products);
    expect(list.length).toBeGreaterThan(0);
  }, 15000);
});

describe("Проверка выдачи данных по продавцу", () => {
  test("Проверка метода .getSupplierInfo()", async () => {
    const supplier = await wbapi.getSupplierInfo(1136572);
    console.log(`getSupplierInfo: supplierId=${supplier.supplierId}, name="${supplier.supplierName}"`);
    expect(supplier.supplierId).toBe(1136572);
  }, 15000);

  test("Проверка метода .getSupplierProductCount() на получение общего количества товаров поставщика", async () => {
    const supplierId = 18740;
    const totalProducts = await wbapi.getSupplierProductCount(supplierId);
    console.log(`getSupplierProductCount(${supplierId}): ${totalProducts}`);
    expect(totalProducts).toBeGreaterThan(0);
  }, 15000);

  test("Проверка метода .getSupplierCatalogAll() на получение всех товаров поставщика", async () => {
    const supplierId = 18740;
    const catalog = await wbapi.getSupplierCatalogAll(supplierId, 1);
    console.log(`getSupplierCatalogAll(${supplierId}): totalProducts=${catalog.totalProducts}, pages=${catalog.pages}, products.length=${catalog.products.length}`);
    if (catalog.products.length > 0) {
      console.log(`  первый товар: ID=${catalog.products[0].id}, supplierId=${catalog.products[0].supplierId}`);
    }
    expect(catalog).toBeDefined();
    expect(catalog.products).toBeDefined();
    expect(catalog.totalProducts).toBeGreaterThan(0);
    expect(catalog.pages).toBeGreaterThan(0);
    if (catalog.products.length > 0) {
      expect(
        catalog.products.every((p) => p.supplierId === supplierId)
      ).toBeTruthy();
    }
  }, 15000);

  test("Проверка метода .getSupplierCatalogPage() на получение одной страницы товаров поставщика", async () => {
    const supplierId = 18740;
    const products = await wbapi.getSupplierCatalogPage(supplierId, 1, 0);
    console.log(`getSupplierCatalogPage(${supplierId}): products.length=${products.length}`);
    if (products.length > 0) {
      console.log(`  первый товар: ID=${products[0].id}, supplierId=${products[0].supplierId}`);
    }
    expect(Array.isArray(products)).toBeTruthy();
    if (products.length > 0) {
      expect(products[0]).toHaveProperty("id");
    }
  }, 15000);
});
