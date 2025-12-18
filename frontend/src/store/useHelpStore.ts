import { create } from "zustand";

/**
 * Help Store - Requirements 83.1, 83.2, 83.3
 * Manages contextual help content and state
 */

export interface HelpTopic {
  id: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  category: string;
  keywords: string[];
  relatedTopics?: string[];
}

// Help topics database
export const helpTopics: HelpTopic[] = [
  // Storage
  {
    id: "storage-create",
    title: "Создание хранилища",
    shortDescription: "Создайте новое хранилище для документов",
    fullDescription:
      "Хранилище — это контейнер для группировки связанных документов. Вы можете создать несколько хранилищ для разных проектов или категорий. Каждое хранилище имеет собственный индекс для поиска.",
    category: "storage",
    keywords: ["хранилище", "создать", "новое", "storage"],
    relatedTopics: ["storage-delete", "document-upload"],
  },
  {
    id: "storage-delete",
    title: "Удаление хранилища",
    shortDescription: "Удалите хранилище и все его документы",
    fullDescription:
      "При удалении хранилища все документы внутри него будут также удалены. Это действие необратимо. Рекомендуется сначала экспортировать важные документы.",
    category: "storage",
    keywords: ["хранилище", "удалить", "delete", "storage"],
    relatedTopics: ["storage-create", "storage-export"],
  },
  {
    id: "storage-export",
    title: "Экспорт хранилища",
    shortDescription: "Скачайте все документы в ZIP-архиве",
    fullDescription:
      "Экспорт позволяет скачать все документы хранилища в виде ZIP-архива с сохранением структуры папок. Это удобно для резервного копирования или переноса данных.",
    category: "storage",
    keywords: ["экспорт", "скачать", "архив", "backup", "export"],
    relatedTopics: ["storage-create"],
  },
  // Documents
  {
    id: "document-upload",
    title: "Загрузка документов",
    shortDescription: "Загрузите файлы в хранилище",
    fullDescription:
      "Перетащите файлы в область загрузки или нажмите для выбора. Поддерживаются форматы: TXT, PDF, DOCX, MD, изображения. Максимальный размер файла — 100 МБ. После загрузки документы автоматически индексируются для поиска.",
    category: "documents",
    keywords: ["загрузка", "файл", "upload", "документ"],
    relatedTopics: ["document-view", "document-delete"],
  },
  {
    id: "document-view",
    title: "Просмотр документов",
    shortDescription: "Откройте документ для просмотра",
    fullDescription:
      "Нажмите на документ для открытия в просмотрщике. Поддерживается просмотр текстовых файлов, PDF, Markdown с рендерингом, изображений и кода с подсветкой синтаксиса.",
    category: "documents",
    keywords: ["просмотр", "открыть", "view", "документ"],
    relatedTopics: ["document-edit", "document-upload"],
  },
  {
    id: "document-edit",
    title: "Редактирование документов",
    shortDescription: "Редактируйте текстовые файлы в браузере",
    fullDescription:
      "Текстовые файлы (TXT, MD) можно редактировать прямо в браузере. Изменения автоматически сохраняются, создавая новую версию документа. Для Markdown доступен предпросмотр в реальном времени.",
    category: "documents",
    keywords: ["редактирование", "edit", "изменить", "документ"],
    relatedTopics: ["document-view", "version-history"],
  },
  {
    id: "document-delete",
    title: "Удаление документов",
    shortDescription: "Переместите документ в корзину",
    fullDescription:
      "Удалённые документы перемещаются в корзину, откуда их можно восстановить. Для окончательного удаления очистите корзину. Документы в корзине не участвуют в поиске.",
    category: "documents",
    keywords: ["удалить", "delete", "корзина", "документ"],
    relatedTopics: ["trash-restore", "document-upload"],
  },
  {
    id: "version-history",
    title: "История версий",
    shortDescription: "Просмотрите предыдущие версии документа",
    fullDescription:
      "Каждое изменение документа создаёт новую версию. Вы можете просмотреть историю изменений, сравнить версии и восстановить любую предыдущую версию.",
    category: "documents",
    keywords: ["версия", "история", "version", "history"],
    relatedTopics: ["document-edit"],
  },
  // Search
  {
    id: "search-basic",
    title: "Поиск документов",
    shortDescription: "Найдите документы по содержимому",
    fullDescription:
      "Введите запрос в поисковую строку для семантического поиска по всем документам. Поиск учитывает смысл запроса, а не только точные совпадения слов. Результаты показывают релевантные фрагменты текста.",
    category: "search",
    keywords: ["поиск", "найти", "search", "запрос"],
    relatedTopics: ["search-filters", "search-voice"],
  },
  {
    id: "search-filters",
    title: "Фильтры поиска",
    shortDescription: "Уточните результаты поиска",
    fullDescription:
      "Используйте фильтры для сужения результатов: по дате создания/изменения, типу файла, размеру. Фильтры можно комбинировать для точного поиска.",
    category: "search",
    keywords: ["фильтр", "filter", "дата", "тип"],
    relatedTopics: ["search-basic", "search-saved"],
  },
  {
    id: "search-voice",
    title: "Голосовой поиск",
    shortDescription: "Ищите голосом",
    fullDescription:
      "Нажмите на иконку микрофона и произнесите запрос. Система распознает речь и выполнит поиск. Требуется разрешение на использование микрофона.",
    category: "search",
    keywords: ["голос", "voice", "микрофон", "речь"],
    relatedTopics: ["search-basic"],
  },
  {
    id: "search-saved",
    title: "Сохранённые поиски",
    shortDescription: "Сохраните частые запросы",
    fullDescription:
      "Сохраните часто используемые поисковые запросы для быстрого доступа. Сохранённые поиски доступны в истории поиска.",
    category: "search",
    keywords: ["сохранить", "saved", "избранное", "запрос"],
    relatedTopics: ["search-basic", "search-history"],
  },
  {
    id: "search-history",
    title: "История поиска",
    shortDescription: "Просмотрите предыдущие запросы",
    fullDescription:
      "История поиска сохраняет ваши последние запросы. Нажмите на запрос для повторного поиска. Историю можно очистить в настройках.",
    category: "search",
    keywords: ["история", "history", "предыдущие", "запросы"],
    relatedTopics: ["search-basic", "search-saved"],
  },
  // AI Features
  {
    id: "ai-chat",
    title: "AI Чат",
    shortDescription: "Задавайте вопросы по документам",
    fullDescription:
      "Чат с AI позволяет задавать вопросы по содержимому ваших документов. AI найдёт релевантную информацию и сформирует ответ с указанием источников.",
    category: "ai",
    keywords: ["чат", "ai", "вопрос", "ответ", "gemini"],
    relatedTopics: ["ai-summary", "ai-translate"],
  },
  {
    id: "ai-summary",
    title: "AI Суммаризация",
    shortDescription: "Получите краткое содержание документа",
    fullDescription:
      "AI проанализирует документ и создаст краткое содержание с ключевыми пунктами. Можно выбрать длину: краткая, средняя или подробная.",
    category: "ai",
    keywords: ["суммаризация", "summary", "краткое", "содержание"],
    relatedTopics: ["ai-chat", "document-view"],
  },
  {
    id: "ai-translate",
    title: "AI Перевод",
    shortDescription: "Переведите документ на другой язык",
    fullDescription:
      "AI переведёт содержимое документа на выбранный язык. Поддерживаются основные мировые языки. Перевод сохраняет форматирование оригинала.",
    category: "ai",
    keywords: ["перевод", "translate", "язык", "language"],
    relatedTopics: ["ai-chat", "document-view"],
  },
  {
    id: "ai-tags",
    title: "Автоматические теги",
    shortDescription: "AI генерирует теги для документов",
    fullDescription:
      "При загрузке документа AI анализирует содержимое и предлагает релевантные теги. Вы можете принять, отклонить или добавить свои теги.",
    category: "ai",
    keywords: ["теги", "tags", "автоматические", "категории"],
    relatedTopics: ["tags-manual", "document-upload"],
  },
  // Organization
  {
    id: "folders",
    title: "Папки",
    shortDescription: "Организуйте документы в папки",
    fullDescription:
      "Создавайте папки и подпапки для организации документов. Перетаскивайте документы между папками. Используйте хлебные крошки для навигации.",
    category: "organization",
    keywords: ["папка", "folder", "организация", "структура"],
    relatedTopics: ["tags-manual", "favorites"],
  },
  {
    id: "tags-manual",
    title: "Теги",
    shortDescription: "Добавляйте теги к документам",
    fullDescription:
      "Теги позволяют категоризировать документы независимо от папок. Один документ может иметь несколько тегов. Фильтруйте документы по тегам.",
    category: "organization",
    keywords: ["теги", "tags", "метки", "категории"],
    relatedTopics: ["ai-tags", "folders"],
  },
  {
    id: "favorites",
    title: "Избранное",
    shortDescription: "Отмечайте важные документы",
    fullDescription:
      "Нажмите на звёздочку, чтобы добавить документ в избранное. Избранные документы отображаются в отдельном разделе для быстрого доступа.",
    category: "organization",
    keywords: ["избранное", "favorites", "звезда", "важное"],
    relatedTopics: ["folders", "tags-manual"],
  },
  {
    id: "trash-restore",
    title: "Корзина",
    shortDescription: "Восстановите удалённые документы",
    fullDescription:
      "Удалённые документы хранятся в корзине. Вы можете восстановить их или удалить окончательно. Очистка корзины удаляет документы безвозвратно.",
    category: "organization",
    keywords: ["корзина", "trash", "восстановить", "удалённые"],
    relatedTopics: ["document-delete"],
  },
  // Settings
  {
    id: "theme",
    title: "Тема оформления",
    shortDescription: "Переключите светлую/тёмную тему",
    fullDescription:
      "Выберите светлую или тёмную тему оформления. Настройка сохраняется в браузере. Тёмная тема снижает нагрузку на глаза при работе в темноте.",
    category: "settings",
    keywords: ["тема", "theme", "тёмная", "светлая", "dark", "light"],
    relatedTopics: ["shortcuts"],
  },
  {
    id: "shortcuts",
    title: "Горячие клавиши",
    shortDescription: "Используйте клавиатурные сокращения",
    fullDescription:
      "Горячие клавиши ускоряют работу. Нажмите ? для просмотра всех сокращений. Вы можете настроить собственные комбинации клавиш.",
    category: "settings",
    keywords: ["горячие", "клавиши", "shortcuts", "keyboard"],
    relatedTopics: ["theme"],
  },
];

