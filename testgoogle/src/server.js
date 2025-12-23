require("dotenv").config();

const express = require("express");
const path = require("path");
const { checkGemini } = require("./geminiClient");
const { addToHistory, getHistory, getHistoryItem } = require("./historyStore");
const { logRequest, logStartup, getLogs } = require("./logger");

const app = express();
const PORT = process.env.PORT || 3000;

// Track server start time for uptime calculation
const serverStartTime = Date.now();

// Middleware for JSON parsing
app.use(express.json());

// Middleware for static files
app.use(express.static(path.join(__dirname, "..", "public")));

// Middleware for logging incoming requests (IP, User-Agent)
// Requirements: 5.2
app.use((req, res, next) => {
  const clientIp = req.ip || req.connection.remoteAddress || "unknown";
  const userAgent = req.get("User-Agent") || "unknown";

  // Store in request for later use
  req.clientIp = clientIp;
  req.userAgent = userAgent;

  next();
});

/**
 * POST /api/check - Send request to Gemini API
 * Requirements: 1.1, 1.2, 1.3, 4.1
 */
app.post("/api/check", async (req, res) => {
  const { prompt } = req.body;

  // Call Gemini API with request metadata
  const result = await checkGemini(
    { prompt },
    {
      headers: {
        "content-type": req.get("Content-Type"),
        accept: req.get("Accept"),
      },
      clientIp: req.clientIp,
      userAgent: req.userAgent,
    }
  );

  // Save to history (Requirements: 4.1)
  const historyItem = addToHistory({
    request: { prompt },
    response: {
      success: result.success,
      data: result.response || null,
      error: result.error ? result.error.message : null,
      statusCode: result.success ? 200 : parseInt(result.error?.code) || 500,
    },
    responseTime: result.responseTime,
  });

  // Return response with history ID
  res.json({
    ...result,
    historyId: historyItem.id,
  });
});

/**
 * GET /api/history - Get request history
 * Requirements: 4.2
 */
app.get("/api/history", (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const history = getHistory(limit);
  res.json(history);
});

/**
 * GET /api/history/:id - Get specific history item
 * Requirements: 4.3
 */
app.get("/api/history/:id", (req, res) => {
  const item = getHistoryItem(req.params.id);
  if (!item) {
    return res.status(404).json({ error: "History item not found" });
  }
  res.json(item);
});

/**
 * GET /api/logs - Get logs with optional filtering
 * Requirements: 3.5
 */
app.get("/api/logs", (req, res) => {
  const filter = {};
  if (req.query.level) {
    filter.level = req.query.level;
  }
  const logs = getLogs(filter);
  res.json(logs);
});

/**
 * GET /health - Health check endpoint
 * Requirements: 5.3
 */
app.get("/health", (req, res) => {
  const uptime = Date.now() - serverStartTime;
  res.json({
    status: "ok",
    uptime: uptime,
    uptimeFormatted: formatUptime(uptime),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Format uptime in human-readable format
 * @param {number} ms - Uptime in milliseconds
 * @returns {string} Formatted uptime string
 */
function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

// Start server
app.listen(PORT, () => {
  // Log startup (Requirements: 3.4)
  logStartup({
    port: PORT,
    apiKeyConfigured: !!process.env.GEMINI_API_KEY,
  });

  console.log("=".repeat(50));
  console.log("Gemini API Checker - Server Started");
  console.log("=".repeat(50));
  console.log(`Startup time: ${new Date().toISOString()}`);
  console.log(`Server URL: http://localhost:${PORT}`);
  console.log(
    `API Key: ${process.env.GEMINI_API_KEY ? "configured" : "NOT CONFIGURED"}`
  );
  console.log(`Node.js: ${process.version}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log("=".repeat(50));
});

module.exports = app;
