import os
import google.generativeai as genai
from pathlib import Path

# Инициализация
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))


class FileSearchManager:
    def __init__(self, store_name="my-knowledge-base"):
        self.store_name = store_name
        self.client = genai.Client()

    def create_store(self):
        """Создание хранилища файлов"""
        try:
            store = self.client.file_search_stores.create()
            print(f"✅ Хранилище создано: {store.name}")
            return store
        except Exception as e:
            print(f"❌ Ошибка создания: {e}")
            return None

    def list_stores(self):
        """Список всех хранилищ"""
        stores = self.client.file_search_stores.list()
        for store in stores:
            print(f"📦 {store.name}")
        return stores

    def import_file(self, store_name, file_path, metadata=None):
        """Загрузить файл в хранилище"""
        try:
            file_data = genai.upload_file(
                path=file_path,
                display_name=Path(file_path).name
            )

            operation = self.client.file_search_stores.import_file(
                file_search_store_name=store_name,
                file_name=file_data.name,
                custom_metadata=metadata or []
            )

            print(f"✅ Файл загружен: {Path(file_path).name}")
            return operation
        except Exception as e:
            print(f"❌ Ошибка загрузки: {e}")
            return None

    def search_in_store(self, store_name, query, top_k=5):
        """Поиск в хранилище"""
        try:
            results = self.client.file_search_stores.search(
                file_search_store_name=store_name,
                query=query,
                max_results=top_k
            )
            return results
        except Exception as e:
            print(f"❌ Ошибка поиска: {e}")
            return None

    def query_with_rag(self, store_name, question):
        """Задать вопрос с контекстом из хранилища (RAG)"""
        try:
            search_results = self.search_in_store(store_name, question, top_k=3)

            context = "\n".join([
                f"[{result.display_name}]\n{result.snippet}"
                for result in search_results.results
            ])

            model = genai.GenerativeModel("gemini-2.5-pro")
            response = model.generate_content(
                f"""Используя следующий контекст из документов, ответь на вопрос:

Контекст:
{context}

Вопрос: {question}

Ответь кратко и ясно, ссылаясь на источники."""
            )

            return response.text
        except Exception as e:
            print(f"❌ Ошибка RAG: {e}")
            return None

    def delete_file(self, store_name, file_name):
        """Удалить файл из хранилища"""
        try:
            self.client.file_search_stores.delete_file(
                file_search_store_name=store_name,
                file_name=file_name
            )
            print(f"✅ Файл удален: {file_name}")
        except Exception as e:
            print(f"❌ Ошибка удаления: {e}")

    def delete_store(self, store_name):
        """Удалить хранилище целиком"""
        try:
            self.client.file_search_stores.delete(name=store_name)
            print(f"✅ Хранилище удалено: {store_name}")
        except Exception as e:
            print(f"❌ Ошибка: {e}")


if __name__ == "__main__":
    manager = FileSearchManager()

    # 1. Создать хранилище
    store = manager.create_store()

    # 2. Загрузить файлы с метаданными
    if store:
        manager.import_file(
            store_name=store.name,
            file_path="document.pdf",
            metadata=[
                {"key": "category", "string_value": "finance"},
                {"key": "year", "numeric_value": 2024}
            ]
        )

    # 3. Выполнить поиск
    results = manager.search_in_store(store.name, "информация о квартальных результатах")

    # 4. RAG запрос
    answer = manager.query_with_rag(
        store.name,
        "Какие были основные результаты за этот квартал?"
    )
    print(f"\n🤖 Ответ: {answer}")