// Group topics by category
export const helpCategories: Record<string, string> = {
  storage: "Хранилища",
  documents: "Документы",
  search: "Поиск",
  ai: "AI Функции",
  organization: "Организация",
  settings: "Настройки",
};

interface HelpState {
  isHelpModalOpen: boolean;
  searchQuery: string;
  selectedTopic: HelpTopic | null;
  recentTopics: string[];

  openHelpModal: () => void;
  closeHelpModal: () => void;
  setSearchQuery: (query: string) => void;
  selectTopic: (topic: HelpTopic | null) => void;
  addRecentTopic: (topicId: string) => void;
  searchTopics: (query: string) => HelpTopic[];
  getTopicById: (id: string) => HelpTopic | undefined;
}

export const useHelpStore = create<HelpState>((set, get) => ({
  isHelpModalOpen: false,
  searchQuery: "",
  selectedTopic: null,
  recentTopics: [],

  openHelpModal: () => set({ isHelpModalOpen: true }),
  closeHelpModal: () =>
    set({ isHelpModalOpen: false, searchQuery: "", selectedTopic: null }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  selectTopic: (topic) => {
    if (topic) {
      get().addRecentTopic(topic.id);
    }
    set({ selectedTopic: topic });
  },

  addRecentTopic: (topicId) => {
    const { recentTopics } = get();
    const filtered = recentTopics.filter((id) => id !== topicId);
    set({ recentTopics: [topicId, ...filtered].slice(0, 5) });
  },

  searchTopics: (query) => {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase();
    return helpTopics.filter(
      (topic) =>
        topic.title.toLowerCase().includes(lowerQuery) ||
        topic.shortDescription.toLowerCase().includes(lowerQuery) ||
        topic.keywords.some((kw) => kw.toLowerCase().includes(lowerQuery))
    );
  },

  getTopicById: (id) => helpTopics.find((topic) => topic.id === id),
}));
