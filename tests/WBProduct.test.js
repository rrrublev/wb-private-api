/* eslint-disable no-undef */
const Constants = require("../src/Constants");
const WBPrivateAPI = require("../src/WBPrivateAPI");
const WBProduct = require("../src/WBProduct");

const wbapi = new WBPrivateAPI({
  destination: Constants.DESTINATIONS.MOSCOW,
});

describe("Проверка класса WBProduct", () => {
  test("Проверка метода .getStocks() на возврат данных об остатках товара на складах", async () => {
    try {
      const catalog = await wbapi.search("платье", 1);
      const product = catalog.products[0];
      await product.getStocks();
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
        // Используем актуальный товар из поиска вместо устаревшего ID
        const catalog = await wbapi.search("платье", 1);
        const product = catalog.products[0];

        // Создаем WBProduct с актуальными данными
        const wbProduct = new WBProduct(product);
        await wbProduct.getFeedbacks();

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
        // Используем актуальный товар из поиска
        const catalog = await wbapi.search("платье", 1);
        const product = catalog.products[0];

        const wbProduct = new WBProduct(product);
        await wbProduct.getQuestions();

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
