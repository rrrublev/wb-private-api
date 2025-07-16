/* eslint-disable no-nested-ternary */
const format = require("string-format");
const Constants = require("./Constants");
const SessionBuilder = require("./SessionBuilder");
const WBFeedback = require("./WBFeedback");
const WBQuestion = require("./WBQuestion");
const { getBasketNumber } = require("./Utils").Card;

format.extend(String.prototype, {});

class WBProduct {
  stocks = [];
  promo = {};
  feedbacks = [];
  _rawResponse = {};

  constructor(product) {
    this.session = SessionBuilder.create();
    if (typeof product !== "number") {
      Object.assign(this, product);
    } else {
      this.id = product;
    }
  }

  static async create(productId) {
    const instance = new WBProduct(productId);
    await Promise.all([
      instance.getProductData(),
      instance.getDetailsData(),
      instance.getSellerData(),
    ]);
    await instance.getQuestionsCount();

    return new WBProduct(
      Object.assign(instance._rawResponse, { id: productId })
    );

    // Создаем новый экземпляр с данными из нового API
    // const productData = instance._rawResponse.details;
    // return new WBProduct(productData);
  }

  /**
   * The function returns the value of the afterSale property of the price
   * @returns The afterSale price.
   */
  get currentPrice() {
    return this.price.afterSale;
  }

  /**
   * It takes the array of stocks, and for each stock, it adds the quantity of
   * that stock to the sum
   * @returns The total number of stocks.
   */
  get totalStocks() {
    return this._rawResponse.details.sizes[0].stocks.reduce(
      (sum, x) => sum + x.qty,
      0
    );
  }

  /**
   * It makes a request to the server and gets the product data
   */
  async getProductData() {
    const limits = [0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8];

    const sku = String(this.id);

    const basketNumber = getBasketNumber(sku);
    const vol = sku.length > 5 ? sku.substring(0, limits[sku.length]) : 0;
    const part = sku.substring(0, limits[sku.length + 2]);
    const URL = Constants.URLS.PRODUCT.CARD;
    const res = await this.session.get(
      URL.format(
        basketNumber < 10 ? `0${basketNumber}` : basketNumber,
        vol,
        part,
        sku
      )
    );
    const rawData = res.data;
    Object.assign(this._rawResponse, rawData);
  }

  /**
   * It makes a request to the server and gets the seller data
   */
  async getSellerData() {
    const limits = [0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8];

    const sku = String(this.id);
    const basketNumber = getBasketNumber(sku);
    const vol = sku.length > 5 ? sku.substring(0, limits[sku.length]) : 0;
    const part = sku.substring(0, limits[sku.length + 2]);
    const URL = Constants.URLS.PRODUCT.SELLERS;
    const res = await this.session.get(
      URL.format(
        basketNumber < 10 ? `0${basketNumber}` : basketNumber,
        vol,
        part,
        sku
      )
    );
    const rawData = res.data;
    Object.assign(this._rawResponse, {
      seller: rawData,
      supplier_id: rawData.supplierId,
    });
  }

  async getDetailsData() {
    const options = {
      params: {
        appType: Constants.APPTYPES.DESKTOP,
        curr: Constants.CURRENCIES.RUB,
        dest: Constants.DESTINATIONS.MOSCOW.ids[0],
        spp: "30",
        lang: Constants.LOCALES.RU,
        nm: `${this.id};`,
      },
    };

    const res = await this.session.get(Constants.URLS.PRODUCT.DETAILS, options);
    const rawData = res.data.products[0];
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
    if ("id" in this._rawResponse === false) {
      await this.getProductData(this);
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
    const numToUint8Array = function (r) {
      const t = new Uint8Array(8);
      for (let n = 0; n < 8; n++) (t[n] = r % 256), (r = Math.floor(r / 256));
      return t;
    };

    const crc16Arc = function (r) {
      const t = numToUint8Array(r);
      let n = 0;
      for (let r = 0; r < t.length; r++) {
        n ^= t[r];
        for (let r = 0; r < 8; r++)
          (1 & n) > 0 ? (n = (n >> 1) ^ 40961) : (n >>= 1);
      }
      return n;
    };

    let newFeedbacks = [];

    const partition_id = crc16Arc(this.imt_id) % 100 >= 50 ? "2" : "1";
    const url = Constants.URLS.PRODUCT.FEEDBACKS.format(
      partition_id,
      this.imt_id
    );

    const res = await this.session.get(url);

    newFeedbacks = (res.data.feedbacks || []).map((fb) => new WBFeedback(fb));
    this.feedbacks = newFeedbacks;
    return newFeedbacks;
  }

  /**
   * It returns the total number of questions for a given imt_id
   * @returns The total number of questions for the product.
   */
  async getQuestionsCount() {
    const options = {
      params: {
        imtId: this._rawResponse.imt_id,
        onlyCount: true,
      },
    };
    const url = Constants.URLS.PRODUCT.QUESTIONS;
    const res = await this.session.get(url, options);
    this.totalQuestions = res.data.count;
    Object.assign(this._rawResponse, { totalQuestions: res.data.count });
    return this.totalQuestions;
  }

  /**
   * It gets all questions
   * @param [page=0] - The page number of the questions to get.
   * @returns An array of WBQuestion objects
   */
  async getQuestions(page = 0) {
    let newQuestions = [];
    let totalQuestions = 0;
    if (page === 0) {
      if ("totalQuestions" in this) {
        totalQuestions = this.totalQuestions;
      } else {
        totalQuestions = await this.getQuestionsCount();
        this.totalQuestions = totalQuestions;
      }
      const totalPages = Math.round(
        totalQuestions / Constants.QUESTIONS_PER_PAGE + 0.5
      );

      const threads = Array(totalPages)
        .fill(1)
        .map((x, y) => x + y);
      const parsedPages = await Promise.all(
        threads.map((thr) => this.getQuestions(thr))
      );
      parsedPages.map((val) => newQuestions.push(...val));
    } else {
      const skip = (page - 1) * Constants.QUESTIONS_PER_PAGE;
      const options = {
        params: {
          imtId: this.imt_id,
          skip,
          take: Constants.QUESTIONS_PER_PAGE,
        },
      };

      const url = Constants.URLS.PRODUCT.QUESTIONS;
      const res = await this.session.get(url, options);
      newQuestions = res.data.questions.map(
        (question) => new WBQuestion(question)
      );
    }
    this.questions = newQuestions;
    return newQuestions;
  }
}

module.exports = WBProduct;
