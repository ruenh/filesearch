const Groq = require("groq-sdk");
const { logRequest, logResponse, logError } = require("./logger");

/**
 * Groq API Client wrapper
 * Provides functions for validating prompts and making API calls
 * with proper error handling and timing measurement
 */

// Rate limiting
const DAILY_LIMIT = 14400;
let requestCount = 0;
let lastResetTime = Date.now();

/**
 * Validate a prompt string
 * @param {string} prompt - The prompt to validate
 * @returns {Object} Validation result with isValid and error properties
 */
function validatePrompt(prompt) {
  if (prompt === null || prompt === undefined || typeof prompt !== "string") {
    return {
      isValid: false,
      error: "Введите текст запроса",
    };
  }

  if (prompt.trim().length === 0) {
    return {
      isValid: false,
      error: "Введите текст запроса",
    };
  }

  return {
    isValid: true,
    error: null,
  };
}

/**
 * Map API error to user-friendly response
 * @param {Error} error - The error object
 * @returns {Object} Error response with code and message
 */
function mapApiError(error) {
  const errorMessage = error.message || "";
  const errorString = error.toString();

  // Check for authentication errors (401)
  if (
    errorMessage.includes("API key") ||
    errorMessage.includes("401") ||
    errorMessage.includes("Unauthorized") ||
    errorMessage.includes("authentication")
  ) {
    return {
      code: "401",
      message: "Неверный API ключ. Проверьте настройки GROQ_API_KEY",
    };
  }

  // Check for rate limit errors (429)
  if (
    errorMessage.includes("429") ||
    errorMessage.includes("Rate limit") ||
    errorMessage.includes("rate_limit")
  ) {
    return {
      code: "429",
      message: "Превышен лимит запросов. Подождите некоторое время",
    };
  }

  // Check for server errors (500)
  if (
    errorMessage.includes("500") ||
    errorMessage.includes("Internal") ||
    errorMessage.includes("server_error")
  ) {
    return {
      code: "500",
      message: "Ошибка сервера Groq API. Попробуйте позже",
    };
  }

  // Check for network errors
  if (
    errorMessage.includes("network") ||
    errorMessage.includes("ENOTFOUND") ||
    errorMessage.includes("ECONNREFUSED") ||
    errorMessage.includes("ETIMEDOUT") ||
    errorMessage.includes("fetch failed") ||
    errorString.includes("TypeError")
  ) {
    return {
      code: "NETWORK_ERROR",
      message: "Ошибка сети. Проверьте подключение к интернету",
    };
  }

  // Default error
  return {
    code: "UNKNOWN",
    message: error.message || "Неизвестная ошибка",
  };
}

/**
 * Check and reset daily limit if needed
 */
function checkDailyLimit() {
  const now = Date.now();
  const timeSinceReset = now - lastResetTime;

  // Reset counter after 24 hours
  if (timeSinceReset >= 86400000) {
    requestCount = 0;
    lastResetTime = now;
  }

  if (requestCount >= DAILY_LIMIT) {
    const minutesLeft = Math.ceil((86400000 - timeSinceReset) / 1000 / 60);
    return {
      allowed: false,
      error: `Дневной лимит исчерпан (${DAILY_LIMIT} запросов). Сброс через ${minutesLeft} минут`,
    };
  }

  return { allowed: true };
}

/**
 * Get current rate limit status
 */
function getRateLimitStatus() {
  return {
    requestCount,
    dailyLimit: DAILY_LIMIT,
    remaining: DAILY_LIMIT - requestCount,
    resetTime: new Date(lastResetTime + 86400000).toISOString(),
  };
}

/**
 * Send a request to Groq API and measure response time
 * @param {Object} request - Request object
 * @param {string} request.prompt - The prompt text
 * @param {Object} [requestMeta] - Optional request metadata for logging
 * @returns {Promise<Object>} Response object with success, response/error, and responseTime
 */
async function checkGemini(request, requestMeta = {}) {
  const startTime = Date.now();

  // Validate prompt first
  const validation = validatePrompt(request.prompt);
  if (!validation.isValid) {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: validation.error,
      },
      responseTime: Date.now() - startTime,
    };
  }

  // Check daily limit
  const limitCheck = checkDailyLimit();
  if (!limitCheck.allowed) {
    return {
      success: false,
      error: {
        code: "RATE_LIMIT",
        message: limitCheck.error,
      },
      responseTime: Date.now() - startTime,
    };
  }

  // Log the incoming request
  logRequest({
    prompt: request.prompt,
    headers: requestMeta.headers || {},
    clientIp: requestMeta.clientIp || "unknown",
    userAgent: requestMeta.userAgent || "unknown",
  });

  // Check for API key
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    const error = {
      code: "CONFIG_ERROR",
      message: "API ключ не настроен. Установите GROQ_API_KEY",
    };

    logError({
      errorType: "ConfigurationError",
      errorMessage: error.message,
      stackTrace: new Error().stack,
    });

    return {
      success: false,
      error,
      responseTime: Date.now() - startTime,
    };
  }

  try {
    // Initialize Groq client
    const groq = new Groq({ apiKey });

    // Make the API call
    const response = await groq.chat.completions.create({
      messages: [{ role: "user", content: request.prompt }],
      model: "llama-3.3-70b-versatile",
      max_tokens: 1024,
      temperature: 0.7,
    });

    const text = response.choices[0].message.content;
    const responseTime = Date.now() - startTime;

    // Increment request counter
    requestCount++;
    console.log(
      `Groq request successful. Count: ${requestCount}/${DAILY_LIMIT}`
    );

    // Log successful response
    logResponse({
      statusCode: 200,
      responseTime,
      body: text,
    });

    return {
      success: true,
      response: text,
      responseTime,
      rateLimit: getRateLimitStatus(),
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const mappedError = mapApiError(error);

    // Log the error
    logError({
      errorType: error.constructor.name || "Error",
      errorMessage: error.message,
      stackTrace: error.stack || new Error().stack,
    });

    // Log error response
    logResponse({
      statusCode: parseInt(mappedError.code) || 500,
      responseTime,
      body: JSON.stringify(mappedError),
    });

    return {
      success: false,
      error: mappedError,
      responseTime,
    };
  }
}

module.exports = {
  validatePrompt,
  checkGemini,
  mapApiError,
  getRateLimitStatus,
};
