const Constants = require("./Constants");

class WBCatalog {
  /* Creating a new instance of the class WBCatalog. */
  constructor(data) {
    this.catalog_type = data.catalog_type;
    this.catalog_value = data.catalog_value;
    this.pages = data.pages;
    this.products = data.products;
    this.totalProducts = data.totalProducts;
  }

  /**
   * It takes a page number and returns a slice of plain product objects
   * for that page.
   * @param {number} number - the page number (1-based)
   * @returns {array} - A slice of plain product objects from the catalog.
   */
  page(number) {
    const startIndex = (number - 1) * Constants.PRODUCTS_PER_PAGE;
    if (startIndex >= this.products.length) return [];
    return this.products.slice(startIndex, startIndex + Constants.PRODUCTS_PER_PAGE);
  }

  /**
   * It returns the position of the product in the products array, or -1 if the
   * product is not in the array
   * @param {number} productId - The SKU of the product.
   * @returns {number} - The position of the product in the array.
   */
  getPosition(productId) {
    return this.products.findIndex((item) => item.id === productId);
  }
}

module.exports = WBCatalog;
