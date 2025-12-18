/**
 * Webhook Manager Component
 * Allows users to create, view, and manage webhooks
 * Requirements: 45.1, 45.2, 45.3
 */

import React, { useState, useEffect } from "react";
import {
  listWebhooks,
  createWebhook,
  deleteWebhook,
  updateWebhook,
  testWebhook,
  regenerateSecret,
  listDeliveries,
} from "../../api/webhooks";
import type { Webhook, WebhookDelivery } from "../../api/webhooks";

interface CreateWebhookModalProps {
  isOpen: boolean;
  availableEvents: Record<string, string>;
  onClose: () => void;
  onCreated: (webhook: Webhook) => void;
}

const CreateWebhookModal: React.FC<CreateWebhookModalProps> = ({
  isOpen,
  availableEvents,
  onClose,
  onCreated,
}) => {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [generateSecretFlag, setGenerateSecretFlag] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const webhook = await createWebhook({
        name,
        url,
        events: selectedEvents,
        generate_secret: generateSecretFlag,
      });
      onCreated(webhook);
      setName("");
      setUrl("");
      setSelectedEvents([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create webhook");
    } finally {
      setLoading(false);
    }
  };

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4 dark:text-white">
          Create Webhook
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="My Webhook"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">
              Endpoint URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="https://example.com/webhook"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 dark:text-gray-300">
              Events to Subscribe
            </label>
            <div className="max-h-48 overflow-y-auto border rounded-lg p-2 dark:border-gray-600">
              {Object.entries(availableEvents).map(([event, description]) => (
                <label
                  key={event}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(event)}
                    onChange={() => toggleEvent(event)}
                    className="rounded"
                  />
                  <div>
                    <div className="text-sm font-medium dark:text-white">
                      {event}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={generateSecretFlag}
                onChange={(e) => setGenerateSecretFlag(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm dark:text-gray-300">
                Generate signing secret for payload verification
              </span>
            </label>
          </div>

          {error && <div className="mb-4 text-red-500 text-sm">{error}</div>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name || !url || selectedEvents.length === 0}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface SecretRevealModalProps {
  webhook: Webhook | null;
  onClose: () => void;
}

const SecretRevealModal: React.FC<SecretRevealModalProps> = ({
  webhook,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (webhook?.secret) {
      navigator.clipboard.writeText(webhook.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!webhook?.secret) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg">
        <h2 className="text-xl font-semibold mb-2 dark:text-white">
          Webhook Secret
        </h2>

        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 mb-4">
          <p className="text-yellow-800 dark:text-yellow-200 text-sm">
            ⚠️ Save this secret now. It will not be shown again.
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">
            Signing Secret
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={webhook.secret}
              readOnly
              className="flex-1 px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono text-sm"
            />
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Use this secret to verify webhook signatures. The signature is sent in
          the{" "}
          <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
            X-Webhook-Signature
          </code>{" "}
          header.
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

interface DeliveryHistoryModalProps {
  webhook: Webhook | null;
  onClose: () => void;
}

const DeliveryHistoryModal: React.FC<DeliveryHistoryModalProps> = ({
  webhook,
  onClose,
}) => {
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (webhook) {
      setLoading(true);
      listDeliveries(webhook.id, { limit: 50 })
        .then((response) => setDeliveries(response.deliveries))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [webhook]);

  if (!webhook) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <h2 className="text-xl font-semibold mb-4 dark:text-white">
          Delivery History - {webhook.name}
        </h2>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : deliveries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No deliveries yet
            </div>
          ) : (
            <div className="space-y-2">
              {deliveries.map((delivery) => (
                <div
                  key={delivery.id}
                  className={`p-3 rounded-lg border ${
                    delivery.success
                      ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
                      : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-medium dark:text-white">
                        {delivery.event_type}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        {new Date(delivery.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {delivery.duration_ms && (
                        <span className="text-xs text-gray-500">
                          {delivery.duration_ms}ms
                        </span>
                      )}
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          delivery.success
                            ? "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200"
                            : "bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200"
                        }`}
                      >
                        {delivery.status_code || "Error"}
                      </span>
                    </div>
                  </div>
                  {delivery.error && (
                    <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                      {delivery.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end mt-4 pt-4 border-t dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export const WebhookManager: React.FC = () => {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [availableEvents, setAvailableEvents] = useState<
    Record<string, string>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWebhook, setNewWebhook] = useState<Webhook | null>(null);
  const [historyWebhook, setHistoryWebhook] = useState<Webhook | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const fetchWebhooks = async () => {
    try {
      const response = await listWebhooks();
      setWebhooks(response.webhooks);
      setAvailableEvents(response.available_events);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load webhooks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this webhook?")) return;

    try {
      await deleteWebhook(id);
      setWebhooks(webhooks.filter((w) => w.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete webhook");
    }
  };

  const handleToggleActive = async (webhook: Webhook) => {
    try {
      await updateWebhook(webhook.id, { is_active: !webhook.is_active });
      fetchWebhooks();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update webhook");
    }
  };

  const handleTest = async (webhook: Webhook) => {
    setTestingId(webhook.id);
    try {
      const result = await testWebhook(webhook.id);
      if (result.success) {
        alert("Test webhook sent successfully!");
      } else {
        alert(
          `Test failed: ${
            result.delivery.error || `HTTP ${result.delivery.status_code}`
          }`
        );
      }
      fetchWebhooks();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to test webhook");
    } finally {
      setTestingId(null);
    }
  };

  const handleRegenerateSecret = async (webhook: Webhook) => {
    if (!confirm("Are you sure? This will invalidate the current secret."))
      return;

    try {
      const result = await regenerateSecret(webhook.id);
      setNewWebhook({ ...webhook, secret: result.secret });
      fetchWebhooks();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to regenerate secret");
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">Loading webhooks...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Webhooks</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configure webhooks to receive event notifications
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Create Webhook
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        {webhooks.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No webhooks configured. Create one to receive event notifications.
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {webhooks.map((webhook) => (
              <div key={webhook.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium dark:text-white">
                        {webhook.name}
                      </h3>
                      <button
                        onClick={() => handleToggleActive(webhook)}
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          webhook.is_active
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                        }`}
                      >
                        {webhook.is_active ? "Active" : "Inactive"}
                      </button>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-mono truncate">
                      {webhook.url}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {webhook.events.map((event) => (
                        <span
                          key={event}
                          className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400"
                        >
                          {event}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>
                        Last triggered: {formatDate(webhook.last_triggered_at)}
                      </span>
                      <span className="text-green-600 dark:text-green-400">
                        ✓ {webhook.success_count}
                      </span>
                      <span className="text-red-600 dark:text-red-400">
                        ✗ {webhook.failure_count}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleTest(webhook)}
                      disabled={testingId === webhook.id}
                      className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
                    >
                      {testingId === webhook.id ? "Testing..." : "Test"}
                    </button>
                    <button
                      onClick={() => setHistoryWebhook(webhook)}
                      className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      History
                    </button>
                    <button
                      onClick={() => handleRegenerateSecret(webhook)}
                      className="px-3 py-1 text-sm text-blue-500 hover:text-blue-700"
                    >
                      Regenerate Secret
                    </button>
                    <button
                      onClick={() => handleDelete(webhook.id)}
                      className="px-3 py-1 text-sm text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateWebhookModal
        isOpen={showCreateModal}
        availableEvents={availableEvents}
        onClose={() => setShowCreateModal(false)}
        onCreated={(webhook) => {
          setShowCreateModal(false);
          if (webhook.secret) {
            setNewWebhook(webhook);
          }
          fetchWebhooks();
        }}
      />

      <SecretRevealModal
        webhook={newWebhook}
        onClose={() => setNewWebhook(null)}
      />
      <DeliveryHistoryModal
        webhook={historyWebhook}
        onClose={() => setHistoryWebhook(null)}
      />
    </div>
  );
};

export default WebhookManager;
