/* eslint-disable camelcase */
const fs = require("fs");
const path = require("path");
const format = require("string-format");
const Constants = require("./Constants");
const WBProduct = require("./WBProduct");
const Utils = require("./Utils");
const WBCatalog = require("./WBCatalog");
const SessionBuilder = require("./SessionBuilder");

const TOKEN_FILE = path.resolve(__dirname, "../.wbaas_token");

function _readTokenFile() {
  try {
    const data = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf8"));
    if (data.token && data.expires_at > Date.now()) return data.token;
  } catch {}
  return null;
}

format.extend(String.prototype, {});

class WBPrivateAPI {
  /* Creating a new instance of the class WBPrivateAPI. */
  constructor({ destination, wbaasToken }) {
    this.session = SessionBuilder.create();
    this.destination = destination;
    const token = wbaasToken || _readTokenFile();
    if (token) {
      SessionBuilder.setAntibotToken(this.session, token);
    }
  }

  /**
   * Устанавливает токен x_wbaas_token для доступа к внутренним API WB.
   * Получить токен можно через консоль браузера на wildberries.ru:
   * @see scripts/get-wb-token.js
   * @param {string} token — значение cookie x_wbaas_token
   */
  setToken(token) {
    SessionBuilder.setAntibotToken(this.session, token);
  }

  /**
   * It searches for products by keyword.
   * @param {string} keyword - The keyword to search for
   * @param {number} pageCount - Number of pages to retrieve
   * @returns {WBCatalog} WBCatalog object with plain product objects inside
   */
  async search(keyword, pageCount = 0, retries = 0, filters = []) {
    const products = [];

    const totalProducts = await this.searchTotalProducts(keyword);
    if (totalProducts === 0) return [];

    const { catalog_type, catalog_value } = await this.getQueryMetadata(
      keyword,
      0,
      false,
      1,
      retries
    );
    const catalogConfig = { keyword, catalog_type, catalog_value };

    let totalPages = this.getPageCount(totalProducts);

    if (pageCount > 0 && pageCount < totalPages) {
      totalPages = pageCount;
    }

    const threads = Array.from({ length: totalPages }, (_, i) => i + 1);
    const parsedPages = await Promise.all(
      threads.map((thr) => this.getCatalogPage(catalogConfig, thr, retries, filters))
    );

    for (const page of parsedPages) {
      if (Array.isArray(page)) {
        products.push(...page.map((v) => new WBProduct(v)));
      }
    }

    Object.assign(catalogConfig, {
      pages: totalPages,
      products,
      totalProducts,
    });

    return new WBCatalog(catalogConfig);
  }

  /**
   * It takes a keyword and returns an array of three elements,
   * shardKey, preset and preset value
   * @param {string} keyword - The keyword you want to search for.
   * @returns {array} - An array of shardKey, preset and preset value
   */
  async getQueryMetadata(
    keyword,
    limit = 0,
    _withProducts = false,
    page = 1,
    retries = 0,
    suppressSpellcheck = true
  ) {
    const params = {
      appType: Constants.APPTYPES.DESKTOP,
      curr: Constants.CURRENCIES.RUB,
      dest: this.destination.ids[0],
      query: keyword,
      resultset: "catalog",
      sort: "popular",
      spp: "30",
      suppressSpellcheck,
    };
    if (page !== 1) {
      params.page = page;
    }
    if (limit !== 100) {
      params.limit = limit;
    }

    const res = await this.session.get(this._searchUrl, {
      params,
      headers: {
        "x-queryid": Utils.Search.getQueryIdForSearch(),
      },
      retryOptions: {
        retries,
        retryCondition: (error) => {
          return error.response.status === 429 || error.response.status >= 500;
        },
      },
    });

    if (
      "catalog_type" in (res.data?.metadata ?? {}) &&
      "catalog_value" in (res.data?.metadata ?? {})
    ) {
      return { ...res.data.metadata, products: res.data.data?.products ?? res.data.products };
    }

    if ("shardKey" in (res.data ?? {}) && "query" in (res.data ?? {})) {
      return {
        catalog_type: res.data.shardKey,
        catalog_value: res.data.query,
        products: [],
      };
    }

    return { catalog_type: null, catalog_value: null, products: [] };
  }

