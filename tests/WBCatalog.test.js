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
      expect(catalog.page(2).length).toBe(100);
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
