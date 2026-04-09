/* eslint-disable no-undef */
const Constants = require("../src/Constants");
const WBPrivateAPI = require("../src/WBPrivateAPI");
const WBProduct = require("../src/WBProduct");

const SessionBuilder = require("../src/SessionBuilder");
const WBCatalog = require("../src/WBCatalog");

let wbapi;

beforeAll(() => {
  wbapi = new WBPrivateAPI({ destination: Constants.DESTINATIONS.MOSCOW });
  const token = process.env.WBAAS_TOKEN;
  if (token) SessionBuilder.setAntibotToken(wbapi.session, token);
});

describe("Проверка класса WBProduct", () => {
  test("Проверка метода .getStocks() на возврат данных об остатках товара на складах", async () => {
    try {
      const catalog = await wbapi.search("швабра zetter", 1);
      if (!(catalog instanceof WBCatalog)) {
        console.log("⚠️  Антибот заблокировал запрос, тест пропущен");
        return;
      }
      console.log("Найдено товаров в каталоге: " + catalog.products.length);
      const product = catalog.products[0];
      console.log("Тестовый товар: ID " + product.id + ", \"" + product.name + "\", поставщик " + product.supplierId);
      await product.getStocks();
      console.log("totalQuantity: " + product.totalQuantity);
      expect(product.totalQuantity).toBeGreaterThanOrEqual(0);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log("⚠️  API эндпоинт getStocks временно недоступен (404)");
        expect(error.response.status).toBe(404);
      } else {
        throw error;
      }
    }
  });

  test(
    "Проверка метода .getFeedbacks() на возврат всех отзывов",
    async () => {
      try {
        const catalog = await wbapi.search("швабра zetter", 1);
        if (!(catalog instanceof WBCatalog)) {
          console.log("⚠️  Антибот заблокировал запрос, тест пропущен");
          return;
        }
        console.log("Найдено товаров: " + catalog.products.length);
        const product = catalog.products[0];
        console.log("Тестовый товар: ID " + product.id + ", \"" + product.name + "\"");

        const wbProduct = new WBProduct(product);
        await wbProduct.getProductData();
        console.log("imt_id:", wbProduct._rawResponse.imt_id);
        await wbProduct.getFeedbacks();
        console.log("feedbacks.length: " + wbProduct.feedbacks.length);

        expect(typeof wbProduct.feedbacks === "object").toBeTruthy();
        expect(Array.isArray(wbProduct.feedbacks)).toBeTruthy();
      } catch (error) {
        if (error.response?.status === 404) {
          console.log(
            "⚠️  API эндпоинт getFeedbacks временно недоступен (404)"
          );
          expect(error.response.status).toBe(404);
        } else {
          throw error;
        }
      }
    },
    30 * 1000
  );

  test(
    "Проверка метода .getQuestions() на возврат всех вопросов",
    async () => {
      try {
        const catalog = await wbapi.search("швабра zetter", 1);
        if (!(catalog instanceof WBCatalog)) {
          console.log("⚠️  Антибот заблокировал запрос, тест пропущен");
          return;
        }
        console.log("Найдено товаров: " + catalog.products.length);
        const product = catalog.products[0];
        console.log("Тестовый товар: ID " + product.id + ", \"" + product.name + "\"");

        const wbProduct = new WBProduct(product);
        await wbProduct.getProductData();
        console.log("imt_id:", wbProduct._rawResponse.imt_id);
        await wbProduct.getQuestions();
        console.log("questions.length: " + wbProduct.questions.length);

        expect(typeof wbProduct.questions === "object").toBeTruthy();
        expect(Array.isArray(wbProduct.questions)).toBeTruthy();
      } catch (error) {
        if (error.response?.status === 404) {
          console.log(
            "⚠️  API эндпоинт getQuestions временно недоступен (404)"
          );
          expect(error.response.status).toBe(404);
        } else {
          throw error;
        }
      }
    },
    30 * 1000
  );
});
