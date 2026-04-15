/* eslint-disable no-restricted-syntax */
/* eslint-disable no-undef */
const Utils = require("../src/Utils");

describe("Проверка утилит Card", () => {
  test("Проверка генерации URL на логотип бренда Brand.imageURL()", () => {
    const testurl = "https://static-basket-01.wbbasket.ru/vol0/brand-flow-logos/by-id/87238.webp";
    const url = Utils.Brand.imageURL(87238);
    expect(url).toContain(testurl);
  });
  test("Проверка генерации URL на фотографии карточек Card.imageURL()", () => {
    const testurl =
      "https://basket-12.wbbasket.ru/vol1778/part177899/177899980/images/big/3.webp";
    const url = Utils.Card.imageURL(177899980, "BIG", 3);
    expect(url).toContain(testurl);
  });
  test("Проверка метода getBasketNumber() генерации Basket номера по Артикулу товара", () => {
    const skus = [
      14381552, 14411552, 28910126, 71840112, 72232256, 101032256, 106332256,
      111632256, 117032256, 131499998, 165879870
    ];
    const expected = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "12"];
    for (const [index, sku] of skus.entries()) {
      const basket = Utils.Card.getBasketNumber(sku);
      expect(basket).toBe(expected[index]);
    }
  });
});
