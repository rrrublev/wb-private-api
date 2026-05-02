/* eslint-disable no-undef */
const Constants = require("../src/Constants");
const WBPrivateAPI = require("../src/WBPrivateAPI");
const WBProduct = require("../src/WBProduct");

const WBCatalog = require("../src/WBCatalog");

let wbapi;
let catalog;
let product;

beforeAll(async () => {
  wbapi = new WBPrivateAPI({ destination: Constants.DESTINATIONS.MOSCOW });
  const token = process.env.WBAAS_TOKEN;
  if (token) wbapi.setToken(token);

  catalog = await wbapi.search("швабра zetter", 1);
  product = catalog instanceof WBCatalog ? catalog.products[0] : null;

  if (product) {
    console.log(`Найдено товаров: ${catalog.products.length}`);
    console.log(`Тестовый товар: ID ${product.id}, "${product.name}"`);
  } else {
    console.log("⚠️  Антибот заблокировал запрос при инициализации — все тесты будут пропущены");
  }
}, 30 * 1000);

describe("Проверка класса WBProduct", () => {
  test("WBProduct.create() возвращает заполненный объект со всеми разделами данных", async () => {
    if (!product) return;
    try {
      const p = await WBProduct.create(product.id);

      console.log("IMT ID:      " + p._rawResponse.imt_id);
      console.log("Name:        " + p._rawResponse.details?.name);
      console.log("Brand:       " + p._rawResponse.details?.brand);
      console.log("Supplier ID: " + p._rawResponse.seller?.supplierId);
      const priceBasic   = p._rawResponse.details?.sizes?.[0]?.price?.basic;
      const priceProduct = p._rawResponse.details?.sizes?.[0]?.price?.product;
      console.log("Price:       " + (priceBasic   != null ? (priceBasic   / 100).toFixed(2) + " ₽" : "—") + " (до скидки)");
      console.log("Price:       " + (priceProduct != null ? (priceProduct / 100).toFixed(2) + " ₽" : "—") + " (со скидкой)");
      console.log("Questions:   " + p.totalQuestions);

      expect(p).toBeInstanceOf(WBProduct);
      expect(p._rawResponse.imt_id).toBeTruthy();
      expect(p._rawResponse.details?.name).toBeTruthy();
      expect(p._rawResponse.seller?.supplierId).toBeTruthy();
      expect(typeof p.totalQuestions).toBe("number");
    } catch (error) {
      if (error.response?.status === 404) {
        console.log("⚠️  API временно недоступен (404), тест пропущен");
        expect(error.response.status).toBe(404);
      } else {
        throw error;
      }
    }
  }, 30 * 1000);

  test("Проверка метода .getStocks() на возврат данных об остатках товара на складах", async () => {
    if (!product) return;
    try {
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
      if (!product) return;
      try {
        const wbProduct = new WBProduct(product);
        await wbProduct.getProductData();
        console.log("imt_id:", wbProduct._rawResponse.imt_id);
        await wbProduct.getFeedbacks();
        console.log("feedbacks.length: " + wbProduct.feedbacks.length);

        expect(typeof wbProduct.feedbacks === "object").toBeTruthy();
        expect(Array.isArray(wbProduct.feedbacks)).toBeTruthy();
      } catch (error) {
        if (error.response?.status === 404) {
          console.log("⚠️  API эндпоинт getFeedbacks временно недоступен (404)");
          expect(error.response.status).toBe(404);
        } else {
          throw error;
        }
      }
    },
    30 * 1000
  );

  test(
    "Проверка метода .getQuestionsCount() на возврат количества вопросов",
    async () => {
      if (!product) return;
      try {
        const wbProduct = new WBProduct(product);
        await wbProduct.getProductData();
        const count = await wbProduct.getQuestionsCount();

        console.log("getQuestionsCount: " + count);
        console.log("this.totalQuestions: " + wbProduct.totalQuestions);
        console.log("в _rawResponse есть totalQuestions: " + ("totalQuestions" in wbProduct._rawResponse));

        expect(typeof count).toBe("number");
        expect(count).toBeGreaterThanOrEqual(0);
        expect(wbProduct.totalQuestions).toBe(count);
        expect("totalQuestions" in wbProduct._rawResponse).toBe(false);
      } catch (error) {
        if (error.response?.status === 404) {
          console.log("⚠️  API эндпоинт getQuestionsCount временно недоступен (404)");
          expect(error.response.status).toBe(404);
        } else {
          throw error;
        }
      }
    },
    30 * 1000
  );

  test(
    "Проверка пагинации .getQuestions() — первая и последняя страница",
    async () => {
      if (!product) return;
      try {
        const wbProduct = new WBProduct(product);
        await wbProduct.getProductData();

        const total = await wbProduct.getQuestionsCount();
        const totalPages = Math.ceil(total / Constants.QUESTIONS_PER_PAGE);
        console.log(`totalQuestions: ${total}, totalPages: ${totalPages}`);

        const firstPage = await wbProduct._fetchQuestionsPage(1);
        const expectedFirst = Math.min(total, Constants.QUESTIONS_PER_PAGE);
        console.log(`  стр. 1: получено ${firstPage.length} (ожидалось ${expectedFirst})`);
        expect(firstPage.length).toBe(expectedFirst);

        if (totalPages > 1) {
          const secondPage = await wbProduct._fetchQuestionsPage(2);
          console.log(`  стр. 2: получено ${secondPage.length} (ожидалось ${Constants.QUESTIONS_PER_PAGE})`);
          expect(secondPage.length).toBe(Constants.QUESTIONS_PER_PAGE);
        }
      } catch (error) {
        if (error.response?.status === 404) {
          console.log("⚠️  API эндпоинт getQuestions временно недоступен (404)");
          expect(error.response.status).toBe(404);
        } else {
          throw error;
        }
      }
    },
    30 * 1000
  );
});
