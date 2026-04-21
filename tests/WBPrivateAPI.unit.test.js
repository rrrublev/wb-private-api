/* eslint-disable no-undef */

const Constants = require("../src/Constants");
const WBPrivateAPI = require("../src/WBPrivateAPI");

// Минимальный mock-объект, заменяющий session после конструктора.
// defaults.headers.common нужен для _hasAntibotToken getter-а.
function makeSessionMock() {
  return {
    get: jest.fn(),
    defaults: { headers: { common: {} } },
  };
}

let wbapi;
let mockSession;

beforeEach(() => {
  wbapi = new WBPrivateAPI({ destination: Constants.DESTINATIONS.MOSCOW });
  mockSession = makeSessionMock();
  wbapi.session = mockSession;
});

// ---------------------------------------------------------------------------

describe("getQueryMetadata() — передача retryOptions", () => {
  // getQueryMetadata возвращает { catalog_type, catalog_value, products }
  const response = {
    status: 200,
    data: { metadata: { catalog_type: "preset", catalog_value: "preset=123" } },
  };

  test("retries: 0 прокидывается в session.get как retryOptions: { retries: 0 }", async () => {
    mockSession.get.mockResolvedValueOnce(response);
    await wbapi.getQueryMetadata("платье", 0, false, 1, 0);
    expect(mockSession.get).toHaveBeenCalledTimes(1);
    const [, options] = mockSession.get.mock.calls[0];
    expect(options.retryOptions).toEqual({ retries: 0 });
  });

  test("retries: 2 прокидывается в session.get как retryOptions: { retries: 2 }", async () => {
    mockSession.get.mockResolvedValueOnce(response);
    await wbapi.getQueryMetadata("платье", 0, false, 1, 2);
    const [, options] = mockSession.get.mock.calls[0];
    expect(options.retryOptions).toEqual({ retries: 2 });
  });

  test("retries не задан → retries: 0 (дефолт параметра метода)", async () => {
    mockSession.get.mockResolvedValueOnce(response);
    await wbapi.getQueryMetadata("платье");
    const [, options] = mockSession.get.mock.calls[0];
    expect(options.retryOptions).toEqual({ retries: 0 });
  });
});

// ---------------------------------------------------------------------------

describe("getCatalogPage() — передача retryOptions", () => {
  const catalogConfig = {
    keyword: "платье",
    catalog_type: "preset",
    catalog_value: "preset=123",
  };
  const response = {
    status: 200,
    data: { data: { products: [{ id: 1 }] } },
  };

  test("retries: 0 прокидывается в session.get как retryOptions: { retries: 0 }", async () => {
    mockSession.get.mockResolvedValueOnce(response);
    await wbapi.getCatalogPage(catalogConfig, 1, 0);
    expect(mockSession.get).toHaveBeenCalledTimes(1);
    const [, options] = mockSession.get.mock.calls[0];
    expect(options.retryOptions).toEqual({ retries: 0 });
  });

  test("retries: 1 прокидывается в session.get как retryOptions: { retries: 1 }", async () => {
    mockSession.get.mockResolvedValueOnce(response);
    await wbapi.getCatalogPage(catalogConfig, 1, 1);
    const [, options] = mockSession.get.mock.calls[0];
    expect(options.retryOptions).toEqual({ retries: 1 });
  });

  test("retries не задан → retries: 0 (дефолт параметра метода)", async () => {
    mockSession.get.mockResolvedValueOnce(response);
    await wbapi.getCatalogPage(catalogConfig, 1);
    const [, options] = mockSession.get.mock.calls[0];
    expect(options.retryOptions).toEqual({ retries: 0 });
  });
});

// ---------------------------------------------------------------------------

describe("getSupplierCatalogPage() — передача retryOptions", () => {
  const response = {
    status: 200,
    data: { data: { products: [{ id: 2 }] } },
  };

  test("retries: 0 прокидывается в session.get как retryOptions: { retries: 0 }", async () => {
    mockSession.get.mockResolvedValueOnce(response);
    await wbapi.getSupplierCatalogPage(12345, 1, 0);
    expect(mockSession.get).toHaveBeenCalledTimes(1);
    const [, options] = mockSession.get.mock.calls[0];
    expect(options.retryOptions).toEqual({ retries: 0 });
  });

  test("retries: 3 прокидывается в session.get как retryOptions: { retries: 3 }", async () => {
    mockSession.get.mockResolvedValueOnce(response);
    await wbapi.getSupplierCatalogPage(12345, 1, 3);
    const [, options] = mockSession.get.mock.calls[0];
    expect(options.retryOptions).toEqual({ retries: 3 });
  });

  test("retries не задан → retries: 0 (дефолт параметра метода)", async () => {
    mockSession.get.mockResolvedValueOnce(response);
    await wbapi.getSupplierCatalogPage(12345);
    const [, options] = mockSession.get.mock.calls[0];
    expect(options.retryOptions).toEqual({ retries: 0 });
  });
});
