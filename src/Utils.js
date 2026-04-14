/* eslint-disable no-nested-ternary */
const format = require("string-format");
const Constants = require("./Constants");
const moment = require("moment");

format.extend(String.prototype, {});

// vol = Math.floor(nm_id / 100000); basket number = index + 1 (zero-padded).
// Source: WB JS volHostV2() in product_dist JS (staticbasket_route_map).
const BASKETS = [
  [0, 143],          // basket-01
  [144, 287],        // basket-02
  [288, 431],        // basket-03
  [432, 719],        // basket-04
  [720, 1007],       // basket-05
  [1008, 1061],      // basket-06
  [1062, 1115],      // basket-07
  [1116, 1169],      // basket-08
  [1170, 1313],      // basket-09
  [1314, 1601],      // basket-10
  [1602, 1655],      // basket-11
  [1656, 1919],      // basket-12
  [1920, 2045],      // basket-13
  [2046, 2189],      // basket-14
  [2190, 2405],      // basket-15
  [2406, 2621],      // basket-16
  [2622, 2837],      // basket-17
  [2838, 3053],      // basket-18
  [3054, 3269],      // basket-19
  [3270, 3485],      // basket-20
  [3486, 3701],      // basket-21
  [3702, 3917],      // basket-22
  [3918, 4133],      // basket-23
  [4134, 4349],      // basket-24
  [4350, 4565],      // basket-25
  [4566, 4877],      // basket-26
  [4878, 5189],      // basket-27
  [5190, 5501],      // basket-28
  [5502, 5813],      // basket-29
  [5814, 6125],      // basket-30
  [6126, 6437],      // basket-31
  [6438, 6749],      // basket-32
  [6750, 7061],      // basket-33
  [7062, 7373],      // basket-34
  [7374, 7685],      // basket-35
  [7686, 7997],      // basket-36
  [7998, 8309],      // basket-37
  [8310, 8741],      // basket-38
  [8742, 9173],      // basket-39
  [9174, 9605],      // basket-40
  [9606, 10373],     // basket-41
  [10374, 11141],    // basket-42
  [11142, 11909],    // basket-43
  [11910, Infinity], // basket-44
];

// vol = nm_id % 144; basket number = index + 1 (zero-padded).
// Source: WB JS videonme_route_map switch statement in volVideoHost().
const VIDEO_BASKETS = [
  [0,   11],  // basket-01
  [12,  23],  // basket-02
  [24,  35],  // basket-03
  [36,  47],  // basket-04
  [48,  59],  // basket-05
  [60,  71],  // basket-06
  [72,  83],  // basket-07
  [84,  95],  // basket-08
  [96,  107], // basket-09
  [108, 119], // basket-10
  [120, 131], // basket-11
  [132, 143], // basket-12
];

const getBasketNumber = (productId) => {
  const vol = Math.floor(productId / 100000);
  const index = BASKETS.findIndex(([from, to]) => vol >= from && vol <= to);
  return String(index + 1).padStart(2, "0");
};

const getVideoBasket = (vol) => {
  const index = VIDEO_BASKETS.findIndex(([from, to]) => vol >= from && vol <= to);
  return String(index >= 0 ? index + 1 : VIDEO_BASKETS.length + 1).padStart(2, "0");
};

const imageURL = (productId, imageType = "SMALL", order = 1) => {
  const vol = Math.floor(productId / 100000);
  const part = Math.floor(productId / 1000);
  const basket = getBasketNumber(productId);
  const random = Date.now();
  const URL = Constants.URLS.IMAGES[imageType];

  return `${URL.format(basket, vol, part, productId, order)}?r=${random}`;
};

/**
 * Generates a video URL for a WB product.
 * Mirrors WB's own urlVideoProduct() from their frontend JS.
 *
 * @param {number|string} productId - nm_id of the product
 * @param {"hls"|"mp4"} [format]   - "hls" → m3u8 playlist, "mp4" → preview file (360p)
 * @param {string} [quality]       - HLS quality; WB always uses "1440p". MP4 preview is always "360p"
 * @returns {string} full video URL
 */
const videoURL = (productId, format = "hls", quality = "1440p") => {
  const id = parseInt(productId, 10);
  const vol = id % 144;
  const part = Math.floor(id / 10000);
  const basket = getVideoBasket(vol);
  if (format === "mp4") {
    return Constants.URLS.VIDEO.MP4.format(basket, vol, part, id, quality);
  }
  return Constants.URLS.VIDEO.HLS.format(basket, vol, part, id, quality);
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
    videoURL,
    getVideoBasket,
  },
  Brand: {
    imageURL: brandImageURL,
  },
  Search: {
    getQueryIdForSearch,
  },
};

module.exports = Utils;
