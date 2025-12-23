/**
 * Gemini API Checker - Frontend Application
 * Requirements: 1.1, 1.3, 1.4, 2.2
 */

// DOM Elements
const promptForm = document.getElementById("promptForm");
const promptInput = document.getElementById("promptInput");
const submitBtn = document.getElementById("submitBtn");
const btnText = submitBtn.querySelector(".btn-text");
const btnLoader = submitBtn.querySelector(".btn-loader");

const resultSection = document.getElementById("resultSection");
const resultContent = document.getElementById("resultContent");
const resultMeta = document.getElementById("resultMeta");

const errorSection = document.getElementById("errorSection");
const errorContent = document.getElementById("errorContent");

const historyList = document.getElementById("historyList");
const logsList = document.getElementById("logsList");
const logLevelFilter = document.getElementById("logLevelFilter");
const refreshLogsBtn = document.getElementById("refreshLogsBtn");

const historyModal = document.getElementById("historyModal");
const modalClose = document.getElementById("modalClose");
const modalBody = document.getElementById("modalBody");

/**
 * Show loading state
 */
function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  btnText.textContent = isLoading ? "Отправка..." : "Отправить";
  btnLoader.hidden = !isLoading;
  promptForm.classList.toggle("loading", isLoading);
}

/**
 * Show result section
 */
function showResult(response) {
  resultSection.hidden = false;
  errorSection.hidden = true;
  resultContent.textContent = response.response;
  resultMeta.textContent = `Время ответа: ${response.responseTime}ms`;
}

/**
 * Show error section
 * Requirements: 1.3, 2.2
 */
function showError(error) {
  resultSection.hidden = true;
  errorSection.hidden = false;

  let message = error.message || "Неизвестная ошибка";
  if (error.code) {
    message = `[${error.code}] ${message}`;
  }
  errorContent.textContent = message;
}

/**
 * Hide all result/error sections
 */
function hideResults() {
  resultSection.hidden = true;
  errorSection.hidden = true;
}

/**
 * Send prompt to API
 * Requirements: 1.1
 */
async function sendPrompt(prompt) {
  const response = await fetch("/api/check", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  return response.json();
}

/**
 * Handle form submission
 * Requirements: 1.1, 1.4
 */
async function handleSubmit(event) {
  event.preventDefault();

  const prompt = promptInput.value.trim();

  // Client-side validation
  if (!prompt) {
    showError({ code: "VALIDATION_ERROR", message: "Введите текст запроса" });
    return;
  }

  setLoading(true);
  hideResults();

  try {
    const result = await sendPrompt(prompt);

    if (result.success) {
      showResult(result);
    } else {
      showError(result.error);
    }

    // Refresh history after request
    await loadHistory();
  } catch (err) {
    showError({
      code: "NETWORK_ERROR",
      message: "Ошибка сети. Проверьте подключение",
    });
  } finally {
    setLoading(false);
  }
}

/**
 * Format timestamp for display
 */
function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Format short time for logs
 */
function formatShortTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Load and display history
 * Requirements: 4.2
 */
async function loadHistory() {
  try {
    const response = await fetch("/api/history");
    const history = await response.json();

    if (history.length === 0) {
      historyList.innerHTML = '<p class="empty-message">История пуста</p>';
      return;
    }

    historyList.innerHTML = history
      .map(
        (item) => `
            <div class="history-item" data-id="${item.id}">
                <div class="history-item-header">
                    <span class="history-item-time">${formatTime(
                      item.timestamp
                    )}</span>
                    <span class="history-item-status ${
                      item.response.success ? "success" : "error"
                    }">
                        ${item.response.success ? "OK" : "Ошибка"}
                    </span>
                </div>
                <div class="history-item-prompt">${escapeHtml(
                  item.request.prompt
                )}</div>
                <div class="history-item-meta">${item.responseTime}ms</div>
            </div>
        `
      )
      .join("");

    // Add click handlers
    historyList.querySelectorAll(".history-item").forEach((el) => {
      el.addEventListener("click", () => showHistoryDetails(el.dataset.id));
    });
  } catch (err) {
    historyList.innerHTML =
      '<p class="empty-message">Ошибка загрузки истории</p>';
  }
}

/**
 * Show history item details in modal
 * Requirements: 4.3
 */
async function showHistoryDetails(id) {
  try {
    const response = await fetch(`/api/history/${id}`);
    if (!response.ok) {
      throw new Error("Not found");
    }
    const item = await response.json();

    modalBody.innerHTML = `
            <div class="detail-section">
                <h4>Время</h4>
                <p>${formatTime(item.timestamp)}</p>
            </div>
            <div class="detail-section">
                <h4>Промпт</h4>
                <pre>${escapeHtml(item.request.prompt)}</pre>
            </div>
            <div class="detail-section">
                <h4>Статус</h4>
                <p>${item.response.success ? "✅ Успешно" : "❌ Ошибка"}</p>
            </div>
            <div class="detail-section">
                <h4>Ответ</h4>
                <pre>${escapeHtml(
                  item.response.data || item.response.error || "Нет данных"
                )}</pre>
            </div>
            <div class="detail-section">
                <h4>Время ответа</h4>
                <p>${item.responseTime}ms</p>
            </div>
        `;

    historyModal.hidden = false;
  } catch (err) {
    alert("Не удалось загрузить детали запроса");
  }
}

/**
 * Close modal
 */
function closeModal() {
  historyModal.hidden = true;
}

/**
 * Load and display logs
 * Requirements: 3.5
 */
async function loadLogs() {
  try {
    const level = logLevelFilter.value;
    const url = level ? `/api/logs?level=${level}` : "/api/logs";
    const response = await fetch(url);
    const logs = await response.json();

    if (logs.length === 0) {
      logsList.innerHTML = '<p class="empty-message">Логи пусты</p>';
      return;
    }

    logsList.innerHTML = logs
      .map(
        (log) => `
            <div class="log-entry">
                <span class="log-time">${formatShortTime(log.timestamp)}</span>
                <span class="log-level ${log.level}">${log.level}</span>
                <span class="log-type">[${log.type || "log"}]</span>
                <span class="log-message">${escapeHtml(log.message)}</span>
            </div>
        `
      )
      .join("");
  } catch (err) {
    logsList.innerHTML = '<p class="empty-message">Ошибка загрузки логов</p>';
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Event Listeners
promptForm.addEventListener("submit", handleSubmit);
modalClose.addEventListener("click", closeModal);
historyModal.addEventListener("click", (e) => {
  if (e.target === historyModal) closeModal();
});
logLevelFilter.addEventListener("change", loadLogs);
refreshLogsBtn.addEventListener("click", loadLogs);

// Close modal on Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !historyModal.hidden) {
    closeModal();
  }
});

// Initial load
document.addEventListener("DOMContentLoaded", () => {
  loadHistory();
  loadLogs();
});
