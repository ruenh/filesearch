const { v4: uuidv4 } = require("uuid");

/**
 * In-memory history store for API request/response history
 * Maintains a maximum of 50 most recent items
 */

const MAX_HISTORY_SIZE = 50;

// In-memory storage array
let history = [];

/**
 * Add a new item to history
 * @param {Object} item - History item to add
 * @param {Object} item.request - Request data
 * @param {string} item.request.prompt - The prompt text
 * @param {Object} item.response - Response data
 * @param {boolean} item.response.success - Whether request succeeded
 * @param {string|null} item.response.data - Response data if successful
 * @param {string|null} item.response.error - Error message if failed
 * @param {number} item.response.statusCode - HTTP status code
 * @param {number} item.responseTime - Response time in ms
 * @returns {Object} The created history item with id and timestamp
 */
function addToHistory(item) {
  const historyItem = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    request: item.request,
    response: item.response,
    responseTime: item.responseTime,
  };

  // Add to beginning of array (most recent first)
  history.unshift(historyItem);

  // Enforce limit - remove oldest items if over limit
  if (history.length > MAX_HISTORY_SIZE) {
    history = history.slice(0, MAX_HISTORY_SIZE);
  }

  return historyItem;
}

/**
 * Get history items
 * @param {number} [limit=50] - Maximum number of items to return
 * @returns {Array} Array of history items sorted by timestamp descending
 */
function getHistory(limit = MAX_HISTORY_SIZE) {
  const effectiveLimit = Math.min(limit, MAX_HISTORY_SIZE);
  return history.slice(0, effectiveLimit);
}

/**
 * Get a specific history item by ID
 * @param {string} id - The history item ID
 * @returns {Object|null} The history item or null if not found
 */
function getHistoryItem(id) {
  return history.find((item) => item.id === id) || null;
}

/**
 * Clear all history (useful for testing)
 */
function clearHistory() {
  history = [];
}

/**
 * Get current history size (useful for testing)
 * @returns {number} Current number of items in history
 */
function getHistorySize() {
  return history.length;
}

module.exports = {
  addToHistory,
  getHistory,
  getHistoryItem,
  clearHistory,
  getHistorySize,
  MAX_HISTORY_SIZE,
};
