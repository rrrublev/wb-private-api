/* eslint-disable no-nested-ternary */
const format = require("string-format");
const Constants = require("./Constants");
const SessionBuilder = require("./SessionBuilder");
const WBFeedback = require("./WBFeedback");
const WBQuestion = require("./WBQuestion");
const { getBasketNumber, videoURL } = require("./Utils").Card;

function numToUint8Array(r) {
  const t = new Uint8Array(8);
  for (let n = 0; n < 8; n++) (t[n] = r % 256), (r = Math.floor(r / 256));
  return t;
}

function crc16Arc(r) {
  const t = numToUint8Array(r);
  let n = 0;
  for (let i = 0; i < t.length; i++) {
    n ^= t[i];
    for (let j = 0; j < 8; j++)
      (1 & n) > 0 ? (n = (n >> 1) ^ 40961) : (n >>= 1);
  }
  return n;
}


class WBProduct {
  stocks = [];
  promo = {};
  feedbacks = [];
  _rawResponse = {};

  constructor(product, { session, destination } = {}) {
    this.session = session || SessionBuilder.create();
    this.destination = destination || Constants.DESTINATIONS.MOSCOW;
    if (typeof product !== "number") {
      Object.assign(this, product);
    } else {
      this.id = product;
    }
  }

  static async create(productId, options = {}) {
    const instance = new WBProduct(productId, options);
    await Promise.all([
      instance.getProductData(),
      instance.getDetailsData(),
      instance.getSellerData(),
    ]);
    await instance.getQuestionsCount();
    return instance;
  }

  /**
   * The function returns the value of the afterSale property of the price
   * @returns The afterSale price.
   */
  get currentPrice() {
    return this._rawResponse.details?.sizes?.[0]?.price?.product;
  }

  /**
   * It takes the array of stocks, and for each stock, it adds the quantity of
   * that stock to the sum
   * @returns The total number of stocks.
   */
  get totalStocks() {
    return (this._rawResponse.details?.sizes?.[0]?.stocks || []).reduce(
      (sum, x) => sum + x.qty,
      0
    );
  }

  _cardUrl(urlTemplate) {
    const basket = getBasketNumber(this.id);
    const vol    = Math.floor(this.id / 100000);
    const part   = Math.floor(this.id / 1000);
    return format(urlTemplate, basket, vol, part, this.id);
  }

  async getProductData() {
    const res = await this.session.get(this._cardUrl(Constants.URLS.PRODUCT.CARD));
    Object.assign(this._rawResponse, res.data);
  }

  async getSellerData() {
    const res = await this.session.get(this._cardUrl(Constants.URLS.PRODUCT.SELLERS));
    Object.assign(this._rawResponse, {
      seller: res.data,
      supplier_id: res.data.supplierId,
    });
  }

  async getDetailsData() {
    const options = {
      params: {
        appType: Constants.APPTYPES.DESKTOP,
        curr: Constants.CURRENCIES.RUB,
        dest: this.destination.ids[0],
        spp: "30",
        lang: Constants.LOCALES.RU,
        nm: this.id,
      },
    };

    const res = await this.session.get(Constants.URLS.PRODUCT.DETAILS, options);
    const rawData = res.data?.products?.[0] ?? null;
    Object.assign(this._rawResponse, { details: rawData });
  }

  /**
   * If the product has stocks, return the stocks. If the product has sizes,
   * return the stocks of the first size. If the product doesn't have sizes, get
   * the product data and return the stocks
   * @returns {object} - The stocks of the product.
   */
  async getStocks() {
    if (!this._rawResponse?.details?.sizes) {
      await this.getDetailsData();
    }

    return this._rawResponse?.details?.sizes?.[0]?.stocks || [];
  }

  /**
   * It returns the promo object for a product, but if it doesn't exist, it calls
   * the getProductData function to get the product data, and then calls itself
   * again to get the promo object
   * @returns {object} - the product.promo object.
   */
  async getPromo() {
    if (!this._rawResponse.imt_id) {
      await this.getProductData();
    }

    if ("panelPromoId" in this.promo) {
      return this.promo;
    }

    if ("panelPromoId" in this._rawResponse) {
      this.promo = {
        active: true,
        panelPromoId: this._rawResponse.panelPromoId,
        promoTextCard: this._rawResponse.promoTextCard,
        promoTextCat: this._rawResponse.promoTextCat,
      };
      return this.promo;
    }

    this.promo = {
      active: false,
    };

    return this.promo;
  }

  /**
   * It gets all feedbacks.
   * @param [page=0] - page number
   * @returns An array of WBFeedback objects
   */
  async getFeedbacks() {
    const imt_id = this.imt_id ?? this._rawResponse.imt_id;
    if (!imt_id) {
      this.feedbacks = [];
      return [];
    }
    const partition_id = crc16Arc(imt_id) % 100 >= 50 ? "2" : "1";
    const url = format(Constants.URLS.PRODUCT.FEEDBACKS, partition_id, imt_id);
    const res = await this.session.get(url);
    this.feedbacks = (res.data.feedbacks || []).map((fb) => new WBFeedback(fb));
    return this.feedbacks;
  }

