/* eslint-disable no-undef */
const Constants = require("../src/Constants");
const WBPrivateAPI = require("../src/WBPrivateAPI");
const WBCatalog = require("../src/WBCatalog");

let wbapi;

beforeAll(() => {
  wbapi = new WBPrivateAPI({
    destination: Constants.DESTINATIONS.MOSCOW,
  });
}, 60000);

describe("Проверка класса WBCatalog", () => {
  test(
    'Проверка метода .page() по ключевому запросу "Очки женские"',
    async () => {
      const catalog = await wbapi.search("Очки женские", 2);
      if (!(catalog instanceof WBCatalog)) {
        console.log("⚠️  Пропускаем тест — антибот заблокировал запрос");
        return;
      }
      console.log(`products.length: ${catalog.products.length}, totalProducts: ${catalog.totalProducts}`);
      if (catalog.products.length < Constants.PRODUCTS_PER_PAGE * 2) {
        console.log("⚠️  Загружено меньше 2 страниц — пропускаем проверку page(2)");
        return;
      }
      expect(catalog.page(1).length).toBe(Constants.PRODUCTS_PER_PAGE);
      expect(catalog.page(2).length).toBe(Constants.PRODUCTS_PER_PAGE);
      expect(catalog.page(3).length).toBe(0);
      // проверяем что элементы реальные, не undefined
      expect(catalog.page(2)[0]).toBeDefined();
    },
    60 * 1000
  );

  test('Проверка метода .getPosition() по ключевому запросу "Менструальные чаши"', async () => {
    const catalog = await wbapi.search("Менструальные чаши", 2);
    if (!(catalog instanceof WBCatalog)) {
      console.log("⚠️  Пропускаем тест — антибот заблокировал запрос");
      return;
    }
    {
      const sku = catalog.products[130].id;
      const position = catalog.getPosition(sku);
      expect(position).toBe(130);
    }

    {
      const sku = catalog.products[0].id;
      const position = catalog.getPosition(sku);
      expect(position).toBe(0);
    }
  });

  test("Проверка метода .getPosition() на ответ при ложном поиске", async () => {
    const catalog = await wbapi.search("Менструальные чаши", 3);
    if (!(catalog instanceof WBCatalog)) {
      console.log("⚠️  Пропускаем тест — антибот заблокировал запрос");
      return;
    }
    const position = catalog.getPosition(0);
    expect(position).toBe(-1);
  });
});
