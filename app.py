from flask import Flask, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
import google.generativeai as genai
import os

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB

genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
client = genai.Client()

stores = {}


@app.route('/')
def index():
    return send_from_directory('.', 'index.html')


@app.route('/api/store/create', methods=['POST'])
def create_store():
    try:
        store = client.file_search_stores.create()
        stores[store.name] = store
        return jsonify({'store_id': store.name, 'status': 'created'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/api/store/list', methods=['GET'])
def list_stores():
    try:
        store_list = client.file_search_stores.list()
        store_names = [s.name for s in store_list]
        return jsonify({'stores': store_names})
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/api/file/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file'}), 400

    file = request.files['file']
    store = request.form.get('store')

    try:
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)

        uploaded = genai.upload_file(path=file_path)

        client.file_search_stores.import_file(
            file_search_store_name=store,
            file_name=uploaded.name,
            custom_metadata=[
                {"key": "filename", "string_value": filename}
            ]
        )

        os.remove(file_path)
        return jsonify({'status': 'uploaded', 'filename': filename})
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@app.route('/api/search', methods=['POST'])
def search():
    data = request.json
    query = data.get('query')
    store = data.get('store')

    try:
        results = client.file_search_stores.search(
            file_search_store_name=store,
            query=query,
            max_results=5
        )

        formatted_results = [{
            'source': getattr(r, 'display_name', 'Unknown'),
            'snippet': getattr(r, 'snippet', '')[:200]
        } for r in results.results]

        return jsonify({'results': formatted_results})
    except Exception as e:
        return jsonify({'error': str(e)}), 400


if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    app.run(debug=True, port=5000)
