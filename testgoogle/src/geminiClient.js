const { GoogleGenerativeAI } = require("@google/generative-ai");
const { logRequest, logResponse, logError } = require("./logger");

/**
 * Google Gemini API Client wrapper
 * Provides functions for validating prompts and making API calls
 * with proper error handling and timing measurement
 */

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
    errorMessage.includes("authentication") ||
    errorMessage.includes("API_KEY_INVALID")
  ) {
    return {
      code: "401",
      message: "Неверный API ключ. Проверьте настройки GEMINI_API_KEY",
    };
  }

  // Check for rate limit errors (429)
  if (
    errorMessage.includes("429") ||
    errorMessage.includes("Rate limit") ||
    errorMessage.includes("rate_limit") ||
    errorMessage.includes("RESOURCE_EXHAUSTED")
  ) {
    return {
      code: "429",
      message: "Превышен лимит запросов. Подождите некоторое время",
    };
  }

  // Check for location/region errors
  if (
    errorMessage.includes("location") ||
    errorMessage.includes("not supported") ||
    errorMessage.includes("region")
  ) {
    return {
      code: "403",
      message: "Регион не поддерживается для данного API",
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
      message: "Ошибка сервера Gemini API. Попробуйте позже",
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
 * Send a request to Gemini API and measure response time
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

  // Log the incoming request
  logRequest({
    prompt: request.prompt,
    headers: requestMeta.headers || {},
    clientIp: requestMeta.clientIp || "unknown",
    userAgent: requestMeta.userAgent || "unknown",
  });

  // Check for API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const error = {
      code: "CONFIG_ERROR",
      message: "API ключ не настроен. Установите GEMINI_API_KEY",
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
    // Initialize Gemini client
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Make the API call
    const result = await model.generateContent(request.prompt);
    const response = await result.response;
    const text = response.text();
    const responseTime = Date.now() - startTime;

    console.log(`Gemini 2.5 Flash request successful. Time: ${responseTime}ms`);

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
};