  /**
   * It returns the total number of products for a given keyword
   * @param {string} keyword - the search query
   * @returns Total number of products
   */
  async searchTotalProducts(keyword) {
    const res = await this.session.get(this._searchTotalProductsUrl, {
      params: {
        appType: Constants.APPTYPES.DESKTOP,
        query: keyword,
        curr: Constants.CURRENCIES.RUB,
        dest: this.destination.ids[0],
        regions: this.destination.regions[0],
        locale: Constants.LOCALES.RU,
        resultset: "filters",
      },
      headers: {
        "x-queryid": Utils.Search.getQueryIdForSearch(),
      },
    });

    return res.data.data?.total || 0;
  }

  /**
   * It returns the total number of products by supplier
   * @param {number} supplierId - the search query
   * @returns {number} Total number of products
   */
  async SupplierTotalProducts(supplierId) {
    const res = await this.session.get(this._supplierTotalProductsUrl, {
      params: {
        appType: Constants.APPTYPES.DESKTOP,
        curr: Constants.CURRENCIES.RUB,
        dest: this.destination.ids[0],
        filters: "xsubject",
        spp: "30",
        supplier: supplierId,
      },
    });

    return res.data.data?.total || 0;
  }

  /**
   * It returns the data based on filters array
   * @param {string} keyword - the search query
   * @param {array} filters - array of filters elements like ['fbrand','fsupplier']
   * @returns Total number of products
   */
  async searchCustomFilters(keyword, filters) {
    const res = await this.session.get(this._searchUrl, {
      params: {
        appType: Constants.APPTYPES.DESKTOP,
        curr: Constants.CURRENCIES.RUB,
        dest: this.destination.ids[0],
        lang: Constants.LOCALES.RU,
        query: keyword,
        resultset: "filters",
        sort: "popular",
        filters: filters.join(";"),
      },
      headers: {
        "x-queryid": Utils.Search.getQueryIdForSearch(),
      },
    });
    return res.data?.data || {};
  }

  /**
   * It gets all products from specified page
   * @param {object} catalogConfig - { keyword, catalog_type, catalog_value }
   * @param {number} page - page number
   * @returns {array} - An array of products
   */
  async getCatalogPage(catalogConfig, page = 1, retries = 0, filters = []) {
    const options = {
      params: {
        appType: Constants.APPTYPES.DESKTOP,
        curr: Constants.CURRENCIES.RUB,
        dest: this.destination.ids[0],
        query: catalogConfig.keyword.toLowerCase(),
        resultset: "catalog",
        sort: "popular",
        spp: "30",
        suppressSpellcheck: false,
      },
      headers: {
        "x-queryid": Utils.Search.getQueryIdForSearch(),
        referrer:
          "https://www.wildberries.ru/catalog/0/search.aspx?page=2&sort=popular&search=" +
          encodeURI(catalogConfig.keyword.toLowerCase()),
      },
    };
    if (page !== 1) {
      options.params.page = page;
    }
    for (const filter of filters) {
      options.params[filter.type] = filter.value;
    }
    options.retryOptions = {
      retries,
      retryCondition: (error) => {
        return error.response.status === 429 || error.response.status >= 500;
      },
    };
    const res = await this.session.get(this._searchUrl, options);
    if (res.status === 429 || res.status === 500) {
      throw new Error("BAD STATUS");
    }
    if (res.data?.metadata?.catalog_value === "preset=11111111") {
      throw new Error("BAD CATALOG VALUE - 11111111");
    }
    return res.data.data?.products ?? res.data.products;
  }

