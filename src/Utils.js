/* eslint-disable no-nested-ternary */
const format = require("string-format");
const Constants = require("./Constants");
const { MEDIA_BASKET_RANGES, VIDEO_BASKET_RANGES } = require("./UpstreamRoutes");

// vol = Math.floor(nm_id / 100000); верхняя граница корзины (индекс + 1).
// Source: embedded snapshot of WB upstreams origin.mediabasket_route_map.
const BASKETS = [...MEDIA_BASKET_RANGES, Infinity];

// vol = nm_id % 144; верхняя граница корзины (индекс + 1).
// Source: embedded snapshot of WB upstreams origin.videonme_route_map.
const VIDEO_BASKETS = [...VIDEO_BASKET_RANGES, Infinity];

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
