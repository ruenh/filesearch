import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { promptsApi } from "../../api/prompts";

const PROMPT_TYPES = [
  {
    id: "chat",
    label: "RAG Чат",
    description: "Промпт для ответов на вопросы по документам",
  },
  {
    id: "summarize",
    label: "Суммаризация",
    description: "Промпт для создания краткого содержания",
  },
  {
    id: "translate",
    label: "Перевод",
    description: "Промпт для перевода документов",
  },
  {
    id: "compare",
    label: "Сравнение",
    description: "Промпт для сравнения документов",
  },
  { id: "tags", label: "Теги", description: "Промпт для генерации тегов" },
];

export function PromptSettings() {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState("chat");
  const [newPromptName, setNewPromptName] = useState("");
  const [newPromptText, setNewPromptText] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [discussMessage, setDiscussMessage] = useState("");
  const [discussResponse, setDiscussResponse] = useState("");
  const [showDiscuss, setShowDiscuss] = useState(false);

  const { data } = useQuery({
    queryKey: ["prompts"],
    queryFn: () => promptsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: promptsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
      setShowCreateForm(false);
      setNewPromptName("");
      setNewPromptText("");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof promptsApi.update>[1];
    }) => promptsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: promptsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
    },
  });

  const discussMutation = useMutation({
    mutationFn: promptsApi.discuss,
    onSuccess: (data) => {
      setDiscussResponse(data.response);
    },
  });

  const resetMutation = useMutation({
    mutationFn: promptsApi.resetToDefault,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompts"] });
    },
  });

  const filteredPrompts =
    data?.prompts.filter((p) => p.prompt_type === selectedType) || [];
  const defaultPrompt = data?.defaults[selectedType] || "";
  const activePrompt = filteredPrompts.find((p) => p.is_active);

  const handleCreate = () => {
    if (!newPromptName.trim() || !newPromptText.trim()) return;
    createMutation.mutate({
      prompt_type: selectedType,
      name: newPromptName,
      system_prompt: newPromptText,
      is_active: true,
    });
  };

  const handleDiscuss = () => {
    if (!discussMessage.trim()) return;
    discussMutation.mutate({
      prompt_type: selectedType,
      current_prompt: activePrompt?.system_prompt || defaultPrompt,
      message: discussMessage,
    });
  };

  const handleApplySuggestion = () => {
    if (discussResponse) {
      setNewPromptText(discussResponse);
      setShowDiscuss(false);
      setShowCreateForm(true);
      setNewPromptName("AI Suggested Prompt");
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Настройка AI промптов</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Настройте системные промпты для различных AI функций. Вы можете
          создать свои промпты или обсудить их с AI.
        </p>

        {/* Type selector */}
        <div className="flex flex-wrap gap-2 mb-6">
          {PROMPT_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedType === type.id
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Current prompt info */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-gray-900 dark:text-white">
              {PROMPT_TYPES.find((t) => t.id === selectedType)?.label}
            </h3>
            <span
              className={`px-2 py-1 text-xs rounded ${
                activePrompt
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
              }`}
            >
              {activePrompt ? "Кастомный" : "По умолчанию"}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            {PROMPT_TYPES.find((t) => t.id === selectedType)?.description}
          </p>
          <pre className="text-sm bg-white dark:bg-gray-900 p-3 rounded border dark:border-gray-700 overflow-x-auto whitespace-pre-wrap">
            {activePrompt?.system_prompt || defaultPrompt}
          </pre>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="btn btn-primary"
          >
            {showCreateForm ? "Отмена" : "Создать промпт"}
          </button>
          <button
            onClick={() => setShowDiscuss(!showDiscuss)}
            className="btn btn-secondary flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            Обсудить с AI
          </button>
          {activePrompt && (
            <button
              onClick={() => resetMutation.mutate(selectedType)}
              className="btn btn-secondary"
            >
              Сбросить к умолчанию
            </button>
          )}
        </div>

        {/* Create form */}
        {showCreateForm && (
          <div className="mb-6 p-4 border dark:border-gray-700 rounded-lg">
            <h3 className="font-medium mb-3">Новый промпт</h3>
            <input
              type="text"
              value={newPromptName}
              onChange={(e) => setNewPromptName(e.target.value)}
              placeholder="Название промпта"
              className="input mb-3"
            />
            <textarea
              value={newPromptText}
              onChange={(e) => setNewPromptText(e.target.value)}
              placeholder="Текст системного промпта..."
              rows={6}
              className="input mb-3"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="btn btn-primary"
              >
                {createMutation.isPending
                  ? "Сохранение..."
                  : "Сохранить и активировать"}
              </button>
              <button
                onClick={() => setNewPromptText(defaultPrompt)}
                className="btn btn-secondary"
              >
                Вставить дефолтный
              </button>
            </div>
          </div>
        )}

        {/* Discuss with AI */}
        {showDiscuss && (
          <div className="mb-6 p-4 border dark:border-gray-700 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              Обсудить промпт с AI
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Опишите что вы хотите улучшить или какой результат получить. AI
              поможет создать оптимальный промпт.
            </p>
            <textarea
              value={discussMessage}
              onChange={(e) => setDiscussMessage(e.target.value)}
              placeholder="Например: Сделай промпт более структурированным, добавь форматирование ответа в виде списка..."
              rows={3}
              className="input mb-3"
            />
            <button
              onClick={handleDiscuss}
              disabled={discussMutation.isPending || !discussMessage.trim()}
              className="btn btn-primary mb-3"
            >
              {discussMutation.isPending ? "AI думает..." : "Спросить AI"}
            </button>

            {discussResponse && (
              <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded border dark:border-gray-700">
                <h4 className="font-medium mb-2 text-sm">Ответ AI:</h4>
                <pre className="text-sm whitespace-pre-wrap mb-3">
                  {discussResponse}
                </pre>
                <button
                  onClick={handleApplySuggestion}
                  className="btn btn-secondary text-sm"
                >
                  Использовать как новый промпт
                </button>
              </div>
            )}
          </div>
        )}

        {/* Saved prompts list */}
        {filteredPrompts.length > 0 && (
          <div>
            <h3 className="font-medium mb-3">Сохранённые промпты</h3>
            <div className="space-y-3">
              {filteredPrompts.map((prompt) => (
                <div
                  key={prompt.id}
                  className={`p-3 border rounded-lg ${
                    prompt.is_active
                      ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{prompt.name}</span>
                    <div className="flex gap-2">
                      {!prompt.is_active && (
                        <button
                          onClick={() =>
                            updateMutation.mutate({
                              id: prompt.id,
                              data: { is_active: true },
                            })
                          }
                          className="text-sm text-blue-500 hover:text-blue-600"
                        >
                          Активировать
                        </button>
                      )}
                      <button
                        onClick={() => deleteMutation.mutate(prompt.id)}
                        className="text-sm text-red-500 hover:text-red-600"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                  <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap line-clamp-3">
                    {prompt.system_prompt}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
