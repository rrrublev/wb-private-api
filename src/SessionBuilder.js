const { fetch, Agent } = require("undici");
const { stringify } = require("qs");
const Constants = require("./Constants");

class Session {
  constructor(config) {
    this._config = config;
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
    const { params = {}, headers = {}, retryOptions } = options;

    // Сериализация params
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
    const retryCondition = retryOptions?.retryCondition ?? ((status) =>
      status === 429 || status >= 500
    );

    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) {
        const delay = Math.min(Math.pow(2, attempt) * 1000 + Math.random() * 1000, 10000);
        console.log(`Retry attempt ${attempt} for ${url}`);
        await new Promise((r) => setTimeout(r, delay));
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
      } catch (err) {
        lastError = err;
        continue;
      }

      const duration = Date.now() - startTime;
      if (duration > 5000) {
        console.warn(`Slow request detected: ${url} took ${duration}ms`);
      }

      if (response.status >= 200 && response.status < 300) {
        const contentType = response.headers.get("content-type") || "";
        let data;
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
        return { status: response.status, data };
      }

      // Retry условие
      if (attempt < retries && retryCondition(response.status)) {
        lastError = new Error(`Request failed with status code ${response.status}`);
        lastError.response = { status: response.status };
        continue;
      }

      // Финальная ошибка
      const err = new Error(`Request failed with status code ${response.status}`);
      err.response = { status: response.status };
      err.config = { url, method: "get" };
      console.error(`Request failed after ${Date.now() - startTime}ms:`, {
        url,
        method: "get",
        status: response.status,
        message: err.message,
      });
      throw err;
    }

    // Все попытки исчерпаны
    if (lastError) {
      lastError.config = { url, method: "get" };
      throw lastError;
    }
  }
}

class SessionBuilder {
  /**
   * Creates a new Session instance backed by undici fetch.
   * @param {Object} options - Configuration options
   * @param {number} options.timeout - Request timeout in milliseconds (default: 30000)
   * @param {number} options.retries - Number of retry attempts (default: 3)
   * @param {number} options.maxSockets - Maximum number of connections per host (default: 10)
   * @returns {Session} Configured session instance
   */
  static create(options = {}) {
    const config = {
      timeout: options.timeout || 30000,
      retries: options.retries || 3,
      maxSockets: options.maxSockets || 10,
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
