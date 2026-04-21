/* eslint-disable no-undef */

const Constants = require("../src/Constants");
const WBCatalog = require("../src/WBCatalog");

// Каталог с двумя страницами товаров (200 штук).
function makeCatalog(count = Constants.PRODUCTS_PER_PAGE * 2) {
  const products = Array.from({ length: count }, (_, i) => ({ id: i + 1 }));
  return new WBCatalog({
    catalog_type: "preset",
    catalog_value: "preset=123",
    pages: Math.ceil(count / Constants.PRODUCTS_PER_PAGE),
    products,
    totalProducts: count,
  });
}

// ---------------------------------------------------------------------------

describe("WBCatalog.page() — невалидные номера страниц", () => {
  let catalog;

  beforeEach(() => {
    catalog = makeCatalog();
  });

  test("page(-1) возвращает []", () => {
    expect(catalog.page(-1)).toEqual([]);
  });

  test("page(0) возвращает []", () => {
    expect(catalog.page(0)).toEqual([]);
  });

  test("page(0.5) возвращает []", () => {
    expect(catalog.page(0.5)).toEqual([]);
  });

  test("page(1.5) возвращает []", () => {
    expect(catalog.page(1.5)).toEqual([]);
  });

  test("page(NaN) возвращает []", () => {
    expect(catalog.page(NaN)).toEqual([]);
  });

  test("page(Infinity) возвращает []", () => {
    expect(catalog.page(Infinity)).toEqual([]);
  });

  test('page("1") возвращает []', () => {
    expect(catalog.page("1")).toEqual([]);
  });

  test("page(null) возвращает []", () => {
    expect(catalog.page(null)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------

describe("WBCatalog.page() — валидные номера страниц", () => {
  let catalog;

  beforeEach(() => {
    catalog = makeCatalog();
  });

  test("page(1) возвращает первые PRODUCTS_PER_PAGE товаров", () => {
    const result = catalog.page(1);
    expect(result.length).toBe(Constants.PRODUCTS_PER_PAGE);
    expect(result[0].id).toBe(1);
    expect(result[Constants.PRODUCTS_PER_PAGE - 1].id).toBe(Constants.PRODUCTS_PER_PAGE);
  });

  test("page(2) возвращает вторые PRODUCTS_PER_PAGE товаров", () => {
    const result = catalog.page(2);
    expect(result.length).toBe(Constants.PRODUCTS_PER_PAGE);
    expect(result[0].id).toBe(Constants.PRODUCTS_PER_PAGE + 1);
  });

  test("page(3) при 200 товарах возвращает []", () => {
    expect(catalog.page(3)).toEqual([]);
  });

  test("page(1) при пустом каталоге возвращает []", () => {
    const empty = makeCatalog(0);
    expect(empty.page(1)).toEqual([]);
  });
});
