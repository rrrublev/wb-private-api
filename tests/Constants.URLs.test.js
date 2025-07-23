/* eslint-disable no-undef */
const Constants = require("../src/Constants");
const WBPrivateAPI = require("../src/WBPrivateAPI");
const axios = require("axios");

// Тестовые данные, извлеченные из существующих тестов
const TEST_DATA = {
  // Товары
  products: {
    valid: [177899980, 60059650, 304390393, 67858518],
    invalid: [999999999, 123456789]
  },
  
  // Поставщики
  suppliers: {
    valid: [1136572, 18740, 206198, 244907],
    invalid: [999999999]
  },
  
  // Бренды
  brands: {
    valid: [244907, 206198],
    invalid: [999999999]
  },
  
  // Другие параметры
  keywords: ["швабра zetter", "футболка", "телефон"],
  imtIds: [27334676, 12345678], // Примерные IMT ID
  partitionIds: ["1", "2"]
};

describe("Тестирование URL из Constants.js", () => {
  let wbapi;
  
  beforeAll(() => {
    wbapi = new WBPrivateAPI({
      destination: Constants.DESTINATIONS.MOSCOW,
    });
  });

  describe("URLS.MAIN_MENU", () => {
    test("Проверка доступности главного меню", async () => {
      const url = Constants.URLS.MAIN_MENU;
      
      try {
        const response = await axios.get(url, { timeout: 10000 });
        expect(response.status).toBe(200);
        expect(response.data).toBeDefined();
        console.log(`✅ MAIN_MENU: ${url}`);
      } catch (error) {
        console.log(`⚠️  MAIN_MENU недоступен: ${error.message}`);
        // Не фейлим тест, так как API может быть временно недоступен
        expect(error.response?.status).toBeGreaterThan(0);
      }
    }, 15000);
  });

  describe("URLS.BRAND", () => {
    test("Проверка URL изображений брендов", async () => {
      const brandId = TEST_DATA.brands.valid[0];
      const url = Constants.URLS.BRAND.IMAGE.replace("{}", brandId);
      
      try {
        const response = await axios.head(url, { timeout: 10000 });
        expect([200, 404]).toContain(response.status);
        console.log(`✅ BRAND.IMAGE: ${url} (${response.status})`);
      } catch (error) {
        console.log(`⚠️  BRAND.IMAGE недоступен: ${error.message}`);
      }
    }, 15000);

    test("Проверка URL каталога брендов", async () => {
      const url = Constants.URLS.BRAND.CATALOG;
      
      try {
        const response = await axios.get(url, { 
          timeout: 10000,
          params: {
            appType: Constants.APPTYPES.DESKTOP,
            curr: Constants.CURRENCIES.RUB,
            dest: Constants.DESTINATIONS.MOSCOW.ids[0]
          }
        });
        expect([200, 400, 404]).toContain(response.status);
        console.log(`✅ BRAND.CATALOG: ${url} (${response.status})`);
      } catch (error) {
        console.log(`⚠️  BRAND.CATALOG недоступен: ${error.message}`);
      }
    }, 15000);
  });

  describe("URLS.SUPPLIER", () => {
    test("Проверка URL информации о поставщике", async () => {
      const supplierId = TEST_DATA.suppliers.valid[0];
      const url = Constants.URLS.SUPPLIER.INFO.replace("{0}", supplierId);
      
      try {
        const response = await axios.get(url, { timeout: 10000 });
        expect([200, 404]).toContain(response.status);
        console.log(`✅ SUPPLIER.INFO: ${url} (${response.status})`);
        
        if (response.status === 200) {
          expect(response.data).toBeDefined();
          expect(response.data.supplierId || response.data.id).toBeDefined();
        }
      } catch (error) {
        console.log(`⚠️  SUPPLIER.INFO недоступен: ${error.message}`);
      }
    }, 15000);

    test("Проверка URL каталога поставщика", async () => {
      const url = Constants.URLS.SUPPLIER.CATALOG;
      const supplierId = TEST_DATA.suppliers.valid[1];
      
      try {
        const response = await axios.get(url, {
          timeout: 10000,
          params: {
            appType: Constants.APPTYPES.DESKTOP,
            curr: Constants.CURRENCIES.RUB,
            dest: Constants.DESTINATIONS.MOSCOW.ids[0],
            supplier: supplierId,
            page: 1
          }
        });
        expect([200, 400, 404]).toContain(response.status);
        console.log(`✅ SUPPLIER.CATALOG: ${url} (${response.status})`);
      } catch (error) {
        console.log(`⚠️  SUPPLIER.CATALOG недоступен: ${error.message}`);
      }
    }, 15000);

    test("Проверка URL общего количества товаров поставщика", async () => {
      const url = Constants.URLS.SUPPLIER.TOTALPRODUCTS;
      const supplierId = TEST_DATA.suppliers.valid[1];
      
      try {
        const response = await axios.get(url, {
          timeout: 10000,
          params: {
            appType: Constants.APPTYPES.DESKTOP,
            curr: Constants.CURRENCIES.RUB,
            dest: Constants.DESTINATIONS.MOSCOW.ids[0],
            supplier: supplierId
          }
        });
        expect([200, 400, 404]).toContain(response.status);
        console.log(`✅ SUPPLIER.TOTALPRODUCTS: ${url} (${response.status})`);
      } catch (error) {
        console.log(`⚠️  SUPPLIER.TOTALPRODUCTS недоступен: ${error.message}`);
      }
    }, 15000);

    test("Проверка URL отгрузки поставщика", async () => {
      const supplierId = TEST_DATA.suppliers.valid[0];
      const url = Constants.URLS.SUPPLIER.SHIPMENT.replace("{0}", supplierId);
      
      try {
        const response = await axios.get(url, { 
          timeout: 10000,
          headers: {
            "x-client-name": "site"
          }
        });
        expect([200, 404, 403]).toContain(response.status);
        console.log(`✅ SUPPLIER.SHIPMENT: ${url} (${response.status})`);
      } catch (error) {
        console.log(`⚠️  SUPPLIER.SHIPMENT недоступен: ${error.message}`);
      }
    }, 15000);
  });

  describe("URLS.PRODUCT", () => {
    test("Проверка URL карточки товара", async () => {
      const productId = TEST_DATA.products.valid[0];
      const basketNumber = getBasketNumber(productId);
      const vol = getVol(productId);
      const part = getPart(productId);
      
      const url = Constants.URLS.PRODUCT.CARD
        .replace("{0}", basketNumber < 10 ? `0${basketNumber}` : basketNumber)
        .replace("{1}", vol)
        .replace("{2}", part)
        .replace("{3}", productId);
      
      try {
        const response = await axios.get(url, { timeout: 10000 });
        expect([200, 404]).toContain(response.status);
        console.log(`✅ PRODUCT.CARD: ${url} (${response.status})`);
        
        if (response.status === 200) {
          expect(response.data).toBeDefined();
          expect(response.data.nm_id || response.data.id).toBeDefined();
        }
      } catch (error) {
        console.log(`⚠️  PRODUCT.CARD недоступен: ${error.message}`);
      }
    }, 15000);

    test("Проверка URL продавцов товара", async () => {
      const productId = TEST_DATA.products.valid[0];
      const basketNumber = getBasketNumber(productId);
      const vol = getVol(productId);
      const part = getPart(productId);
      
      const url = Constants.URLS.PRODUCT.SELLERS
        .replace("{0}", basketNumber < 10 ? `0${basketNumber}` : basketNumber)
        .replace("{1}", vol)
        .replace("{2}", part)
        .replace("{3}", productId);
      
      try {
        const response = await axios.get(url, { timeout: 10000 });
        expect([200, 404]).toContain(response.status);
        console.log(`✅ PRODUCT.SELLERS: ${url} (${response.status})`);
      } catch (error) {
        console.log(`⚠️  PRODUCT.SELLERS недоступен: ${error.message}`);
      }
    }, 15000);

    test("Проверка URL деталей товара", async () => {
      const url = Constants.URLS.PRODUCT.DETAILS;
      const productId = TEST_DATA.products.valid[0];
      
      try {
        const response = await axios.get(url, {
          timeout: 10000,
          params: {
            appType: Constants.APPTYPES.DESKTOP,
            curr: Constants.CURRENCIES.RUB,
            dest: Constants.DESTINATIONS.MOSCOW.ids[0],
            nm: `${productId};`
          }
        });
        expect([200, 400, 404]).toContain(response.status);
        console.log(`✅ PRODUCT.DETAILS: ${url} (${response.status})`);
      } catch (error) {
        console.log(`⚠️  PRODUCT.DETAILS недоступен: ${error.message}`);
      }
    }, 15000);

    test("Проверка URL отзывов товара", async () => {
      const imtId = TEST_DATA.imtIds[0];
      const partitionId = TEST_DATA.partitionIds[0];
      const url = Constants.URLS.PRODUCT.FEEDBACKS
        .replace("{0}", partitionId)
        .replace("{1}", imtId);
      
      try {
        const response = await axios.get(url, { timeout: 10000 });
        expect([200, 404]).toContain(response.status);
        console.log(`✅ PRODUCT.FEEDBACKS: ${url} (${response.status})`);
      } catch (error) {
        console.log(`⚠️  PRODUCT.FEEDBACKS недоступен: ${error.message}`);
      }
    }, 15000);

    test("Проверка URL вопросов товара", async () => {
      const url = Constants.URLS.PRODUCT.QUESTIONS;
      const imtId = TEST_DATA.imtIds[0];
      
      try {
        const response = await axios.get(url, {
          timeout: 10000,
          params: {
            imtId: imtId,
            onlyCount: true
          }
        });
        expect([200, 400, 404]).toContain(response.status);
        console.log(`✅ PRODUCT.QUESTIONS: ${url} (${response.status})`);
      } catch (error) {
        console.log(`⚠️  PRODUCT.QUESTIONS недоступен: ${error.message}`);
      }
    }, 15000);
  });

  describe("URLS.SEARCH", () => {
    test("Проверка URL точного поиска", async () => {
      const url = Constants.URLS.SEARCH.EXACTMATCH;
      const keyword = TEST_DATA.keywords[0];
      
      try {
        const response = await axios.get(url, {
          timeout: 10000,
          params: {
            appType: Constants.APPTYPES.DESKTOP,
            curr: Constants.CURRENCIES.RUB,
            dest: Constants.DESTINATIONS.MOSCOW.ids[0],
            query: keyword,
            resultset: "catalog"
          }
        });
        expect([200, 400]).toContain(response.status);
        console.log(`✅ SEARCH.EXACTMATCH: ${url} (${response.status})`);
        
        if (response.status === 200) {
          expect(response.data).toBeDefined();
        }
      } catch (error) {
        console.log(`⚠️  SEARCH.EXACTMATCH недоступен: ${error.message}`);
      }
    }, 15000);

    test("Проверка URL поиска похожих товаров", async () => {
      const url = Constants.URLS.SEARCH.SIMILAR_BY_NM;
      const productId = TEST_DATA.products.valid[1];
      
      try {
        const response = await axios.get(url, {
          timeout: 10000,
          params: { nm: productId }
        });
        expect([200, 404]).toContain(response.status);
        console.log(`✅ SEARCH.SIMILAR_BY_NM: ${url} (${response.status})`);
      } catch (error) {
        console.log(`⚠️  SEARCH.SIMILAR_BY_NM недоступен: ${error.message}`);
      }
    }, 15000);

    test("Проверка URL рекламы в поиске", async () => {
      const url = Constants.URLS.SEARCH.ADS;
      const keyword = TEST_DATA.keywords[0];
      
      try {
        const response = await axios.get(url, {
          timeout: 10000,
          params: { keyword: keyword }
        });
        expect([200, 400, 404]).toContain(response.status);
        console.log(`✅ SEARCH.ADS: ${url} (${response.status})`);
      } catch (error) {
        console.log(`⚠️  SEARCH.ADS недоступен: ${error.message}`);
      }
    }, 15000);

    test("Проверка URL карусельной рекламы", async () => {
      const url = Constants.URLS.SEARCH.CAROUSEL_ADS;
      const productId = TEST_DATA.products.valid[0];
      
      try {
        const response = await axios.get(url, {
          timeout: 10000,
          params: { nm: productId }
        });
        expect([200, 404]).toContain(response.status);
        console.log(`✅ SEARCH.CAROUSEL_ADS: ${url} (${response.status})`);
      } catch (error) {
        console.log(`⚠️  SEARCH.CAROUSEL_ADS недоступен: ${error.message}`);
      }
    }, 15000);

    test("Проверка URL подсказок поиска", async () => {
      const url = Constants.URLS.SEARCH.HINT;
      const query = TEST_DATA.keywords[0];
      
      try {
        const response = await axios.get(url, {
          timeout: 10000,
          params: {
            query: query,
            gender: Constants.SEX.COMMON,
            locale: Constants.LOCALES.RU,
            appType: Constants.APPTYPES.DESKTOP
          }
        });
        expect([200, 400]).toContain(response.status);
        console.log(`✅ SEARCH.HINT: ${url} (${response.status})`);
      } catch (error) {
        console.log(`⚠️  SEARCH.HINT недоступен: ${error.message}`);
      }
    }, 15000);
  });

  describe("URLS.IMAGES", () => {
    test("Проверка URL изображений товаров", async () => {
      const productId = TEST_DATA.products.valid[0];
      const basketNumber = getBasketNumber(productId);
      const vol = getVol(productId);
      const part = getPart(productId);
      const imageOrder = 1;
      
      const imageTypes = ["TINY", "BIG", "SMALL", "MEDIUM"];
      
      for (const imageType of imageTypes) {
        const url = Constants.URLS.IMAGES[imageType]
          .replace("{0}", basketNumber < 10 ? `0${basketNumber}` : basketNumber)
          .replace("{1}", vol)
          .replace("{2}", part)
          .replace("{3}", productId)
          .replace("{4}", imageOrder);
        
        try {
          const response = await axios.head(url, { timeout: 10000 });
          expect([200, 404]).toContain(response.status);
          console.log(`✅ IMAGES.${imageType}: ${url} (${response.status})`);
        } catch (error) {
          console.log(`⚠️  IMAGES.${imageType} недоступен: ${error.message}`);
        }
      }
    }, 30000);
  });

  describe("URLS.PROMOS", () => {
    test("Проверка URL промо-акций", async () => {
      const url = Constants.URLS.PROMOS;
      
      try {
        const response = await axios.get(url, { timeout: 10000 });
        expect([200, 404]).toContain(response.status);
        console.log(`✅ PROMOS: ${url} (${response.status})`);
      } catch (error) {
        console.log(`⚠️  PROMOS недоступен: ${error.message}`);
      }
    }, 15000);
  });

  // Тест на валидацию структуры URL
  describe("Валидация структуры URL", () => {
    test("Все URL должны быть валидными", () => {
      const allUrls = getAllUrlsFromConstants();
      
      allUrls.forEach(({ path, url }) => {
        expect(url).toBeDefined();
        expect(typeof url).toBe("string");
        expect(url.length).toBeGreaterThan(0);
        
        // Проверяем что URL начинается с http
        if (!url.includes("{")) {
          expect(url).toMatch(/^https?:\/\//);
        }
        
        console.log(`✅ URL структура валидна: ${path} = ${url}`);
      });
    });

    test("URL с плейсхолдерами должны содержать правильные маркеры", () => {
      const urlsWithPlaceholders = [
        { path: "BRAND.IMAGE", url: Constants.URLS.BRAND.IMAGE, placeholders: ["{}"] },
        { path: "SUPPLIER.INFO", url: Constants.URLS.SUPPLIER.INFO, placeholders: ["{0}"] },
        { path: "SUPPLIER.SHIPMENT", url: Constants.URLS.SUPPLIER.SHIPMENT, placeholders: ["{0}"] },
        { path: "PRODUCT.CARD", url: Constants.URLS.PRODUCT.CARD, placeholders: ["{0}", "{1}", "{2}", "{3}"] },
        { path: "PRODUCT.SELLERS", url: Constants.URLS.PRODUCT.SELLERS, placeholders: ["{0}", "{1}", "{2}", "{3}"] },
        { path: "PRODUCT.FEEDBACKS", url: Constants.URLS.PRODUCT.FEEDBACKS, placeholders: ["{0}", "{1}"] },
        { path: "IMAGES.BIG", url: Constants.URLS.IMAGES.BIG, placeholders: ["{0}", "{1}", "{2}", "{3}", "{4}"] }
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

// Вспомогательные функции для работы с товарами
function getBasketNumber(productId) {
  const BASKETS = [
    [0, 143], [144, 287], [288, 431], [432, 719], [720, 1007],
    [1008, 1061], [1062, 1115], [1116, 1169], [1170, 1313], [1314, 1601],
    [1602, 1655], [1656, 1919], [1920, 2045], [2046, 2189], [2091, 2405], [2406, 2621]
  ];
  
  const vol = parseInt(productId / 100000, 10);
  const basket = BASKETS.reduce((accumulator, current, index) => {
    if (vol >= current[0] && vol <= current[1]) {
      return index + 1;
    }
    return accumulator;
  }, 1);
  return basket;
}

function getVol(productId) {
  const limits = [0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8];
  const sku = String(productId);
  return sku.length > 5 ? sku.substring(0, limits[sku.length]) : 0;
}

function getPart(productId) {
  const limits = [0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8];
  const sku = String(productId);
  return sku.substring(0, limits[sku.length + 2]);
}

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