  /**
   * It returns the total number of questions for a given imt_id
   * @returns The total number of questions for the product.
   */
  async getQuestionsCount() {
    const imtId = this.imt_id ?? this._rawResponse.imt_id;
    if (!imtId) {
      this.totalQuestions = 0;
      return 0;
    }
    const res = await this.session.get(Constants.URLS.PRODUCT.QUESTIONS, {
      params: { imtId, onlyCount: true },
    });
    this.totalQuestions = res.data?.count ?? 0;
    return this.totalQuestions;
  }

  /**
   * Fetches all available questions for the product.
   *
   * The WB API hard-limits questions to ~510 records (skip < 510).
   * When `totalQuestions` exceeds this limit the result is truncated.
   * Check `result.truncated` to detect partial data.
   *
   * @returns {{ items: WBQuestion[], totalQuestions: number, fetchedQuestions: number, truncated: boolean }}
   */
  async getQuestions() {
    if (!("totalQuestions" in this)) {
      await this.getQuestionsCount();
    }
    const totalPages = Math.ceil(this.totalQuestions / Constants.QUESTIONS_PER_PAGE);
    const allQuestions = [];
    for (let page = 1; page <= totalPages; page++) {
      const pageQuestions = await this._fetchQuestionsPage(page);
      if (pageQuestions.length === 0) break;
      allQuestions.push(...pageQuestions);
    }
    const result = {
      items: allQuestions,
      totalQuestions: this.totalQuestions,
      fetchedQuestions: allQuestions.length,
      truncated: allQuestions.length < this.totalQuestions,
    };
    this.questions = result.items;
    this.questionsMeta = result;
    return result;
  }

  async _fetchQuestionsPage(page) {
    const imt_id = this.imt_id ?? this._rawResponse.imt_id;
    const res = await this.session.get(Constants.URLS.PRODUCT.QUESTIONS, {
      params: {
        imtId: imt_id,
        skip: (page - 1) * Constants.QUESTIONS_PER_PAGE,
        take: Constants.QUESTIONS_PER_PAGE,
      },
    });
    return res.data.questions.map((q) => new WBQuestion(q));
  }

  /**
   * Returns video info for the product.
   *
   * WB JS source always requests "1440p" for HLS and "360p" for the MP4 preview —
   * both quality values are hardcoded in WB's frontend (product_dist JS).
   * hasVideo is determined by bit 4 (0x10) of viewFlags from the card details API,
   * with fallback to media.has_video from card.json.
   *
   * Fetches the HLS playlist to get chunk count and duration.
   * The full video is available only as HLS (.ts chunks).
   * The MP4 preview (360p) is a single short file — not the full video.
   *
   * @param {string} [quality="1440p"] - HLS quality (WB always uses "1440p")
   * @returns {Promise<{
   *   hasVideo: boolean,
   *   quality: string,
   *   playlistUrl: string,
   *   duration: number,
   *   chunks: number,
   *   hls: string[],
   *   mp4Preview: string
   * } | {hasVideo: false}>}
   */
  async getVideo(quality = "1440p") {
    // bit 4 (16) of viewFlags = hasVideo (from WB source: _q.hasVideo = BigInt(16))
    const viewFlags = this._rawResponse?.details?.viewFlags;
    const hasVideo = viewFlags != null
      ? !!(viewFlags & 16)
      : this._rawResponse?.media?.has_video;
    if (!hasVideo) return { hasVideo: false };

    const playlistUrl = videoURL(this.id, "hls", quality);

    let chunks = 0;
    let duration = 0;
    try {
      const res = await this.session.get(playlistUrl, { responseType: "text" });
      const m3u8 = typeof res.data === "string" ? res.data : "";
      const extinf = m3u8.match(/#EXTINF:([\d.]+)/g) || [];
      chunks = extinf.length;
      duration = extinf.reduce((sum, line) => {
        const val = parseFloat(line.replace("#EXTINF:", ""));
        return sum + (isNaN(val) ? 0 : val);
      }, 0);
    } catch (_) {
      return { hasVideo: true, quality, playlistUrl, error: "playlist fetch failed" };
    }

    const hls = Array.from({ length: chunks }, (_, i) =>
      playlistUrl.replace("index.m3u8", `${i + 1}.ts`)
    );

    // MP4 exists only as a single 360p preview file (WB autoplay preview).
    // It does not cover the full video duration.
    const mp4Preview = videoURL(this.id, "mp4", "360p");

    return {
      hasVideo: true,
      quality,
      playlistUrl,
      duration: Math.round(duration),
      chunks,
      hls,
      mp4Preview,
    };
  }
}

module.exports = WBProduct;
