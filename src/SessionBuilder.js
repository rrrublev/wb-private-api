const Axios = require("axios").default;
const https = require("https");
const http = require("http");
const { parse, stringify } = require("qs");
const Constants = require("./Constants");
const { default: axiosRetry } = require("axios-retry");

class SessionBuilder {
  /**
   * Creates a new optimized Axios instance with advanced configuration
   * @param {Object} options - Configuration options
   * @param {number} options.timeout - Request timeout in milliseconds (default: 30000)
   * @param {number} options.retries - Number of retry attempts (default: 3)
   * @param {string} options.userAgent - Custom User-Agent string
   * @param {number} options.maxSockets - Maximum number of sockets per host (default: 10)
   * @param {boolean} options.enableRetry - Enable automatic retry logic (default: true)
   * @returns {Object} Configured Axios instance
   */
  static create(options = {}) {
    const config = {
      timeout: options.timeout || 30000,
      retries: options.retries || 3,
      userAgent: options.userAgent || Constants.USERAGENT,
      maxSockets: options.maxSockets || 10,
      enableRetry: options.enableRetry !== false,
      ...options
    };

    const session = Axios.create({
      timeout: config.timeout,
      httpAgent: new http.Agent({ 
        keepAlive: true,
        maxSockets: config.maxSockets,
        timeout: config.timeout
      }),
      httpsAgent: new https.Agent({ 
        keepAlive: true,
        maxSockets: config.maxSockets,
        timeout: config.timeout
      }),
      paramsSerializer: {
        serialize: (p) => stringify(p, { arrayFormat: "comma" }),
        encode: parse,
      },
      headers: {
        "User-Agent": config.userAgent,
        "Accept-Encoding": "gzip, deflate, br",
        "Accept": "application/json, text/plain, */*",
        "Cache-Control": "no-cache",
      },
      // Улучшенная обработка ответов
      validateStatus: (status) => {
        return status >= 200 && status < 300;
      },
    });

    // Настройка retry логики
    if (config.enableRetry) {
      axiosRetry(session, {
        retries: config.retries,
        retryDelay: (retryCount, error) => {
          // Экспоненциальная задержка с jitter
          const baseDelay = Math.pow(2, retryCount) * 1000;
          const jitter = Math.random() * 1000;
          return Math.min(baseDelay + jitter, 10000); // Максимум 10 секунд
        },
        retryCondition: (error) => {
          // Retry на сетевые ошибки и серверные ошибки
          return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
                 (error.response && error.response.status >= 500) ||
                 (error.response && error.response.status === 429); // Rate limiting
        },
        onRetry: (retryCount, error, requestConfig) => {
          console.log(`Retry attempt ${retryCount} for ${requestConfig.url}: ${error.message}`);
        }
      });
    }

    // Добавляем interceptors для логирования и обработки ошибок
    session.interceptors.request.use(
      (config) => {
        config.metadata = { startTime: Date.now() };
        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error.message);
        return Promise.reject(error);
      }
    );

    session.interceptors.response.use(
      (response) => {
        const duration = Date.now() - response.config.metadata.startTime;
        if (duration > 5000) { // Логируем медленные запросы
          console.warn(`Slow request detected: ${response.config.url} took ${duration}ms`);
        }
        return response;
      },
      (error) => {
        const duration = error.config?.metadata ? 
          Date.now() - error.config.metadata.startTime : 0;
        
        console.error(`Request failed after ${duration}ms:`, {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          message: error.message
        });
        
        return Promise.reject(error);
      }
    );

    return session;
  }

  /**
   * Creates a session with rate limiting capabilities
   * @param {Object} rateLimitOptions - Rate limiting configuration
   * @param {number} rateLimitOptions.maxRequests - Maximum requests per window
   * @param {number} rateLimitOptions.windowMs - Time window in milliseconds
   * @returns {Object} Axios instance with rate limiting
   */
  static createWithRateLimit(rateLimitOptions = {}) {
    const session = this.create();
    const rateLimiter = new RateLimiter(
      rateLimitOptions.maxRequests || 10,
      rateLimitOptions.windowMs || 1000
    );

    // Добавляем rate limiting interceptor
    session.interceptors.request.use(async (config) => {
      await rateLimiter.waitIfNeeded();
      return config;
    });

    return session;
  }
}

/**
 * Simple rate limiter implementation
 */
class RateLimiter {
  constructor(maxRequests = 10, windowMs = 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  async waitIfNeeded() {
    const now = Date.now();
    
    // Очищаем старые запросы
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest) + 100; // +100ms буфер
      
      if (waitTime > 0) {
        console.log(`Rate limit reached, waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    this.requests.push(now);
  }

  getStats() {
    const now = Date.now();
    const recentRequests = this.requests.filter(time => now - time < this.windowMs);
    
    return {
      currentRequests: recentRequests.length,
      maxRequests: this.maxRequests,
      windowMs: this.windowMs,
      canMakeRequest: recentRequests.length < this.maxRequests
    };
  }
}

module.exports = SessionBuilder;
