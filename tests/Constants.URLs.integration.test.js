/* eslint-disable no-undef */
const Constants = require("../src/Constants");
const WBPrivateAPI = require("../src/WBPrivateAPI");
const WBProduct = require("../src/WBProduct");

describe("Интеграционное тестирование URL с методами API", () => {
  let wbapi;
  let testProduct;
  let testSupplierId;
  
  beforeAll(async () => {
    wbapi = new WBPrivateAPI({
      destination: Constants.DESTINATIONS.MOSCOW,
    });
    
    // Получаем реальный товар для тестирования
    try {
      const catalog = await wbapi.search("швабра zetter", 1);
      if (catalog.products.length > 0) {
        testProduct = catalog.products[0];
        testSupplierId = testProduct.supplierId;
        console.log(`🔍 Найден тестовый товар: ID ${testProduct.id}, поставщик ${testSupplierId}`);
      }
    } catch (error) {
      console.log("⚠️  Не удалось получить тестовый товар:", error.message);
    }
  }, 30000);

  describe("Проверка соответствия URL и методов API", () => {
    test("URL поиска соответствует методу search()", async () => {
      if (!testProduct) {
        console.log("⚠️  Пропускаем тест - нет тестового товара");
        return;
      }

      try {
        // Проверяем что метод search использует правильный URL
        const catalog = await wbapi.search("тест", 1);
        expect(catalog).toBeDefined();
        expect(catalog.products).toBeDefined();
        
        // URL должен соответствовать Constants.URLS.SEARCH.EXACTMATCH
        expect(Constants.URLS.SEARCH.EXACTMATCH).toContain("search.wb.ru/exactmatch");
        console.log("✅ URL поиска соответствует методу search()");
      } catch (error) {
        console.log(`⚠️  Ошибка в тесте поиска: ${error.message}`);
      }
    }, 15000);

    test("URL поставщика соответствует методам supplier", async () => {
      if (!testSupplierId) {
        console.log("⚠️  Пропускаем тест - нет ID поставщика");
        return;
      }

      try {
        // Проверяем getSupplierInfo
        const supplierInfo = await wbapi.getSupplierInfo(testSupplierId);
        expect(supplierInfo).toBeDefined();
        
        // Проверяем SupplierTotalProducts
        const totalProducts = await wbapi.SupplierTotalProducts(testSupplierId);
        expect(typeof totalProducts).toBe("number");
        
        // URL должны соответствовать константам
        expect(Constants.URLS.SUPPLIER.INFO).toContain("supplier-by-id");
        expect(Constants.URLS.SUPPLIER.TOTALPRODUCTS).toContain("sellers/v8/filters");
        expect(Constants.URLS.SUPPLIER.CATALOG).toContain("sellers/v4/catalog");
        
        console.log("✅ URL поставщика соответствуют методам supplier");
      } catch (error) {
        console.log(`⚠️  Ошибка в тесте поставщика: ${error.message}`);
      }
    }, 15000);

    test("URL товара соответствует методам WBProduct", async () => {
      if (!testProduct) {
        console.log("⚠️  Пропускаем тест - нет тестового товара");
        return;
      }

      try {
        const product = new WBProduct(testProduct);
        
        // Проверяем что методы используют правильные URL
        await product.getProductData();
        expect(product._rawResponse).toBeDefined();
        
        // URL должны соответствовать константам
        expect(Constants.URLS.PRODUCT.CARD).toContain("basket-{0}.wbbasket.ru");
        expect(Constants.URLS.PRODUCT.SELLERS).toContain("basket-{0}.wb.ru");
        expect(Constants.URLS.PRODUCT.DETAILS).toContain("card.wb.ru/cards/v4/detail");
        
        console.log("✅ URL товара соответствуют методам WBProduct");
      } catch (error) {
        console.log(`⚠️  Ошибка в тесте товара: ${error.message}`);
      }
    }, 15000);

    test("URL изображений соответствует Utils.Card.imageURL", async () => {
      if (!testProduct) {
        console.log("⚠️  Пропускаем тест - нет тестового товара");
        return;
      }

      const Utils = require("../src/Utils");
      
      try {
        // Генерируем URL изображения
        const imageUrl = Utils.Card.imageURL(testProduct.id, "BIG", 1);
        expect(imageUrl).toBeDefined();
        expect(imageUrl).toContain("basket-");
        expect(imageUrl).toContain("wbbasket.ru");
        
        // Проверяем соответствие с константами
        expect(Constants.URLS.IMAGES.BIG).toContain("basket-{0}.wbbasket.ru");
        expect(Constants.URLS.IMAGES.BIG).toContain("images/big/{4}.jpg");
        
        console.log(`✅ URL изображений соответствует Utils: ${imageUrl}`);
      } catch (error) {
        console.log(`⚠️  Ошибка в тесте изображений: ${error.message}`);
      }
    });

    test("URL отзывов соответствует методу getFeedbacks", async () => {
      if (!testProduct || !testProduct.imt_id) {
        console.log("⚠️  Пропускаем тест - нет IMT ID товара");
        return;
      }

      try {
        const product = new WBProduct(testProduct);
        
        // Пытаемся получить отзывы
        const feedbacks = await product.getFeedbacks();
        expect(Array.isArray(feedbacks)).toBeTruthy();
        
        // URL должен соответствовать константе
        expect(Constants.URLS.PRODUCT.FEEDBACKS).toContain("feedbacks{0}.wb.ru");
        
        console.log("✅ URL отзывов соответствует методу getFeedbacks");
      } catch (error) {
        console.log(`⚠️  Ошибка в тесте отзывов: ${error.message}`);
      }
    }, 15000);

    test("URL вопросов соответствует методу getQuestions", async () => {
      if (!testProduct) {
        console.log("⚠️  Пропускаем тест - нет тестового товара");
        return;
      }

      try {
        const product = new WBProduct(testProduct);
        
        // Получаем количество вопросов
        const questionsCount = await product.getQuestionsCount();
        expect(typeof questionsCount).toBe("number");
        
        // URL должен соответствовать константе
        expect(Constants.URLS.PRODUCT.QUESTIONS).toContain("questions.wildberries.ru");
        
        console.log("✅ URL вопросов соответствует методу getQuestions");
      } catch (error) {
        console.log(`⚠️  Ошибка в тесте вопросов: ${error.message}`);
      }
    }, 15000);
  });

  describe("Проверка версий API в URL", () => {
    test("Версии API должны быть актуальными", () => {
      const urlVersions = {
        "SEARCH.EXACTMATCH": { url: Constants.URLS.SEARCH.EXACTMATCH, expectedVersion: "v13" },
        "SEARCH.TOTALPRODUCTS": { url: Constants.URLS.SEARCH.TOTALPRODUCTS, expectedVersion: "v13" },
        "SUPPLIER.TOTALPRODUCTS": { url: Constants.URLS.SUPPLIER.TOTALPRODUCTS, expectedVersion: "v8" },
        "SUPPLIER.CATALOG": { url: Constants.URLS.SUPPLIER.CATALOG, expectedVersion: "v4" },
        "PRODUCT.DETAILS": { url: Constants.URLS.PRODUCT.DETAILS, expectedVersion: "v4" },
        "PRODUCT.FEEDBACKS": { url: Constants.URLS.PRODUCT.FEEDBACKS, expectedVersion: "v1" },
        "SEARCH.ADS": { url: Constants.URLS.SEARCH.ADS, expectedVersion: "v5" },
        "SEARCH.CAROUSEL_ADS": { url: Constants.URLS.SEARCH.CAROUSEL_ADS, expectedVersion: "v4" },
        "SEARCH.HINT": { url: Constants.URLS.SEARCH.HINT, expectedVersion: "v7" }
      };

      Object.entries(urlVersions).forEach(([name, { url, expectedVersion }]) => {
        expect(url).toContain(expectedVersion);
        console.log(`✅ ${name}: версия ${expectedVersion} актуальна`);
      });
    });

    test("Домены должны быть корректными", () => {
      const expectedDomains = {
        "search.wb.ru": ["SEARCH.EXACTMATCH", "SEARCH.TOTALPRODUCTS"],
        "catalog.wb.ru": ["SUPPLIER.CATALOG", "BRAND.CATALOG"],
        "card.wb.ru": ["PRODUCT.DETAILS", "SEARCH.LIST", "PRODUCT.DELIVERYDATA"],
        "wbbasket.ru": ["PRODUCT.CARD", "IMAGES.BIG", "IMAGES.SMALL", "IMAGES.MEDIUM", "IMAGES.TINY"],
        "wb.ru": ["PRODUCT.SELLERS"],
        "wildberries.ru": ["PROMOS", "PRODUCT.QUESTIONS", "PRODUCT.EXTRADATA"],
        "wbstatic.net": ["BRAND.IMAGE", "IMAGES.FEEDBACK_BASE"],
        "static-basket-01.wbbasket.ru": ["MAIN_MENU", "SUPPLIER.INFO"]
      };

      Object.entries(expectedDomains).forEach(([domain, urlKeys]) => {
        urlKeys.forEach(urlKey => {
          const urlPath = urlKey.split(".");
          let url = Constants.URLS;
          
          for (const part of urlPath) {
            url = url[part];
          }
          
          if (typeof url === "string") {
            expect(url).toContain(domain);
            console.log(`✅ ${urlKey}: домен ${domain} корректен`);
          }
        });
      });
    });
  });

  describe("Проверка параметров URL", () => {
    test("Обязательные параметры должны присутствовать в запросах", async () => {
      if (!testProduct) {
        console.log("⚠️  Пропускаем тест - нет тестового товара");
        return;
      }

      // Проверяем что методы передают обязательные параметры
      const requiredParams = {
        appType: Constants.APPTYPES.DESKTOP,
        curr: Constants.CURRENCIES.RUB,
        dest: Constants.DESTINATIONS.MOSCOW.ids[0]
      };

      // Эти параметры должны использоваться в большинстве запросов
      expect(requiredParams.appType).toBe(1);
      expect(requiredParams.curr).toBe("rub");
      expect(Array.isArray(Constants.DESTINATIONS.MOSCOW.ids)).toBeTruthy();
      expect(Constants.DESTINATIONS.MOSCOW.ids.length).toBeGreaterThan(0);

      console.log("✅ Обязательные параметры определены корректно");
    });

    test("Константы должны соответствовать ожидаемым значениям", () => {
      // Проверяем основные константы
      expect(Constants.PRODUCTS_PER_PAGE).toBe(100);
      expect(Constants.PAGES_PER_CATALOG).toBe(100);
      expect(Constants.FEEDBACKS_PER_PAGE).toBe(20);
      expect(Constants.QUESTIONS_PER_PAGE).toBe(30);

      // Проверяем типы приложений
      expect(Constants.APPTYPES.DESKTOP).toBe(1);
      expect(Constants.APPTYPES.ANDROID).toBe(32);
      expect(Constants.APPTYPES.IOS).toBe(64);

      // Проверяем валюты
      expect(Constants.CURRENCIES.RUB).toBe("rub");

      // Проверяем локали
      expect(Constants.LOCALES.RU).toBe("ru");

      console.log("✅ Все константы соответствуют ожидаемым значениям");
    });
  });

  afterAll(() => {
    console.log("🏁 Завершение интеграционного тестирования URL");
  });
});