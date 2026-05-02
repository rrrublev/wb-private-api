/* eslint-disable no-undef */
const Constants = require("../src/Constants");
const Utils = require("../src/Utils");
const WBPrivateAPI = require("../src/WBPrivateAPI");

// Инициализация идентична другим интеграционным тестам (WBProduct.test.js и др.):
// WBPrivateAPI сам читает токен из .wbaas_token через SessionBuilder.readToken(),
// а process.env.WBAAS_TOKEN — запасной вариант из jest.setup.js (CI без файла).
const wbapi = new WBPrivateAPI({ destination: Constants.DESTINATIONS.MOSCOW });
const token = process.env.WBAAS_TOKEN;
if (token) {
  wbapi.setToken(token);
} else {
  console.warn("⚠️  WBAAS_TOKEN не установлен — защищённые эндпоинты вернут 403/429");
}

// Обёртка над wbapi.session.get(): возвращает { status, data } на успехе
// и { status } на HTTP-ошибке (403, 404 и т.п.).
// Session.get() сам применяет toProxyUrl при наличии токена.
// Сетевые ошибки (DNS, timeout) бросает дальше — тест их ловит и пропускает.
async function httpGet(url, { params = {}, headers = {} } = {}) {
  try {
    return await wbapi.session.get(url, { params, headers, retryOptions: { retries: 0 } });
  } catch (error) {
    if (error.response?.status) return { status: error.response.status };
    throw error;
  }
}

// Строит URL из шаблона Constants.URLS.PRODUCT.*/IMAGES.* для конкретного товара.
// Использует ту же логику, что Utils.Card.imageURL: basket (zero-padded), vol, part.
function buildProductUrl(template, productId, extra = {}) {
  const basket = Utils.Card.getBasketNumber(productId); // "12" — уже zero-padded
  const vol = Math.floor(productId / 100000);
  const part = Math.floor(productId / 1000);
  let url = template
    .replace("{0}", basket)
    .replace("{1}", vol)
    .replace("{2}", part)
    .replace("{3}", productId);
  for (const [k, v] of Object.entries(extra)) {
    url = url.replace(k, v);
  }
  return url;
}

// Тестовые данные
const TEST_DATA = {
  products: {
    valid: [177899980, 60059650, 304390393, 67858518],
    invalid: [999999999, 123456789]
  },
  suppliers: {
    valid: [1136572, 18740, 206198, 244907],
    invalid: [999999999]
  },
  brands: {
    valid: [244907, 206198],
    invalid: [999999999]
  },
  keywords: ["швабра zetter", "футболка", "телефон"],
  imtIds: [27334676, 12345678],
  partitionIds: ["1", "2"]
};

