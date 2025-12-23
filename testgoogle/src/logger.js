const winston = require("winston");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

// In-memory log storage for retrieval via API
const logStore = [];
const MAX_LOG_ENTRIES = 1000;

// Custom format for structured logging
const structuredFormat = winston.format.printf(
  ({ level, message, timestamp, ...metadata }) => {
    const logEntry = {
      timestamp,
      level,
      message,
      ...metadata,
    };
    return JSON.stringify(logEntry);
  }
);

// Create Winston logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DDTHH:mm:ss.SSSZ" }),
    winston.format.errors({ stack: true }),
    structuredFormat
  ),
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: "YYYY-MM-DDTHH:mm:ss.SSSZ" }),
        winston.format.printf(({ level, message, timestamp, ...metadata }) => {
          const meta = Object.keys(metadata).length
            ? ` ${JSON.stringify(metadata)}`
            : "";
          return `${timestamp} [${level}]: ${message}${meta}`;
        })
      ),
    }),
    // File transport
    new winston.transports.File({
      filename: path.join(process.cwd(), "logs", "app.log"),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

/**
 * Add log entry to in-memory store
 * @param {Object} entry - Log entry to store
 */
function addToLogStore(entry) {
  logStore.push(entry);
  // Keep only the most recent entries
  if (logStore.length > MAX_LOG_ENTRIES) {
    logStore.shift();
  }
}

/**
 * Log an incoming request to Gemini API
 * Requirements: 3.1, 5.2
 * @param {Object} data - Request data
 * @param {string} data.prompt - The prompt text
 * @param {Object} data.headers - Request headers
 * @param {string} data.clientIp - Client IP address
 * @param {string} data.userAgent - User agent string
 */
function logRequest(data) {
  const entry = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    level: "info",
    type: "request",
    message: "Incoming request to Gemini API",
    prompt: data.prompt,
    headers: data.headers || {},
    clientIp: data.clientIp,
    userAgent: data.userAgent,
  };

  logger.info(entry.message, {
    id: entry.id,
    type: entry.type,
    prompt: entry.prompt,
    headers: entry.headers,
    clientIp: entry.clientIp,
    userAgent: entry.userAgent,
  });

  addToLogStore(entry);
  return entry;
}

/**
 * Log a response from Gemini API
 * Requirements: 3.2
 * @param {Object} data - Response data
 * @param {number} data.statusCode - HTTP status code
 * @param {number} data.responseTime - Response time in milliseconds
 * @param {string} data.body - Response body
 */
function logResponse(data) {
  const entry = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    level: "info",
    type: "response",
    message: "Response from Gemini API",
    statusCode: data.statusCode,
    responseTime: data.responseTime,
    body: data.body,
  };

  logger.info(entry.message, {
    id: entry.id,
    type: entry.type,
    statusCode: entry.statusCode,
    responseTime: entry.responseTime,
    body: entry.body,
  });

  addToLogStore(entry);
  return entry;
}

/**
 * Log an error
 * Requirements: 3.3
 * @param {Object} data - Error data
 * @param {string} data.errorType - Type of error
 * @param {string} data.errorMessage - Error message
 * @param {string} data.stackTrace - Stack trace
 */
function logError(data) {
  const entry = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    level: "error",
    type: "error",
    message: "Error occurred",
    errorType: data.errorType,
    errorMessage: data.errorMessage,
    stackTrace: data.stackTrace,
  };

  logger.error(entry.message, {
    id: entry.id,
    type: entry.type,
    errorType: entry.errorType,
    errorMessage: entry.errorMessage,
    stackTrace: entry.stackTrace,
  });

  addToLogStore(entry);
  return entry;
}

/**
 * Log server startup
 * Requirements: 3.4
 * @param {Object} data - Startup data
 * @param {number} data.port - Server port
 * @param {boolean} data.apiKeyConfigured - Whether API key is configured
 */
function logStartup(data) {
  const startupTime = new Date().toISOString();
  const configStatus = data.apiKeyConfigured ? "configured" : "missing";

  const entry = {
    id: uuidv4(),
    timestamp: startupTime,
    level: "info",
    type: "startup",
    message: `Server started on port ${data.port}`,
    port: data.port,
    apiKeyConfigured: data.apiKeyConfigured,
    configurationStatus: configStatus,
    startupTime: startupTime,
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || "development",
  };

  logger.info(entry.message, {
    id: entry.id,
    type: entry.type,
    port: entry.port,
    apiKeyConfigured: entry.apiKeyConfigured,
    configurationStatus: entry.configurationStatus,
    startupTime: entry.startupTime,
    nodeVersion: entry.nodeVersion,
    environment: entry.environment,
  });

  addToLogStore(entry);
  return entry;
}

/**
 * Get logs with optional filtering
 * Requirements: 3.5
 * @param {Object} filter - Filter options
 * @param {string} filter.level - Filter by log level
 * @returns {Array} - Array of log entries sorted chronologically
 */
function getLogs(filter = {}) {
  let logs = [...logStore];

  // Filter by level if specified
  if (filter.level) {
    logs = logs.filter((log) => log.level === filter.level);
  }

  // Sort by timestamp chronologically (oldest first)
  logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return logs;
}

/**
 * Clear all logs from memory (useful for testing)
 */
function clearLogs() {
  logStore.length = 0;
}

/**
 * Get the raw Winston logger instance
 */
function getLogger() {
  return logger;
}

module.exports = {
  logRequest,
  logResponse,
  logError,
  logStartup,
  getLogs,
  clearLogs,
  getLogger,
};
