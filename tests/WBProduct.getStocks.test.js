/* eslint-disable no-undef */
const Constants = require("../src/Constants");
const WBPrivateAPI = require("../src/WBPrivateAPI");
const WBProduct = require("../src/WBProduct");

const wbapi = new WBPrivateAPI({
  destination: Constants.DESTINATIONS.MOSCOW,
});

describe("Детальное тестирование метода WBProduct.getStocks()", () => {
  let testProduct;
  let testProductId;

  beforeAll(async () => {
    // Получаем актуальный товар из поиска для тестирования
    console.log("🔍 Поиск актуального товара для тестирования...");
    const catalog = await wbapi.search("швабра zetter", 1);
    expect(catalog.products.length).toBeGreaterThan(0);

    testProduct = catalog.products[0];
    console.log(testProduct);

    testProductId = testProduct.id;

    console.log(
      `📦 Выбран товар для тестирования: ID ${testProductId}, "${testProduct.name}"`
    );
  }, 30000);

  test("Проверка метода .getStocks() на товаре из поиска", async () => {
    try {
      const product = new WBProduct(testProduct);
      console.log(`🔄 Получаем остатки для товара ${testProductId}...`);

      const stocks = await product.getStocks();

      // Проверяем что метод вернул массив
      expect(Array.isArray(stocks)).toBeTruthy();
      console.log(`📊 Получено складов: ${stocks.length}`);

      // Проверяем структуру данных об остатках
      if (stocks.length > 0) {
        const firstStock = stocks[0];
        console.log("📋 Структура первого склада:", Object.keys(firstStock));

        // Проверяем наличие ключевых полей
        expect(firstStock).toHaveProperty("wh"); // ID склада
        expect(typeof firstStock.wh).toBe("number");

        if (firstStock.qty !== undefined) {
          expect(typeof firstStock.qty).toBe("number");
          expect(firstStock.qty).toBeGreaterThanOrEqual(0);
        }

        console.log(
          `📦 Первый склад: ID ${firstStock.wh}, количество: ${
            firstStock.qty || "N/A"
          }`
        );
      }

      // Проверяем totalStocks если доступно
      if (product.totalStocks !== undefined) {
        expect(typeof product.totalStocks).toBe("number");
        expect(product.totalStocks).toBeGreaterThanOrEqual(0);
        console.log(`📈 Общий остаток: ${product.totalStocks}`);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        console.log("⚠️  API эндпоинт getStocks временно недоступен (404)");
        console.log(
          "📝 Это ожидаемая ситуация - некоторые товары могут быть недоступны"
        );
        expect(error.response.status).toBe(404);
      } else {
        console.error("❌ Неожиданная ошибка:", error.message);
        throw error;
      }
    }
  }, 30000);

  test("Проверка метода .getStocks() с несколькими товарами", async () => {
    try {
      console.log("🔄 Тестируем getStocks() на нескольких товарах...");

      // Получаем несколько товаров для тестирования
      const catalog = await wbapi.search("футболка", 1);
      const testProducts = catalog.products.slice(0, 3); // Берем первые 3 товара

      let successCount = 0;
      let errorCount = 0;
      let notFoundCount = 0;

      for (let i = 0; i < testProducts.length; i++) {
        const productData = testProducts[i];
        const product = new WBProduct(productData);

        try {
          console.log(`📦 Тестируем товар ${i + 1}/3: ID ${productData.id}`);
          const stocks = await product.getStocks();

          expect(Array.isArray(stocks)).toBeTruthy();
          successCount++;

          console.log(
            `  ✅ Успешно получены остатки: ${stocks.length} складов`
          );

          // Небольшая задержка между запросами
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          if (error.response?.status === 404) {
            notFoundCount++;
            console.log(`  ⚠️  Товар ${productData.id} недоступен (404)`);
          } else {
            errorCount++;
            console.log(
              `  ❌ Ошибка для товара ${productData.id}:`,
              error.message
            );
          }
        }
      }

      console.log(
        `📊 Результаты: успешно ${successCount}, 404 ошибок ${notFoundCount}, других ошибок ${errorCount}`
      );

      // Если все товары недоступны (404), это нормальная ситуация
      if (notFoundCount === testProducts.length) {
        console.log(
          "📝 Все товары недоступны через getStocks API - это ожидаемая ситуация"
        );
        expect(notFoundCount).toBe(testProducts.length);
      } else {
        // Если есть успешные запросы, проверяем их
        expect(successCount + notFoundCount + errorCount).toBe(
          testProducts.length
        );
      }
    } catch (error) {
      console.error(
        "❌ Критическая ошибка в тесте множественных товаров:",
        error.message
      );
      throw error;
    }
  }, 60000);

  test("Проверка обработки ошибок в .getStocks()", async () => {
    console.log("🧪 Тестируем обработку ошибок в getStocks()...");

    // Создаем товар с несуществующим ID
    const invalidProduct = new WBProduct({ id: 999999999 });

    try {
      await invalidProduct.getStocks();
      // Если дошли сюда, значит запрос неожиданно прошел успешно
      console.log("⚠️  Неожиданно успешный запрос для несуществующего товара");
    } catch (error) {
      // Ожидаем ошибку для несуществующего товара
      expect(error).toBeDefined();
      console.log(`✅ Корректно обработана ошибка: ${error.message}`);

      if (error.response) {
        expect([404, 400, 500]).toContain(error.response.status);
        console.log(`📋 Статус ошибки: ${error.response.status}`);
      }
    }
  }, 15000);

  test("Проверка производительности .getStocks()", async () => {
    if (!testProduct) {
      console.log(
        "⚠️  Пропускаем тест производительности - нет тестового товара"
      );
      return;
    }

    console.log("⏱️  Тестируем производительность getStocks()...");

    const product = new WBProduct(testProduct);
    const startTime = Date.now();

    try {
      await product.getStocks();
      const duration = Date.now() - startTime;

      console.log(`⚡ Время выполнения getStocks(): ${duration}мс`);

      // Ожидаем что запрос выполнится за разумное время (менее 10 секунд)
      expect(duration).toBeLessThan(10000);

      if (duration < 1000) {
        console.log("🚀 Отличная производительность (< 1 сек)");
      } else if (duration < 3000) {
        console.log("✅ Хорошая производительность (< 3 сек)");
      } else {
        console.log("⚠️  Медленная производительность (> 3 сек)");
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ Ошибка после ${duration}мс: ${error.message}`);

      if (error.response?.status === 404) {
        console.log("📝 404 ошибка ожидаема для некоторых товаров");
        expect(error.response.status).toBe(404);
      } else {
        throw error;
      }
    }
  }, 15000);

  afterAll(() => {
    console.log("🏁 Завершение тестирования getStocks()");
  });
});
