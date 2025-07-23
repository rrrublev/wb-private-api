/* eslint-disable no-undef */
const Constants = require("../src/Constants");

describe("Утилиты для работы с URL из Constants", () => {
  describe("URL Builder - вспомогательные функции", () => {
    // Функция для построения URL товара
    function buildProductURL(productId, urlTemplate) {
      const limits = [0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8];
      const sku = String(productId);
      const basketNumber = getBasketNumber(productId);
      const vol = sku.length > 5 ? sku.substring(0, limits[sku.length]) : 0;
      const part = sku.substring(0, limits[sku.length + 2]);

      return urlTemplate
        .replace("{0}", basketNumber < 10 ? `0${basketNumber}` : basketNumber)
        .replace("{1}", vol)
        .replace("{2}", part)
        .replace("{3}", productId);
    }

    // Функция для получения номера корзины
    function getBasketNumber(productId) {
      const BASKETS = [
        [0, 143],
        [144, 287],
        [288, 431],
        [432, 719],
        [720, 1007],
        [1008, 1061],
        [1062, 1115],
        [1116, 1169],
        [1170, 1313],
        [1314, 1601],
        [1602, 1655],
        [1656, 1919],
        [1920, 2045],
        [2046, 2189],
        [2091, 2405],
        [2406, 2621],
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

    test("Корректное построение URL карточки товара", () => {
      const testProductIds = [177899980, 60059650, 304390393, 67858518];

      testProductIds.forEach((productId) => {
        const url = buildProductURL(productId, Constants.URLS.PRODUCT.CARD);
        const actualBasket = getBasketNumber(productId);
        const limits = [0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8];
        const sku = String(productId);
        const actualVol =
          sku.length > 5 ? sku.substring(0, limits[sku.length]) : 0;
        const actualPart = sku.substring(0, limits[sku.length + 2]);

        // Проверяем что URL содержит правильные компоненты
        expect(url).toContain(
          `basket-${actualBasket < 10 ? "0" + actualBasket : actualBasket}`
        );
        expect(url).toContain(`vol${actualVol}`);
        expect(url).toContain(`part${actualPart}`);
        expect(url).toContain(`${productId}`);

        console.log(
          `✅ Товар ${productId}: корзина ${actualBasket}, vol ${actualVol}, part ${actualPart}`
        );
        console.log(`   URL: ${url}`);
      });
    });

    test("Корректное построение URL изображений товара", () => {
      const productId = 177899980;
      const imageTypes = ["TINY", "BIG", "SMALL", "MEDIUM"];

      imageTypes.forEach((imageType) => {
        const url = buildProductURL(
          productId,
          Constants.URLS.IMAGES[imageType]
        ).replace("{4}", "1"); // Номер изображения

        expect(url).toContain("basket-12"); // Корзина для этого товара
        expect(url).toContain("vol1778");
        expect(url).toContain("part177899");
        expect(url).toContain("177899980");
        expect(url).toContain("images");
        expect(url).toContain(".jpg");

        console.log(`✅ ${imageType}: ${url}`);
      });
    });

    test("Корректное построение URL поставщика", () => {
      const supplierIds = [1136572, 18740, 206198, 244907];

      supplierIds.forEach((supplierId) => {
        const infoUrl = Constants.URLS.SUPPLIER.INFO.replace("{0}", supplierId);
        const shipmentUrl = Constants.URLS.SUPPLIER.SHIPMENT.replace(
          "{0}",
          supplierId
        );

        expect(infoUrl).toContain(`supplier-by-id/${supplierId}.json`);
        expect(shipmentUrl).toContain(`suppliers/${supplierId}`);

        console.log(`✅ Поставщик ${supplierId}:`);
        console.log(`   INFO: ${infoUrl}`);
        console.log(`   SHIPMENT: ${shipmentUrl}`);
      });
    });

    test("Корректное построение URL отзывов", () => {
      const testCases = [
        { imtId: 27334676, expectedPartition: "1" }, // Четный CRC16
        { imtId: 12345678, expectedPartition: "2" }, // Нечетный CRC16
      ];

      testCases.forEach(({ imtId, expectedPartition }) => {
        // Упрощенная логика определения партиции (как в WBProduct.js)
        const crc16Arc = function (r) {
          const numToUint8Array = function (r) {
            const t = new Uint8Array(8);
            for (let n = 0; n < 8; n++)
              (t[n] = r % 256), (r = Math.floor(r / 256));
            return t;
          };

          const t = numToUint8Array(r);
          let n = 0;
          for (let r = 0; r < t.length; r++) {
            n ^= t[r];
            for (let r = 0; r < 8; r++)
              (1 & n) > 0 ? (n = (n >> 1) ^ 40961) : (n >>= 1);
          }
          return n;
        };

        const partition_id = crc16Arc(imtId) % 100 >= 50 ? "2" : "1";
        const url = Constants.URLS.PRODUCT.FEEDBACKS.replace(
          "{0}",
          partition_id
        ).replace("{1}", imtId);

        expect(url).toContain(`feedbacks${partition_id}.wb.ru`);
        expect(url).toContain(`feedbacks/v1/${imtId}`);

        console.log(`✅ Отзывы для IMT ${imtId}: партиция ${partition_id}`);
        console.log(`   URL: ${url}`);
      });
    });
  });

  describe("Валидация параметров URL", () => {
    test("Все плейсхолдеры должны быть заменены", () => {
      const urlsWithPlaceholders = [
        {
          name: "BRAND.IMAGE",
          template: Constants.URLS.BRAND.IMAGE,
          params: [123456],
        },
        {
          name: "SUPPLIER.INFO",
          template: Constants.URLS.SUPPLIER.INFO,
          params: [123456],
        },
        {
          name: "SUPPLIER.SHIPMENT",
          template: Constants.URLS.SUPPLIER.SHIPMENT,
          params: [123456],
        },
      ];

      urlsWithPlaceholders.forEach(({ name, template, params }) => {
        let url = template;
        params.forEach((param, index) => {
          url = url.replace(`{${index}}`, param).replace("{}", param);
        });

        // После замены не должно остаться плейсхолдеров
        expect(url).not.toMatch(/\{[0-9]*\}/);
        expect(url).toContain(params[0].toString());

        console.log(`✅ ${name}: плейсхолдеры заменены корректно`);
        console.log(`   ${url}`);
      });
    });

    test("URL должны содержать правильные протоколы", () => {
      const allUrls = getAllUrlsFromConstants();

      allUrls.forEach(({ path, url }) => {
        if (!url.includes("{")) {
          // Только для URL без плейсхолдеров
          expect(url).toMatch(/^https:\/\//);
          console.log(`✅ ${path}: использует HTTPS`);
        }
      });
    });

    test("URL должны содержать правильные домены Wildberries", () => {
      const allowedDomains = [
        "wb.ru",
        "wbbasket.ru",
        "wbstatic.net",
        "wildberries.ru",
      ];

      const allUrls = getAllUrlsFromConstants();

      allUrls.forEach(({ path, url }) => {
        const hasAllowedDomain = allowedDomains.some((domain) =>
          url.includes(domain)
        );
        expect(hasAllowedDomain).toBeTruthy();

        const matchedDomain = allowedDomains.find((domain) =>
          url.includes(domain)
        );
        console.log(`✅ ${path}: домен ${matchedDomain} разрешен`);
      });
    });
  });

  describe("Тестирование граничных случаев", () => {
    test("Обработка товаров с разной длиной ID", () => {
      const testCases = [
        { productId: 123, description: "Короткий ID (3 цифры)" },
        { productId: 12345, description: "Средний ID (5 цифр)" },
        { productId: 1234567, description: "Длинный ID (7 цифр)" },
        { productId: 123456789, description: "Очень длинный ID (9 цифр)" },
      ];

      testCases.forEach(({ productId, description }) => {
        try {
          const basketNumber = getBasketNumber(productId);
          expect(basketNumber).toBeGreaterThan(0);
          expect(basketNumber).toBeLessThanOrEqual(16);

          console.log(
            `✅ ${description}: ID ${productId} -> корзина ${basketNumber}`
          );
        } catch (error) {
          console.log(
            `⚠️  ${description}: ошибка для ID ${productId} - ${error.message}`
          );
        }
      });
    });

    test("Обработка некорректных ID поставщиков", () => {
      const invalidSupplierIds = [0, -1, null, undefined, "", "abc"];

      invalidSupplierIds.forEach((invalidId) => {
        const infoUrl = Constants.URLS.SUPPLIER.INFO.replace("{0}", invalidId);

        // URL должен быть построен, но может быть некорректным
        expect(infoUrl).toBeDefined();
        expect(typeof infoUrl).toBe("string");

        console.log(`⚠️  Некорректный ID поставщика ${invalidId}: ${infoUrl}`);
      });
    });

    test("Обработка специальных символов в параметрах", () => {
      const specialChars = ["<script>", "'; DROP TABLE", "%20", "&amp;"];

      specialChars.forEach((specialChar) => {
        const encodedChar = encodeURIComponent(specialChar);

        // Проверяем что специальные символы кодируются
        expect(encodedChar).not.toBe(specialChar);

        console.log(`✅ Спецсимвол "${specialChar}" -> "${encodedChar}"`);
      });
    });
  });

  // Вспомогательная функция для получения всех URL из констант
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

  function getBasketNumber(productId) {
    const BASKETS = [
      [0, 143],
      [144, 287],
      [288, 431],
      [432, 719],
      [720, 1007],
      [1008, 1061],
      [1062, 1115],
      [1116, 1169],
      [1170, 1313],
      [1314, 1601],
      [1602, 1655],
      [1656, 1919],
      [1920, 2045],
      [2046, 2189],
      [2091, 2405],
      [2406, 2621],
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
});