  /**
   * Search for adverts and their ads form specified keyword
   * @param {string} keyword - the search query
   * @returns {object} - An object with adverts and their ads
   */
  async getSearchAds(keyword) {
    const options = { params: { keyword } };
    const res = await this.session.get(Constants.URLS.SEARCH.ADS, options);
    return res.data;
  }

  /**
   * Search for carousel ads inside product card
   * @param {number} productId - product id
   * @returns {array} - An array with ads
   */
  async getCarouselAds(productId) {
    const res = await this.session.get(Constants.URLS.SEARCH.CAROUSEL_ADS, {
      params: { nm: productId },
    });
    return res.data;
  }

  /**
   * It takes a query string and returns a list of suggestions that match the query
   * @param {string} query - the search query
   * @returns {array} - An array of objects.
   */
  async keyHint(query) {
    const res = await this.session.get(Constants.URLS.SEARCH.HINT, {
      params: {
        query,
        gender: Constants.SEX.COMMON,
        locale: Constants.LOCALES.RU,
        lang: Constants.LOCALES.RU,
        appType: Constants.APPTYPES.DESKTOP,
      },
    });
    return res.data;
  }

  /**
   * It takes a productId, makes a request to the server, and returns the similar Ids
   * @param productId - The product ID of the product you want to search for similar
   * @returns {object} with similar product Ids
   */
  async searchSimilarByNm(productId) {
    const res = await this.session.get(Constants.URLS.SEARCH.SIMILAR_BY_NM, {
      params: { nm: productId },
    });
    return res.data;
  }

  /**
   * It takes an array of productIds and a destination, and returns an array of
   * products with delivery time data
   * @param {array} productIds - array of product IDs
   * @param {number} retries - number of retries
   * @returns {array} of products with delivery times
   */
  async getDeliveryDataByNms(productIds, retries = 0) {
    const res = await this.session.get(Constants.URLS.PRODUCT.DELIVERYDATA, {
      params: {
        appType: Constants.APPTYPES.DESKTOP,
        locale: Constants.LOCALES.RU,
        dest: this.destination.ids[0],
        nm: productIds.join(";"),
      },
      retryOptions: {
        retries,
      },
    });
    return res.data.data?.products ?? res.data.products;
  }

  /**
   * @returns Array of promos
   */
  async getPromos() {
    const result = await this.session.get(Constants.URLS.PROMOS);
    return result.data;
  }

  /**
   * @returns Array of found products
   */
  async getListOfProducts(productIds) {
    const res = await this.session.get(Constants.URLS.SEARCH.LIST, {
      params: {
        appType: Constants.APPTYPES.DESKTOP,
        dest: this.destination.ids[0],
        curr: Constants.CURRENCIES.RUB,
        lang: Constants.LOCALES.RU,
        nm: productIds.join(";"),
      },
    });
    return res.data.data?.products ?? res.data.products ?? [];
  }

  /**
   * @returns Object with supplier info
   */
  async getSupplierInfo(sellerId) {
    const res = await this.session.get(
      Constants.URLS.SUPPLIER.INFO.format(sellerId)
    );
    return res.data || {};
  }

  /**
   * @returns Object with supplier shipment info
   */
  async getSupplierShipment(sellerId) {
    const res = await this.session.get(
      Constants.URLS.SUPPLIER.SHIPMENT.format(sellerId),
      {
        headers: {
          "x-client-name": "site",
        },
      }
    );
    return res.data || {};
  }

  /**
   * It takes a supplier id and returns an array of products
   * @param {number} supplierId - supplier ID
   * @param {number} page - page number
   * @returns {object} - Raw API response data.
   */
  async getSupplierCatalog(supplierId, page = 1) {
    const res = await this.session.get(this._supplierCatalogUrl, {
      params: {
        appType: Constants.APPTYPES.DESKTOP,
        curr: Constants.CURRENCIES.RUB,
        dest: this.destination.ids[0],
        lang: Constants.LOCALES.RU,
        page,
        sort: "popular",
        spp: "30",
        supplier: supplierId,
      },
    });
    return res.data || {};
  }

