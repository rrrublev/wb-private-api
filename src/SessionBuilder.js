const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { fetch, Agent } = require("undici");
const { stringify } = require("qs");
const Constants = require("./Constants");

const TOKEN_FILE = path.resolve(__dirname, "../.wbaas_token");
const DEVICE_ID_FILE = path.resolve(__dirname, "../.deviceid");

/**
 * Возвращает стабильный deviceid, кешируя его в файле `.deviceid`.
 *
 * Воспроизводит алгоритм фронтенда WB (sessionService.getSession):
 * `site_` + UUID v4 без дефисов. На сайте значение хранится в
 * localStorage["wbx__sessionID"]; здесь — в файле, чтобы id был
 * постоянным между запусками.
 *
 * @returns {string}
 */
function getDeviceId() {
  try {
    const cached = fs.readFileSync(DEVICE_ID_FILE, "utf8").trim();
    if (/^site_[0-9a-f]{32}$/.test(cached)) return cached;
  } catch {}

  const deviceId = `site_${crypto.randomUUID().replace(/-/g, "")}`;
  try {
    fs.writeFileSync(DEVICE_ID_FILE, deviceId, "utf8");
  } catch {}
  return deviceId;
}

const noopLogger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
};

function defaultRequestLogger({ method, url, body }) {
  const suffix = body === undefined ? "" : `  ${JSON.stringify(body)}`;
  console.log(`  -> ${method.padEnd(4)} ${url}${suffix}`);
}