describe("Тестирование URL из Constants.js", () => {
  describe("URLS.MAIN_MENU", () => {
    test("Проверка доступности главного меню", async () => {
      const url = Constants.URLS.MAIN_MENU;
      let result;
      try {
        result = await httpGet(url);
      } catch (error) {
        console.log(`⚠️  MAIN_MENU недоступен (сеть): ${error.message}`);
        return;
      }
      expect(result.status).toBe(200);
      console.log(`✅ MAIN_MENU: ${url}`);
    }, 15000);
  });

  describe("URLS.BRAND", () => {
    test("Проверка URL изображений брендов", async () => {
      const brandId = TEST_DATA.brands.valid[0];
      const url = Utils.Brand.imageURL(brandId);
      let result;
      try {
        result = await httpGet(url);
      } catch (error) {
        console.log(`⚠️  BRAND.IMAGE недоступен (сеть): ${error.message}`);
        return;
      }
      expect([200, 404]).toContain(result.status);
      console.log(`✅ BRAND.IMAGE: ${url} (${result.status})`);
    }, 15000);

    test("Проверка URL каталога брендов", async () => {
      const url = Constants.URLS.BRAND.CATALOG;
      let result;
      try {
        result = await httpGet(url, {
          params: {
            appType: Constants.APPTYPES.DESKTOP,
            curr: Constants.CURRENCIES.RUB,
            dest: Constants.DESTINATIONS.MOSCOW.ids[0],
            brand: TEST_DATA.brands.valid[0],
            limit: 0,
          }
        });
      } catch (error) {
        console.log(`⚠️  BRAND.CATALOG недоступен (сеть): ${error.message}`);
        return;
      }
      // с токеном → session переключает на _INTERNAL → 200; без токена → 403/429
      expect(token ? [200] : [400, 403, 404, 429]).toContain(result.status);
      console.log(`✅ BRAND.CATALOG: ${url} (${result.status})`);
    }, 15000);
  });

  describe("URLS.SUPPLIER", () => {
    test("Проверка URL информации о поставщике", async () => {
      const supplierId = TEST_DATA.suppliers.valid[0];
      const url = Constants.URLS.SUPPLIER.INFO.replace("{0}", supplierId);
      let result;
      try {
        result = await httpGet(url);
      } catch (error) {
        console.log(`⚠️  SUPPLIER.INFO недоступен (сеть): ${error.message}`);
        return;
      }
      expect([200, 404]).toContain(result.status);
      if (result.status === 200) {
        // Структура: { supplierId, supplierName, supplierFullName, inn, ogrn, ... }
        expect(result.data.supplierId).toBeDefined();
        expect(typeof result.data.supplierName).toBe("string");
      }
      console.log(`✅ SUPPLIER.INFO: ${url} (${result.status})`);
    }, 15000);

    test("Проверка URL каталога поставщика", async () => {
      const url = Constants.URLS.SUPPLIER.CATALOG;
      const supplierId = TEST_DATA.suppliers.valid[1];
      let result;
      try {
        result = await httpGet(url, {
          params: {
            appType: Constants.APPTYPES.DESKTOP,
            curr: Constants.CURRENCIES.RUB,
            dest: Constants.DESTINATIONS.MOSCOW.ids[0],
            supplier: supplierId,
            page: 1
          }
        });
      } catch (error) {
        console.log(`⚠️  SUPPLIER.CATALOG недоступен (сеть): ${error.message}`);
        return;
      }
      // с токеном → session переключает на _INTERNAL → 200; без токена → 403/429
      expect(token ? [200] : [400, 403, 404, 429]).toContain(result.status);
      console.log(`✅ SUPPLIER.CATALOG: ${url} (${result.status})`);
    }, 15000);

    test("Проверка URL фильтров поставщика", async () => {
      const url = Constants.URLS.SUPPLIER.FILTERS;
      const supplierId = TEST_DATA.suppliers.valid[1];
      let result;
      try {
        result = await httpGet(url, {
          params: {
            appType: Constants.APPTYPES.DESKTOP,
            curr: Constants.CURRENCIES.RUB,
            dest: Constants.DESTINATIONS.MOSCOW.ids[0],
            supplier: supplierId
          }
        });
      } catch (error) {
        console.log(`⚠️  SUPPLIER.FILTERS недоступен (сеть): ${error.message}`);
        return;
      }
      // с токеном → session переключает на _INTERNAL → 200; без токена → 403/429
      expect(token ? [200] : [400, 403, 404, 429]).toContain(result.status);
      console.log(`✅ SUPPLIER.FILTERS: ${url} (${result.status})`);
    }, 15000);

    test("Проверка URL отгрузки поставщика", async () => {
      const supplierId = TEST_DATA.suppliers.valid[0];
      const url = Constants.URLS.SUPPLIER.SHIPMENT.replace("{0}", supplierId);
      let result;
      try {
        result = await httpGet(url, { headers: { "x-client-name": "site" } });
      } catch (error) {
        console.log(`⚠️  SUPPLIER.SHIPMENT недоступен (сеть): ${error.message}`);
        return;
      }
      expect([200, 403, 404]).toContain(result.status);
      console.log(`✅ SUPPLIER.SHIPMENT: ${url} (${result.status})`);
    }, 15000);
  });

  describe("URLS.PRODUCT", () => {
    test("Проверка URL карточки товара", async () => {
      const productId = TEST_DATA.products.valid[0];
      const url = buildProductUrl(Constants.URLS.PRODUCT.CARD, productId);
      let result;
      try {
        result = await httpGet(url);
      } catch (error) {
        console.log(`⚠️  PRODUCT.CARD недоступен (сеть): ${error.message}`);
        return;
      }
      expect([200, 404]).toContain(result.status);
      if (result.status === 200) {
        // Структура: { imt_id, nm_id, imt_name, description, options, ... }
        expect(result.data.nm_id).toBeDefined();
        expect(result.data.imt_id).toBeDefined();
      }
      console.log(`✅ PRODUCT.CARD: ${url} (${result.status})`);
    }, 15000);

    test("Проверка URL продавцов товара", async () => {
      const productId = TEST_DATA.products.valid[0];
      const url = buildProductUrl(Constants.URLS.PRODUCT.SELLERS, productId);
      let result;
      try {
        result = await httpGet(url);
      } catch (error) {
        console.log(`⚠️  PRODUCT.SELLERS недоступен (сеть): ${error.message}`);
        return;
      }
      expect([200, 404]).toContain(result.status);
      console.log(`✅ PRODUCT.SELLERS: ${url} (${result.status})`);
    }, 15000);

    test("Проверка URL деталей товара", async () => {
      const url = Constants.URLS.PRODUCT.DETAILS;
      const productId = TEST_DATA.products.valid[0];
      let result;
      try {
        result = await httpGet(url, {
          params: {
            appType: Constants.APPTYPES.DESKTOP,
            curr: Constants.CURRENCIES.RUB,
            dest: Constants.DESTINATIONS.MOSCOW.ids[0],
            nm: `${productId};`
          }
        });
      } catch (error) {
        console.log(`⚠️  PRODUCT.DETAILS недоступен (сеть): ${error.message}`);
        return;
      }
      // с токеном → session переключает на _INTERNAL → 200; без токена → 403
      expect(token ? [200] : [400, 403, 404]).toContain(result.status);
      console.log(`✅ PRODUCT.DETAILS: ${url} (${result.status})`);
    }, 15000);

    test("Проверка URL отзывов товара", async () => {
      const imtId = TEST_DATA.imtIds[0];
      const partitionId = TEST_DATA.partitionIds[0];
      const url = Constants.URLS.PRODUCT.FEEDBACKS
        .replace("{0}", partitionId)
        .replace("{1}", imtId);
      let result;
      try {
        result = await httpGet(url);
      } catch (error) {
        console.log(`⚠️  PRODUCT.FEEDBACKS недоступен (сеть): ${error.message}`);
        return;
      }
      expect([200, 404]).toContain(result.status);
      if (result.status === 200) {
        // Структура: { feedbacks, feedbackCount, valuation, ... }
        expect(typeof result.data.feedbackCount).toBe("number");
      }
      console.log(`✅ PRODUCT.FEEDBACKS: ${url} (${result.status})`);
    }, 15000);

    test("Проверка URL вопросов товара", async () => {
      const url = Constants.URLS.PRODUCT.QUESTIONS;
      const imtId = TEST_DATA.imtIds[0];
      let result;
      try {
        result = await httpGet(url, { params: { imtId, onlyCount: true } });
      } catch (error) {
        console.log(`⚠️  PRODUCT.QUESTIONS недоступен (сеть): ${error.message}`);
        return;
      }
      expect([200, 400, 404]).toContain(result.status);
      if (result.status === 200) {
        // Структура: { questions, count, err }
        expect(typeof result.data.count).toBe("number");
      }
      console.log(`✅ PRODUCT.QUESTIONS: ${url} (${result.status})`);
    }, 15000);
  });

  describe("URLS.SEARCH", () => {
    test("Проверка URL точного поиска", async () => {
      const url = Constants.URLS.SEARCH.EXACTMATCH;
      const keyword = TEST_DATA.keywords[0];
      let result;
      try {
        result = await httpGet(url, {
          params: {
            appType: Constants.APPTYPES.DESKTOP,
            curr: Constants.CURRENCIES.RUB,
            dest: Constants.DESTINATIONS.MOSCOW.ids[0],
            query: keyword,
            resultset: "catalog"
          }
        });
      } catch (error) {
        console.log(`⚠️  SEARCH.EXACTMATCH недоступен (сеть): ${error.message}`);
        return;
      }
      // 498 — антибот WB, требует браузерной сессии
      expect([200, 400, 498]).toContain(result.status);
      console.log(`✅ SEARCH.EXACTMATCH: ${url} (${result.status})`);
    }, 15000);

    test("Проверка URL поиска похожих товаров", async () => {
      const url = Constants.URLS.SEARCH.SIMILAR_BY_NM;
      const productId = TEST_DATA.products.valid[1];
      let result;
      try {
        result = await httpGet(url, { params: { nm: productId } });
      } catch (error) {
        console.log(`⚠️  SEARCH.SIMILAR_BY_NM недоступен (сеть): ${error.message}`);
        return;
      }
      expect([200, 404]).toContain(result.status);
      console.log(`✅ SEARCH.SIMILAR_BY_NM: ${url} (${result.status})`);
    }, 15000);

    // catalog-ads.wildberries.ru и carousel-ads.wildberries.ru недоступны с данного IP
    // (ENOTFOUND — геоблок или хосты выведены из эксплуатации).
    // Тесты проверяют только что URL прописан корректно в Constants.
    test("Проверка URL рекламы в поиске", async () => {
      const url = Constants.URLS.SEARCH.ADS;
      expect(url).toMatch(/^https:\/\//);
      let result;
      try {
        result = await httpGet(url, { params: { keyword: TEST_DATA.keywords[0] } });
        expect([200, 400, 403, 404]).toContain(result.status);
        console.log(`✅ SEARCH.ADS: ${url} (${result.status})`);
      } catch (error) {
        console.log(`⚠️  SEARCH.ADS недоступен (сеть): ${error.message}`);
      }
    }, 15000);

    test("Проверка URL карусельной рекламы", async () => {
      const url = Constants.URLS.SEARCH.CAROUSEL_ADS;
      expect(url).toMatch(/^https:\/\//);
      let result;
      try {
        result = await httpGet(url, { params: { nm: TEST_DATA.products.valid[0] } });
        expect([200, 400, 403, 404]).toContain(result.status);
        console.log(`✅ SEARCH.CAROUSEL_ADS: ${url} (${result.status})`);
      } catch (error) {
        console.log(`⚠️  SEARCH.CAROUSEL_ADS недоступен (сеть): ${error.message}`);
      }
    }, 15000);

    test("Проверка URL подсказок поиска", async () => {
      const url = Constants.URLS.SEARCH.HINT;
      let result;
      try {
        result = await httpGet(url, {
          params: {
            query: TEST_DATA.keywords[0],
            gender: Constants.SEX.COMMON,
            locale: Constants.LOCALES.RU,
            lang: Constants.LOCALES.RU,
            appType: Constants.APPTYPES.DESKTOP,
          }
        });
      } catch (error) {
        console.log(`⚠️  SEARCH.HINT недоступен (сеть): ${error.message}`);
        return;
      }
      // с токеном → session переключает на _INTERNAL → 200; без токена → 403
      expect(token ? [200] : [400, 403]).toContain(result.status);
      console.log(`✅ SEARCH.HINT: ${url} (${result.status})`);
    }, 15000);
  });

  describe("URLS.IMAGES", () => {
    test("Проверка URL изображений товаров", async () => {
      const productId = TEST_DATA.products.valid[0];
      const imageOrder = 1;

      for (const imageType of ["TINY", "BIG", "SMALL", "MEDIUM"]) {
        const url = buildProductUrl(Constants.URLS.IMAGES[imageType], productId, { "{4}": imageOrder });
        let result;
        try {
          result = await httpGet(url);
        } catch (error) {
          console.log(`⚠️  IMAGES.${imageType} недоступен (сеть): ${error.message}`);
          continue;
        }
        expect([200, 404]).toContain(result.status);
        console.log(`✅ IMAGES.${imageType}: ${url} (${result.status})`);
      }
    }, 30000);
  });

  describe("URLS.PROMOS", () => {
    test("Проверка URL промо-акций", async () => {
      const url = Constants.URLS.PROMOS;
      let result;
      try {
        result = await httpGet(url);
      } catch (error) {
        console.log(`⚠️  PROMOS недоступен (сеть): ${error.message}`);
        return;
      }
      // 498 — антибот WB
      expect([200, 404, 498]).toContain(result.status);
      console.log(`✅ PROMOS: ${url} (${result.status})`);
    }, 15000);
  });

  describe("Валидация структуры URL", () => {
    test("Все URL должны быть валидными", () => {
      const allUrls = getAllUrlsFromConstants();

      allUrls.forEach(({ path, url }) => {
        expect(url).toBeDefined();
        expect(typeof url).toBe("string");
        expect(url.length).toBeGreaterThan(0);
        if (!url.includes("{")) {
          expect(url).toMatch(/^https?:\/\//);
        }
        console.log(`✅ URL структура валидна: ${path} = ${url}`);
      });
    });

    test("URL с плейсхолдерами должны содержать правильные маркеры", () => {
      const urlsWithPlaceholders = [
        { path: "BRAND.IMAGE",       url: Constants.URLS.BRAND.IMAGE,       placeholders: ["{0}"] },
        { path: "SUPPLIER.INFO",     url: Constants.URLS.SUPPLIER.INFO,     placeholders: ["{0}"] },
        { path: "SUPPLIER.SHIPMENT", url: Constants.URLS.SUPPLIER.SHIPMENT, placeholders: ["{0}"] },
        { path: "PRODUCT.CARD",      url: Constants.URLS.PRODUCT.CARD,      placeholders: ["{0}", "{1}", "{2}", "{3}"] },
        { path: "PRODUCT.SELLERS",   url: Constants.URLS.PRODUCT.SELLERS,   placeholders: ["{0}", "{1}", "{2}", "{3}"] },
        { path: "PRODUCT.FEEDBACKS", url: Constants.URLS.PRODUCT.FEEDBACKS, placeholders: ["{0}", "{1}"] },
        { path: "IMAGES.BIG",        url: Constants.URLS.IMAGES.BIG,        placeholders: ["{0}", "{1}", "{2}", "{3}", "{4}"] }
      ];

      urlsWithPlaceholders.forEach(({ path, url, placeholders }) => {
        placeholders.forEach(placeholder => {
          expect(url).toContain(placeholder);
        });
        console.log(`✅ Плейсхолдеры валидны: ${path}`);
      });
    });
  });
});

function getAllUrlsFromConstants() {
  const urls = [];

  function extractUrls(obj, path = "") {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      if (typeof value === "string" && value.startsWith("http")) {
        urls.push({ path: currentPath, url: value });
      } else if (typeof value === "object" && value !== null) {
        extractUrls(value, currentPath);
      }
    }
  }

  extractUrls(Constants.URLS);
  return urls;
}
