/**
 * API Key Manager Component
 * Allows users to create, view, and manage their API keys
 */

import React, { useState, useEffect } from "react";
import {
  listAPIKeys,
  createAPIKey,
  deleteAPIKey,
  regenerateAPIKey,
  updateAPIKey,
} from "../../api/apiKeys";
import type { APIKey, APIKeyWithSecret } from "../../api/apiKeys";

interface CreateKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (key: APIKeyWithSecret) => void;
}

const CreateKeyModal: React.FC<CreateKeyModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [name, setName] = useState("");
  const [rateLimit, setRateLimit] = useState(1000);
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const key = await createAPIKey({
        name,
        rate_limit: rateLimit,
        expires_at: expiresAt || undefined,
      });
      onCreated(key);
      setName("");
      setRateLimit(1000);
      setExpiresAt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create API key");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4 dark:text-white">
          Create API Key
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
              placeholder="My API Key"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">
              Rate Limit (requests/hour)
            </label>
            <input
              type="number"
              value={rateLimit}
              onChange={(e) => setRateLimit(parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              min={1}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">
              Expires At (optional)
            </label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
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
              disabled={loading || !name}
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

interface KeyRevealModalProps {
  apiKey: APIKeyWithSecret | null;
  onClose: () => void;
}

const KeyRevealModal: React.FC<KeyRevealModalProps> = ({ apiKey, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!apiKey) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg">
        <h2 className="text-xl font-semibold mb-2 dark:text-white">
          API Key Created
        </h2>

        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 mb-4">
          <p className="text-yellow-800 dark:text-yellow-200 text-sm">
            ⚠️ {apiKey.warning}
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">
            Your API Key
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={apiKey.key}
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

export const APIKeyManager: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKey, setNewKey] = useState<APIKeyWithSecret | null>(null);

  const fetchKeys = async () => {
    try {
      const response = await listAPIKeys();
      setApiKeys(response.api_keys);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load API keys");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this API key?")) return;

    try {
      await deleteAPIKey(id);
      setApiKeys(apiKeys.filter((k) => k.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete API key");
    }
  };

  const handleRegenerate = async (id: string) => {
    if (!confirm("Are you sure? This will invalidate the current key.")) return;

    try {
      const key = await regenerateAPIKey(id);
      setNewKey(key);
      fetchKeys();
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to regenerate API key"
      );
    }
  };

  const handleToggleActive = async (key: APIKey) => {
    try {
      await updateAPIKey(key.id, { is_active: !key.is_active });
      fetchKeys();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update API key");
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">Loading API keys...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">API Keys</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage API keys for external integrations
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Create API Key
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        {apiKeys.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No API keys yet. Create one to get started.
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
                  Key
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
                  Usage
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
                  Last Used
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {apiKeys.map((key) => (
                <tr
                  key={key.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="px-4 py-3 dark:text-white">{key.name}</td>
                  <td className="px-4 py-3 font-mono text-sm text-gray-600 dark:text-gray-400">
                    {key.key_prefix}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(key)}
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        key.is_active
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                      }`}
                    >
                      {key.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {key.request_count.toLocaleString()} /{" "}
                    {key.rate_limit.toLocaleString()}/hr
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(key.last_used_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRegenerate(key.id)}
                        className="text-blue-500 hover:text-blue-700 text-sm"
                      >
                        Regenerate
                      </button>
                      <button
                        onClick={() => handleDelete(key.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h3 className="font-medium mb-2 dark:text-white">API Documentation</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          View the interactive API documentation to learn how to use your API
          keys.
        </p>
        <div className="flex gap-2">
          <a
            href="/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700 text-sm"
          >
            Swagger UI →
          </a>
          <a
            href="/api/docs/redoc"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700 text-sm"
          >
            ReDoc →
          </a>
        </div>
      </div>

      <CreateKeyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(key) => {
          setShowCreateModal(false);
          setNewKey(key);
          fetchKeys();
        }}
      />

      <KeyRevealModal apiKey={newKey} onClose={() => setNewKey(null)} />
    </div>
  );
};

export default APIKeyManager;