function createHttpError(status, url, method, data) {
  const wbError = Constants.WB_ERRORS_BY_STATUS[status];
  const message = wbError
    ? `${wbError.message}: ${status}`
    : `Request failed with status code ${status}`;
  const err = new Error(message);
  if (wbError) {
    err.name = wbError.name;
    err.code = wbError.code;
  }
  err.response = data === undefined ? { status } : { status, data };
  err.config = { url, method };
  return err;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function defaultRetryCondition(ctx) {
  return ctx.status === Constants.HTTP_STATUS.TOO_MANY_REQUESTS ||
    ctx.status >= Constants.HTTP_STATUS.INTERNAL_SERVER_ERROR ||
    Boolean(ctx.error);
}

async function readResponseData(response, responseType = "auto") {
  if (responseType === "text") {
    return response.text();
  }
  if (responseType === "json") {
    return response.json();
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  const trimmed = text.trimStart();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try { return JSON.parse(text); } catch { return text; }
  }
  return text;
}

// Домены из исходников WB (urls.json), для которых подтверждён proxy-путь /__internal/<subdomain>/
const PROXY_DOMAINS = new Set([
  "catalog", "search", "card", "suggests",
  "recom", "meta", "banners", "user-geo-data",
  "u-catalog", "u-search", "u-card", "u-suggests",
  "u-recom", "search-tags", "u-search-tags",
]);

function toProxyUrl(url) {
  return url.replace(
    /^https:\/\/([\w-]+)\.wb\.ru\//,
    (match, subdomain) =>
      PROXY_DOMAINS.has(subdomain)
        ? `https://www.wildberries.ru/__internal/${subdomain}/`
        : match
  );
}

class Session {
  constructor(config) {
    this._config = config;
    this._logger = config.logger || noopLogger;
    this._requestLogger = config.requestLogger || null;
    this._agent = new Agent({
      keepAliveTimeout: 30000,
      keepAliveMaxTimeout: 30000,
      connections: config.maxSockets,
    });
    this.defaults = {
      headers: { common: {} },
    };
  }

  _hasToken() {
    return !!this.defaults.headers.common["Cookie"];
  }

  resolveUrl(url) {
    return this._hasToken() ? toProxyUrl(url) : url;
  }

  _logRequest(method, url, body) {
    if (!this._requestLogger) return;
    const event = body === undefined ? { method, url } : { method, url, body };
    this._requestLogger(event);
  }

  /** @returns {Promise<{status: number, data: any}>} */
  async get(url, options = {}) {
    const { params = {}, headers = {}, retryOptions, responseType = "auto" } = options;

    const resolved = this.resolveUrl(url);
    const queryString = Object.keys(params).length
      ? "?" + stringify(params, { arrayFormat: "comma", encode: false })
      : "";
    const fullUrl = resolved + queryString;
    this._logRequest("GET", fullUrl);

    // DeviceId браузер шлёт только для запросов к www.wildberries.ru,
    // куда и проксируются __internal-эндпойнты. Признак — URL был переписан.
    const isInternal = resolved !== url;

    const mergedHeaders = {
      ...this._config.headers,
      ...this.defaults.headers.common,
      ...(isInternal ? { deviceid: getDeviceId() } : {}),
      ...headers,
    };

    const retries = retryOptions?.retries ?? this._config.retries;
    const retryCondition =
      retryOptions?.retryCondition ??
      defaultRetryCondition;

    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) {
        const delay = Math.min(Math.pow(2, attempt) * 1000 + Math.random() * 1000, 10000);
        this._logger.debug("Retry attempt", { attempt, url });
        await sleep(delay);
      }

      const startTime = Date.now();
      let response;
      try {
        response = await fetch(fullUrl, {
          method: "GET",
          headers: mergedHeaders,
          dispatcher: this._agent,
          signal: AbortSignal.timeout(this._config.timeout),
        });
      } catch (error) {
        lastError = error;
        const shouldRetry =
          attempt < retries &&
          retryCondition({ status: null, error, attempt, url, method: "get" });
        if (!shouldRetry) {
          error.config = { url, method: "get" };
          throw error;
        }
        continue;
      }

      const duration = Date.now() - startTime;
      if (duration > 5000) {
        this._logger.warn("Slow request detected", { url, duration });
      }

      if (response.status >= 200 && response.status < 300) {
        const data = await readResponseData(response, responseType);
        return { status: response.status, data };
      }

      const shouldRetry =
        attempt < retries &&
        retryCondition({ status: response.status, error: null, attempt, url, method: "get" });

      const data = await readResponseData(response, responseType);

      if (shouldRetry) {
        lastError = createHttpError(response.status, url, "get", data);
        continue;
      }

      const err = createHttpError(response.status, url, "get", data);
      this._logger.error("Request failed", { url, status: response.status, data });
      throw err;
    }

    if (lastError) {
      lastError.config = { url, method: "get" };
      throw lastError;
    }
  }

  /** @returns {Promise<{status: number, data: any}>} */
  async post(url, body, options = {}) {
    const { headers = {}, retryOptions } = options;
    this._logRequest("POST", url, body);

    const mergedHeaders = {
      ...this._config.headers,
      ...this.defaults.headers.common,
      "Content-Type": "application/json",
      ...headers,
    };

    const retries = retryOptions?.retries ?? this._config.retries;
    const retryCondition =
      retryOptions?.retryCondition ??
      defaultRetryCondition;

    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) {
        const delay = Math.min(Math.pow(2, attempt) * 1000 + Math.random() * 1000, 10000);
        this._logger.debug("Retry attempt", { attempt, url });
        await sleep(delay);
      }

      let response;
      try {
        response = await fetch(url, {
          method: "POST",
          headers: mergedHeaders,
          body: JSON.stringify(body),
          dispatcher: this._agent,
          signal: AbortSignal.timeout(this._config.timeout),
        });
      } catch (error) {
        lastError = error;
        const shouldRetry =
          attempt < retries &&
          retryCondition({ status: null, error, attempt, url, method: "post" });
        if (!shouldRetry) {
          error.config = { url, method: "post" };
          throw error;
        }
        continue;
      }

      if (response.status >= 200 && response.status < 300) {
        const data = await readResponseData(response);
        return { status: response.status, data };
      }

      const shouldRetry =
        attempt < retries &&
        retryCondition({ status: response.status, error: null, attempt, url, method: "post" });

      const data = await readResponseData(response);

      if (shouldRetry) {
        lastError = createHttpError(response.status, url, "post", data);
        continue;
      }

      const err = createHttpError(response.status, url, "post", data);
      this._logger.error("Request failed", { url, status: response.status, data });
      throw err;
    }

    if (lastError) {
      lastError.config = { url, method: "post" };
      throw lastError;
    }
  }
}

class SessionBuilder {
  static create(options = {}) {
    const config = {
      timeout: options.timeout || 30000,
      retries: options.retries ?? 3,
      maxSockets: options.maxSockets || 10,
      logger: options.logger || noopLogger,
      requestLogger: options.requestLogger || (options.logRequests ? defaultRequestLogger : null),
      headers: {
        "User-Agent": options.userAgent || Constants.USERAGENT,
        "Accept-Encoding": "gzip, deflate, br",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9,ru;q=0.8",
        "Origin": "https://www.wildberries.ru",
        "Referer": "https://www.wildberries.ru/",
        "Cache-Control": "no-cache",
      },
    };
    return new Session(config);
  }

  static readToken() {
    try {
      const data = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf8"));
      if (data.token && data.expires_at > Date.now()) return data.token;
    } catch {}
    return null;
  }

  /**
   * Устанавливает антибот-токен в заголовок Cookie сессии.
   * Только для запросов к wildberries.ru/__internal/*.
   * @param {Session} session
   * @param {string} token — значение cookie x_wbaas_token
   */
  static setAntibotToken(session, token) {
    session.defaults.headers.common["Cookie"] = `x_wbaas_token=${token}`;
  }
}

module.exports = SessionBuilder;
