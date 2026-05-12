/* eslint-disable no-nested-ternary */
const format = require("string-format");
const Constants = require("./Constants");

// vol = Math.floor(nm_id / 100000); верхняя граница корзины (индекс + 1).
// Source: WB JS volHostV2() in product_dist JS (staticbasket_route_map).
const BASKETS = [
  143,      // basket-01
  287,      // basket-02
  431,      // basket-03
  719,      // basket-04
  1007,     // basket-05
  1061,     // basket-06
  1115,     // basket-07
  1169,     // basket-08
  1313,     // basket-09
  1601,     // basket-10
  1655,     // basket-11
  1919,     // basket-12
  2045,     // basket-13
  2189,     // basket-14
  2405,     // basket-15
  2621,     // basket-16
  2837,     // basket-17
  3053,     // basket-18
  3269,     // basket-19
  3485,     // basket-20
  3701,     // basket-21
  3917,     // basket-22
  4133,     // basket-23
  4349,     // basket-24
  4565,     // basket-25
  4877,     // basket-26
  5189,     // basket-27
  5501,     // basket-28
  5813,     // basket-29
  6125,     // basket-30
  6437,     // basket-31
  6749,     // basket-32
  7061,     // basket-33
  7373,     // basket-34
  7685,     // basket-35
  7997,     // basket-36
  8309,     // basket-37
  8741,     // basket-38
  9173,     // basket-39
  9605,     // basket-40
  10373,    // basket-41
  11141,    // basket-42
  11909,    // basket-43
  12677,    // basket-44
  13445,    // basket-45
  14213,    // basket-46
  Infinity, // basket-47
];

// vol = nm_id % 144; верхняя граница корзины (индекс + 1).
// Source: WB JS videonme_route_map switch statement in volVideoHost().
const VIDEO_BASKETS = [
  11,       // basket-01
  23,       // basket-02
  35,       // basket-03
  47,       // basket-04
  59,       // basket-05
  71,       // basket-06
  83,       // basket-07
  95,       // basket-08
  107,      // basket-09
  119,      // basket-10
  131,      // basket-11
  143,      // basket-12
  Infinity, // basket-13 (default)
];

const getBasketNumber = (productId) => {
  const vol = Math.floor(productId / 100000);
  return String(BASKETS.findIndex(top => vol <= top) + 1).padStart(2, "0");
};

const getVideoBasket = (vol) => {
  return String(VIDEO_BASKETS.findIndex(top => vol <= top) + 1).padStart(2, "0");
};

const imageURL = (productId, imageType = "SMALL", order = 1) => {
  const vol = Math.floor(productId / 100000);
  const part = Math.floor(productId / 1000);
  const basket = getBasketNumber(productId);
  const random = Date.now();
  const URL = Constants.URLS.IMAGES[imageType];

  return `${format(URL, basket, vol, part, productId, order)}?r=${random}`;
};

/**
 * Generates a video URL for a WB product.
 * Mirrors WB's own urlVideoProduct() from their frontend JS.
 *
 * @param {number|string} productId - nm_id of the product
 * @param {"hls"|"mp4"} [videoFormat]   - "hls" → m3u8 playlist, "mp4" → preview file (360p)
 * @param {string} [quality]       - HLS quality; WB always uses "1440p". MP4 preview is always "360p"
 * @returns {string} full video URL
 */
const videoURL = (productId, videoFormat = "hls", quality = "1440p") => {
  const id = parseInt(productId, 10);
  const vol = id % 144;
  const part = Math.floor(id / 10000);
  const basket = getVideoBasket(vol);
  if (videoFormat === "mp4") {
    return format(Constants.URLS.VIDEO.MP4, basket, vol, part, id, quality);
  }
  return format(Constants.URLS.VIDEO.HLS, basket, vol, part, id, quality);
};

const brandImageURL = (brandId) => format(Constants.URLS.BRAND.IMAGE, brandId);

const genNewUserID = function () {
  const t = Math.floor(new Date().getTime() / 1e3);
  const e = Math.floor(Math.random() * Math.pow(2, 30)).toString() + t.toString();
  return e;
};

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatDateForQueryId(date = new Date()) {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

const getQueryIdForSearch = function () {
  return `qid${genNewUserID()}${formatDateForQueryId()}`;
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
