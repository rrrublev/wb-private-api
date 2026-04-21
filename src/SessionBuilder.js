const { fetch, Agent } = require("undici");
const { stringify } = require("qs");
const Constants = require("./Constants");

const noopLogger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
};

function createHttpError(status, url, method) {
  const err = new Error(`Request failed with status code ${status}`);
  err.response = { status };
  err.config = { url, method };
  return err;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class Session {
  constructor(config) {
    this._config = config;
    this._logger = config.logger || noopLogger;
    this._agent = new Agent({
      keepAliveTimeout: 30000,
      keepAliveMaxTimeout: 30000,
      connections: config.maxSockets,
    });
    this.defaults = {
      headers: { common: {} },
    };
  }

  async get(url, options = {}) {
    const { params = {}, headers = {}, retryOptions, responseType = "auto" } = options;

    const queryString = Object.keys(params).length
      ? "?" + stringify(params, { arrayFormat: "comma", encode: false })
      : "";
    const fullUrl = url + queryString;

    const mergedHeaders = {
      ...this._config.headers,
      ...this.defaults.headers.common,
      ...headers,
    };

    const retries = retryOptions?.retries ?? this._config.retries;
    const retryCondition =
      retryOptions?.retryCondition ??
      ((ctx) => ctx.status === 429 || ctx.status >= 500 || Boolean(ctx.error));

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
        let data;
        if (responseType === "text") {
          data = await response.text();
        } else if (responseType === "json") {
          data = await response.json();
        } else {
          const contentType = response.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            data = await response.json();
          } else {
            const text = await response.text();
            const trimmed = text.trimStart();
            if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
              try { data = JSON.parse(text); } catch { data = text; }
            } else {
              data = text;
            }
          }
        }
        return { status: response.status, data };
      }

      const shouldRetry =
        attempt < retries &&
        retryCondition({ status: response.status, error: null, attempt, url, method: "get" });

      if (shouldRetry) {
        lastError = createHttpError(response.status, url, "get");
        continue;
      }

      const err = createHttpError(response.status, url, "get");
      this._logger.error("Request failed", { url, status: response.status });
      throw err;
    }

    if (lastError) {
      lastError.config = { url, method: "get" };
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
