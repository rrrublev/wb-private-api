/* eslint-disable no-nested-ternary */
const format = require("string-format");
const Constants = require("./Constants");
const moment = require("moment");

format.extend(String.prototype, {});

const BASKETS = [
  [0, 143],       // basket-01
  [144, 287],     // basket-02
  [288, 431],     // basket-03
  [432, 719],     // basket-04
  [720, 1007],    // basket-05
  [1008, 1061],   // basket-06
  [1062, 1115],   // basket-07
  [1116, 1169],   // basket-08
  [1170, 1313],   // basket-09
  [1314, 1601],   // basket-10
  [1602, 1655],   // basket-11
  [1656, 1919],   // basket-12
  [1920, 2045],   // basket-13
  [2046, 2189],   // basket-14
  [2190, 2405],   // basket-15
  [2406, 2621],   // basket-16
  [2622, 2837],   // basket-17
  [2838, 3053],   // basket-18
  [3054, 3269],   // basket-19
  [3270, 3485],   // basket-20
  [3486, 3701],   // basket-21
  [3702, 3917],   // basket-22
  [3918, 4133],   // basket-23
  [4134, 4349],   // basket-24
  [4350, 4565],   // basket-25
  [4566, 4877],   // basket-26
  [4878, 5189],   // basket-27
  [5190, 5501],   // basket-28
  [5502, 5813],   // basket-29
  [5814, 6125],   // basket-30
  [6126, 6437],   // basket-31
  [6438, 6749],   // basket-32
  [6750, 7061],   // basket-33
  [7062, 7373],   // basket-34
  [7374, 7685],   // basket-35
  [7686, 7997],   // basket-36
  [7998, 8309],   // basket-37
  [8310, 8741],   // basket-38
  [8742, 9173],   // basket-39
  [9174, 9605],   // basket-40
];

const imageURL = (productId, imageType = "SMALL", order = 1) => {
  const vol = parseInt(productId / 100000, 10);
  const part = parseInt(productId / 1000, 10);
  const basket = getBasketNumber(productId);
  const basketWithZero = basket < 10 ? `0${basket}` : basket;
  const random = Date.now();
  const URL = Constants.URLS.IMAGES[imageType];

  return `${URL.format(
    basketWithZero,
    vol,
    part,
    productId,
    order
  )}?r=${random}`;
};

const getBasketNumber = (productId) => {
  const vol = parseInt(productId / 100000, 10);
  const basket = BASKETS.reduce((accumulator, current, index) => {
    if (vol >= current[0] && vol <= current[1]) {
      return index + 1;
    }
    return accumulator;
  }, 1);
  return basket;
};

const brandImageURL = (brandId) => Constants.URLS.BRAND.IMAGE.format(brandId);

const genNewUserID = function () {
  var t = Math.floor(new Date().getTime() / 1e3),
    e = Math.floor(Math.random() * Math.pow(2, 30)).toString() + t.toString(),
    n = new Date();
  return e;
};

const getQueryIdForSearch = function () {
  return `qid${genNewUserID()}${moment(new Date()).format("yyyyMMDDHHmmss")}`;
};

const Utils = {
  Card: {
    imageURL,
    getBasketNumber,
  },
  Brand: {
    imageURL: brandImageURL,
  },
  Search: {
    getQueryIdForSearch,
  },
};

module.exports = Utils;