  /**
   * It gets all products from supplier catalog with pagination
   * @param {number} supplierId - supplier ID
   * @param {number} pageCount - Number of pages to retrieve (0 = all pages)
   * @param {number} retries - Number of retries for failed requests
   * @returns {WBCatalog} WBCatalog object with all supplier products
   */
  async getSupplierCatalogAll(supplierId, pageCount = 0, retries = 0) {
    const products = [];

    const totalProducts = await this.SupplierTotalProducts(supplierId);
    if (totalProducts === 0) {
      return new WBCatalog({
        supplierId,
        catalog_type: "supplier",
        catalog_value: `supplier=${supplierId}`,
        pages: 0,
        products: [],
        totalProducts: 0,
      });
    }

    const catalogConfig = {
      supplierId,
      catalog_type: "supplier",
      catalog_value: `supplier=${supplierId}`,
    };

    let totalPages = this.getPageCount(totalProducts);

    if (pageCount > 0 && pageCount < totalPages) {
      totalPages = pageCount;
    }

    const threads = Array.from({ length: totalPages }, (_, i) => i + 1);
    const parsedPages = await Promise.all(
      threads.map((thr) => this.getSupplierCatalogPage(supplierId, thr, retries))
    );

    for (const page of parsedPages) {
      if (Array.isArray(page)) {
        products.push(...page.map((v) => new WBProduct(v)));
      }
    }

    Object.assign(catalogConfig, {
      pages: totalPages,
      products,
      totalProducts,
    });

    return new WBCatalog(catalogConfig);
  }

  /**
   * It gets products from specified supplier catalog page
   * @param {number} supplierId - supplier ID
   * @param {number} page - page number
   * @param {number} retries - number of retries
   * @returns {array} - An array of products
   */
  async getSupplierCatalogPage(supplierId, page = 1, retries = 0) {
    const res = await this.session.get(this._supplierCatalogUrl, {
      params: {
        appType: Constants.APPTYPES.DESKTOP,
        curr: Constants.CURRENCIES.RUB,
        dest: this.destination.ids[0],
        lang: Constants.LOCALES.RU,
        page,
        sort: "popular",
        spp: "30",
        supplier: supplierId,
      },
      retryOptions: {
        retries,
        retryCondition: (error) => {
          return error.response.status === 429 || error.response.status >= 500;
        },
      },
    });
    if (res.status === 429 || res.status === 500) {
      throw new Error("BAD STATUS");
    }
    return res.data.data?.products ?? res.data.products ?? [];
  }

  get _hasAntibotToken() {
    return !!this.session.defaults.headers.common["Cookie"];
  }

  get _searchUrl() {
    return this._hasAntibotToken
      ? Constants.URLS.SEARCH.EXACTMATCH_INTERNAL
      : Constants.URLS.SEARCH.EXACTMATCH;
  }

  get _searchTotalProductsUrl() {
    return this._hasAntibotToken
      ? Constants.URLS.SEARCH.TOTALPRODUCTS_INTERNAL
      : Constants.URLS.SEARCH.TOTALPRODUCTS;
  }

  get _supplierTotalProductsUrl() {
    return this._hasAntibotToken
      ? Constants.URLS.SUPPLIER.TOTALPRODUCTS_INTERNAL
      : Constants.URLS.SUPPLIER.TOTALPRODUCTS;
  }

  get _supplierCatalogUrl() {
    return this._hasAntibotToken
      ? Constants.URLS.SUPPLIER.CATALOG_INTERNAL
      : Constants.URLS.SUPPLIER.CATALOG;
  }

  getPageCount(totalProducts) {
    return Math.min(
      Math.ceil(totalProducts / Constants.PRODUCTS_PER_PAGE),
      Constants.PAGES_PER_CATALOG
    );
  }
}

module.exports = WBPrivateAPI;
