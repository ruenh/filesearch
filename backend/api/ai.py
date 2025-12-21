"""AI features API blueprint.

Implements RAG chat, summarization, translation, comparison, and auto-tagging.
Requirements: 7.1, 7.2, 7.3, 17.1, 17.2, 17.3, 18.1, 18.2, 18.3, 19.1, 19.2, 20.1, 20.2, 20.4, 21.1, 21.2, 21.3
"""
import os
from flask import Blueprint, jsonify, request, current_app

from backend.extensions import db
from backend.models.document import Document
from backend.models.storage import Storage
from backend.models.chat import ChatSession, ChatMessage

ai_bp = Blueprint('ai', __name__)


def get_gemini_model():
    """Get configured Gemini model instance.
    
    Returns:
        Configured GenerativeModel or None if API key not set
    """
    try:
        import google.generativeai as genai
        import httpx
        
        api_key = current_app.config.get('GEMINI_API_KEY') or os.environ.get('GEMINI_API_KEY')
        if not api_key:
            current_app.logger.warning('Gemini API key not configured')
            return None
        
        # Check for proxy configuration
        proxy_url = os.environ.get('GEMINI_PROXY_URL')
        if proxy_url:
            # Use httpx with proxy for requests
            transport = httpx.HTTPTransport(proxy=proxy_url)
            client = httpx.Client(transport=transport)
            genai.configure(api_key=api_key, transport='rest', client_options={'api_endpoint': 'https://generativelanguage.googleapis.com'})
        else:
            genai.configure(api_key=api_key)
        
        return genai.GenerativeModel('gemini-2.0-flash')
    except Exception as e:
        current_app.logger.error(f"Failed to initialize Gemini model: {e}")
        return None


def retrieve_context_from_storage(storage_id: str, query: str, max_docs: int = 5) -> list:
    """Retrieve relevant document context for RAG.
    
    Uses semantic search to find relevant documents and extracts their content.
    
    Args:
        storage_id: Storage ID to search in
        query: User query to find relevant context for
        max_docs: Maximum number of documents to retrieve
    
    Returns:
        List of document contexts with id, name, and content
    
    Requirements: 7.1
    """
    contexts = []
    query_lower = query.lower()
    query_words = set(query_lower.split())
    
    # Get all non-deleted text documents in storage
    documents = Document.query.filter(
        Document.storage_id == storage_id,
        Document.is_deleted == False,
        Document.file_type.in_(['txt', 'md'])
    ).all()
    
    # Score documents by relevance
    scored_docs = []
    for doc in documents:
        score = 0
        content = ""
        
        # Check filename match
        name_lower = doc.name.lower()
        for word in query_words:
            if word in name_lower:
                score += 30
        
        # Read and score content
        try:
            upload_folder = current_app.config['UPLOAD_FOLDER']
            full_path = os.path.join(upload_folder, doc.file_path)
            if os.path.exists(full_path):
                with open(full_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                content_lower = content.lower()
                for word in query_words:
                    count = content_lower.count(word)
                    if count > 0:
                        score += min(count * 10, 50)
        except Exception as e:
            current_app.logger.error(f"Error reading document {doc.id}: {e}")
            continue
        
        if content:
            scored_docs.append({
                'id': doc.id,
                'name': doc.name,
                'content': content,
                'score': score
            })
    
    # Sort by score and take top documents
    scored_docs.sort(key=lambda x: x['score'], reverse=True)
    contexts = scored_docs[:max_docs]
    
    return contexts


def build_chat_history_context(session: ChatSession, max_messages: int = 10) -> list:
    """Build conversation history for multi-turn context.
    
    Args:
        session: ChatSession object
        max_messages: Maximum number of previous messages to include
    
    Returns:
        List of message dicts with role and content
    
    Requirements: 20.4
    """
    messages = session.messages.order_by(ChatMessage.created_at.desc()).limit(max_messages).all()
    messages.reverse()  # Chronological order
    
    return [{'role': msg.role, 'content': msg.content} for msg in messages]


def generate_rag_response(query: str, contexts: list, chat_history: list = None) -> dict:
    """Generate AI response using RAG with Gemini.
    
    Args:
        query: User question
        contexts: List of document contexts
        chat_history: Optional list of previous messages for multi-turn
    
    Returns:
        Dict with 'content' (response text) and 'sources' (document references)
    
    Requirements: 7.2, 7.3, 20.2
    """
    model = get_gemini_model()
    if not model:
        return {
            'content': 'AI service is not available. Please check API configuration.',
            'sources': []
        }
    
    # Build context string from documents
    if contexts:
        context_parts = []
        for ctx in contexts:
            # Limit content size per document
            content_preview = ctx['content'][:3000]
            context_parts.append(
                f"Document: {ctx['name']} (ID: {ctx['id']})\n"
                f"Content:\n{content_preview}\n"
            )
        context_str = "\n---\n".join(context_parts)
    else:
        context_str = "No relevant documents found."
    
    # Build conversation history string
    history_str = ""
    if chat_history:
        history_parts = []
        for msg in chat_history[-6:]:  # Last 6 messages for context
            role_label = "User" if msg['role'] == 'user' else "Assistant"
            history_parts.append(f"{role_label}: {msg['content']}")
        history_str = "\n".join(history_parts)
    
    # Create the RAG prompt
    prompt = f"""You are a helpful AI assistant that answers questions based on the provided document context.
Use the information from the documents to answer the user's question accurately.
If the documents don't contain relevant information, say so clearly.
Always cite which document(s) you used to form your answer.

{"Previous conversation:" if history_str else ""}
{history_str}

Document Context:
{context_str}

User Question: {query}

Please provide a helpful, accurate answer based on the document context above. 
If you reference information from a specific document, mention its name.
If the documents don't contain enough information to answer the question, acknowledge this."""

    try:
        response = model.generate_content(prompt)
        response_text = response.text
        
        # Extract sources from contexts that were likely used
        sources = []
        for ctx in contexts:
            # Check if document name or content keywords appear in response
            if ctx['name'].lower() in response_text.lower() or ctx['score'] > 30:
                sources.append({
                    'documentId': ctx['id'],
                    'documentName': ctx['name']
                })
        
        # Ensure at least one source if we had contexts
        if contexts and not sources:
            sources.append({
                'documentId': contexts[0]['id'],
                'documentName': contexts[0]['name']
            })
        
        return {
            'content': response_text,
            'sources': sources
        }
    except Exception as e:
        current_app.logger.error(f"Gemini API error: {e}")
        return {
            'content': f'Error generating response: {str(e)}',
            'sources': []
        }


@ai_bp.route('/chat', methods=['POST'])
def chat():
    """Chat with documents using RAG.
    
    Accepts JSON body with:
        - message (required): User message/question
        - storage_id (required): Storage ID to search for context
        - session_id (optional): Existing chat session ID for multi-turn
    
    Returns:
        200: AI response with sources and session info
        400: Missing required parameters
        404: Storage or session not found
    
    Requirements: 7.1, 7.2, 7.3, 20.1, 20.2, 20.4
    """
    data = request.get_json(silent=True)
    
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    message = data.get('message', '').strip()
    if not message:
        return jsonify({'error': 'message is required'}), 400
    
    storage_id = data.get('storage_id')
    if not storage_id:
        return jsonify({'error': 'storage_id is required'}), 400
    
    # Verify storage exists
    storage = db.session.get(Storage, storage_id)
    if not storage:
        return jsonify({'error': 'Storage not found'}), 404
    
    session_id = data.get('session_id')
    session = None
    chat_history = []
    
    # Get or create chat session
    if session_id:
        session = db.session.get(ChatSession, session_id)
        if not session:
            return jsonify({'error': 'Chat session not found'}), 404
        if session.storage_id != storage_id:
            return jsonify({'error': 'Session belongs to different storage'}), 400
        chat_history = build_chat_history_context(session)
    else:
        # Create new session
        session = ChatSession(
            storage_id=storage_id,
            title=message[:100]  # Use first message as title
        )
        db.session.add(session)
        db.session.flush()  # Get session ID
    
    # Save user message
    user_message = ChatMessage(
        session_id=session.id,
        role='user',
        content=message
    )
    db.session.add(user_message)
    
    # Retrieve relevant context from documents (Requirement 7.1)
    contexts = retrieve_context_from_storage(storage_id, message)
    
    # Generate AI response (Requirements 7.2, 7.3, 20.2)
    response_data = generate_rag_response(message, contexts, chat_history)
    
    # Save assistant message
    assistant_message = ChatMessage(
        session_id=session.id,
        role='assistant',
        content=response_data['content'],
        sources=response_data['sources']
    )
    db.session.add(assistant_message)
    
    # Update session timestamp
    session.updated_at = db.func.now()
    
    db.session.commit()
    
    return jsonify({
        'id': assistant_message.id,
        'session_id': session.id,
        'role': 'assistant',
        'content': response_data['content'],
        'sources': response_data['sources'],
        'timestamp': assistant_message.created_at.isoformat()
    }), 200



@ai_bp.route('/chat/sessions', methods=['GET'])
def get_chat_sessions():
    """Get all chat sessions for a storage.
    
    Query parameters:
        - storage_id (required): Storage ID to get sessions for
        - limit (optional): Maximum number of sessions (default: 20)
        - offset (optional): Offset for pagination (default: 0)
    
    Returns:
        200: List of chat sessions
        400: Missing storage_id
        404: Storage not found
    
    Requirements: 20.4
    """
    storage_id = request.args.get('storage_id')
    if not storage_id:
        return jsonify({'error': 'storage_id is required'}), 400
    
    # Verify storage exists
    storage = db.session.get(Storage, storage_id)
    if not storage:
        return jsonify({'error': 'Storage not found'}), 404
    
    limit = min(int(request.args.get('limit', 20)), 100)
    offset = int(request.args.get('offset', 0))
    
    query = ChatSession.query.filter(
        ChatSession.storage_id == storage_id
    ).order_by(ChatSession.updated_at.desc())
    
    total = query.count()
    sessions = query.offset(offset).limit(limit).all()
    
    return jsonify({
        'sessions': [s.to_dict() for s in sessions],
        'total': total,
        'limit': limit,
        'offset': offset
    }), 200


@ai_bp.route('/chat/sessions/<session_id>', methods=['GET'])
def get_chat_session(session_id):
    """Get a specific chat session with messages.
    
    Args:
        session_id: Chat session ID
    
    Returns:
        200: Chat session with messages
        404: Session not found
    
    Requirements: 20.4
    """
    session = db.session.get(ChatSession, session_id)
    if not session:
        return jsonify({'error': 'Chat session not found'}), 404
    
    return jsonify(session.to_dict(include_messages=True)), 200


@ai_bp.route('/chat/sessions/<session_id>', methods=['DELETE'])
def delete_chat_session(session_id):
    """Delete a chat session and all its messages.
    
    Args:
        session_id: Chat session ID
    
    Returns:
        200: Success message
        404: Session not found
    
    Requirements: 20.4
    """
    session = db.session.get(ChatSession, session_id)
    if not session:
        return jsonify({'error': 'Chat session not found'}), 404
    
    db.session.delete(session)
    db.session.commit()
    
    return jsonify({'message': 'Chat session deleted'}), 200


@ai_bp.route('/chat/sessions/<session_id>/title', methods=['PUT'])
def update_chat_session_title(session_id):
    """Update chat session title.
    
    Args:
        session_id: Chat session ID
    
    Accepts JSON body with:
        - title (required): New title for the session
    
    Returns:
        200: Updated session
        400: Missing title
        404: Session not found
    
    Requirements: 20.4
    """
    session = db.session.get(ChatSession, session_id)
    if not session:
        return jsonify({'error': 'Chat session not found'}), 404
    
    data = request.get_json(silent=True)
    if not data or not data.get('title'):
        return jsonify({'error': 'title is required'}), 400
    
    session.title = data['title'].strip()[:255]
    db.session.commit()
    
    return jsonify(session.to_dict()), 200


@ai_bp.route('/summarize', methods=['POST'])
def summarize():
    """Summarize a document using AI.
    
    Accepts JSON body with:
        - document_id (required): Document ID to summarize
        - length (optional): Summary length - 'short', 'medium', 'long' (default: 'medium')
    
    Returns:
        200: Summary text
        400: Missing document_id
        404: Document not found
    
    Requirements: 17.1, 17.2, 17.3
    """
    data = request.get_json(silent=True)
    
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    document_id = data.get('document_id')
    if not document_id:
        return jsonify({'error': 'document_id is required'}), 400
    
    length = data.get('length', 'medium')
    if length not in ['short', 'medium', 'long']:
        length = 'medium'
    
    # Get document
    document = db.session.get(Document, document_id)
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    if document.is_deleted:
        return jsonify({'error': 'Document is deleted'}), 404
    
    # Read document content
    if document.file_type not in ['txt', 'md']:
        return jsonify({'error': 'Only text files can be summarized'}), 400
    
    try:
        upload_folder = current_app.config['UPLOAD_FOLDER']
        full_path = os.path.join(upload_folder, document.file_path)
        with open(full_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        current_app.logger.error(f"Error reading document {document_id}: {e}")
        return jsonify({'error': 'Failed to read document'}), 500
    
    if not content.strip():
        return jsonify({'error': 'Document is empty'}), 400
    
    # Get Gemini model
    model = get_gemini_model()
    if not model:
        return jsonify({'error': 'AI service not available'}), 503
    
    # Define length parameters
    length_instructions = {
        'short': 'Provide a brief summary in 2-3 sentences.',
        'medium': 'Provide a summary in 1-2 paragraphs covering the main points.',
        'long': 'Provide a detailed summary covering all important points and key details.'
    }
    
    prompt = f"""Summarize the following document.
{length_instructions[length]}

Document Title: {document.name}
Document Content:
{content[:10000]}

Summary:"""

    try:
        response = model.generate_content(prompt)
        summary = response.text
        
        return jsonify({
            'document_id': document_id,
            'document_name': document.name,
            'summary': summary,
            'length': length
        }), 200
    except Exception as e:
        current_app.logger.error(f"Summarization error: {e}")
        return jsonify({'error': f'Failed to generate summary: {str(e)}'}), 500


@ai_bp.route('/translate', methods=['POST'])
def translate():
    """Translate a document to another language.
    
    Accepts JSON body with:
        - document_id (required): Document ID to translate
        - target_language (required): Target language (e.g., 'English', 'Spanish', 'Russian')
    
    Returns:
        200: Translated content
        400: Missing required parameters
        404: Document not found
    
    Requirements: 18.1, 18.2, 18.3
    """
    data = request.get_json(silent=True)
    
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    document_id = data.get('document_id')
    if not document_id:
        return jsonify({'error': 'document_id is required'}), 400
    
    target_language = data.get('target_language', '').strip()
    if not target_language:
        return jsonify({'error': 'target_language is required'}), 400
    
    # Get document
    document = db.session.get(Document, document_id)
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    if document.is_deleted:
        return jsonify({'error': 'Document is deleted'}), 404
    
    # Read document content
    if document.file_type not in ['txt', 'md']:
        return jsonify({'error': 'Only text files can be translated'}), 400
    
    try:
        upload_folder = current_app.config['UPLOAD_FOLDER']
        full_path = os.path.join(upload_folder, document.file_path)
        with open(full_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        current_app.logger.error(f"Error reading document {document_id}: {e}")
        return jsonify({'error': 'Failed to read document'}), 500
    
    if not content.strip():
        return jsonify({'error': 'Document is empty'}), 400
    
    # Get Gemini model
    model = get_gemini_model()
    if not model:
        return jsonify({'error': 'AI service not available'}), 503
    
    prompt = f"""Translate the following text to {target_language}.
Preserve the original formatting and structure.
Only output the translated text, no explanations.

Original text:
{content[:10000]}

Translation:"""

    try:
        response = model.generate_content(prompt)
        translation = response.text
        
        return jsonify({
            'document_id': document_id,
            'document_name': document.name,
            'target_language': target_language,
            'translated_content': translation
        }), 200
    except Exception as e:
        current_app.logger.error(f"Translation error: {e}")
        return jsonify({'error': f'Failed to translate: {str(e)}'}), 500



@ai_bp.route('/compare', methods=['POST'])
def compare():
    """Compare two documents using AI.
    
    Accepts JSON body with:
        - document_id_1 (required): First document ID
        - document_id_2 (required): Second document ID
    
    Returns:
        200: Comparison analysis
        400: Missing required parameters
        404: Document not found
    
    Requirements: 21.1, 21.2, 21.3
    """
    data = request.get_json(silent=True)
    
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    doc_id_1 = data.get('document_id_1')
    doc_id_2 = data.get('document_id_2')
    
    if not doc_id_1 or not doc_id_2:
        return jsonify({'error': 'document_id_1 and document_id_2 are required'}), 400
    
    # Get documents
    doc1 = db.session.get(Document, doc_id_1)
    doc2 = db.session.get(Document, doc_id_2)
    
    if not doc1:
        return jsonify({'error': f'Document {doc_id_1} not found'}), 404
    if not doc2:
        return jsonify({'error': f'Document {doc_id_2} not found'}), 404
    
    if doc1.is_deleted or doc2.is_deleted:
        return jsonify({'error': 'One or both documents are deleted'}), 404
    
    # Read document contents
    contents = []
    for doc in [doc1, doc2]:
        if doc.file_type not in ['txt', 'md']:
            return jsonify({'error': f'Document {doc.name} is not a text file'}), 400
        
        try:
            upload_folder = current_app.config['UPLOAD_FOLDER']
            full_path = os.path.join(upload_folder, doc.file_path)
            with open(full_path, 'r', encoding='utf-8') as f:
                contents.append(f.read())
        except Exception as e:
            current_app.logger.error(f"Error reading document {doc.id}: {e}")
            return jsonify({'error': f'Failed to read document {doc.name}'}), 500
    
    # Get Gemini model
    model = get_gemini_model()
    if not model:
        return jsonify({'error': 'AI service not available'}), 503
    
    prompt = f"""Compare the following two documents and provide a detailed analysis of their differences and similarities.

Document 1: {doc1.name}
Content:
{contents[0][:5000]}

Document 2: {doc2.name}
Content:
{contents[1][:5000]}

Please provide:
1. A summary of what each document is about
2. Key similarities between the documents
3. Key differences between the documents
4. Any notable changes if these appear to be versions of the same document

Analysis:"""

    try:
        response = model.generate_content(prompt)
        analysis = response.text
        
        return jsonify({
            'document_1': {
                'id': doc1.id,
                'name': doc1.name
            },
            'document_2': {
                'id': doc2.id,
                'name': doc2.name
            },
            'analysis': analysis
        }), 200
    except Exception as e:
        current_app.logger.error(f"Comparison error: {e}")
        return jsonify({'error': f'Failed to compare documents: {str(e)}'}), 500


@ai_bp.route('/tags', methods=['POST'])
def generate_tags():
    """Generate tags for a document using AI.
    
    Accepts JSON body with:
        - document_id (required): Document ID to generate tags for
        - max_tags (optional): Maximum number of tags to generate (default: 5)
    
    Returns:
        200: List of suggested tags
        400: Missing document_id
        404: Document not found
    
    Requirements: 19.1, 19.2
    """
    data = request.get_json(silent=True)
    
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    document_id = data.get('document_id')
    if not document_id:
        return jsonify({'error': 'document_id is required'}), 400
    
    max_tags = min(int(data.get('max_tags', 5)), 10)
    
    # Get document
    document = db.session.get(Document, document_id)
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    if document.is_deleted:
        return jsonify({'error': 'Document is deleted'}), 404
    
    # Read document content
    content = ""
    if document.file_type in ['txt', 'md']:
        try:
            upload_folder = current_app.config['UPLOAD_FOLDER']
            full_path = os.path.join(upload_folder, document.file_path)
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            current_app.logger.error(f"Error reading document {document_id}: {e}")
    
    # Use filename if no content
    if not content.strip():
        content = document.name
    
    # Get Gemini model
    model = get_gemini_model()
    if not model:
        return jsonify({'error': 'AI service not available'}), 503
    
    prompt = f"""Analyze the following document and suggest {max_tags} relevant tags for categorization.
Tags should be single words or short phrases (2-3 words max).
Return only the tags as a comma-separated list, nothing else.

Document Name: {document.name}
Document Content:
{content[:5000]}

Tags:"""

    try:
        response = model.generate_content(prompt)
        tags_text = response.text.strip()
        
        # Parse tags from response
        tags = [tag.strip().lower() for tag in tags_text.split(',')]
        tags = [tag for tag in tags if tag and len(tag) <= 50][:max_tags]
        
        return jsonify({
            'document_id': document_id,
            'document_name': document.name,
            'suggested_tags': tags
        }), 200
    except Exception as e:
        current_app.logger.error(f"Tag generation error: {e}")
        return jsonify({'error': f'Failed to generate tags: {str(e)}'}), 500


@ai_bp.route('/similar', methods=['POST'])
def find_similar():
    """Find documents similar to a given document.
    
    Accepts JSON body with:
        - document_id (required): Document ID to find similar documents for
        - limit (optional): Maximum number of similar documents (default: 5)
    
    Returns:
        200: List of similar documents with similarity scores
        400: Missing document_id
        404: Document not found
    
    Requirements: 13.1, 13.2, 13.3
    """
    data = request.get_json(silent=True)
    
    if not data:
        return jsonify({'error': 'Request body is required'}), 400
    
    document_id = data.get('document_id')
    if not document_id:
        return jsonify({'error': 'document_id is required'}), 400
    
    limit = min(int(data.get('limit', 5)), 20)
    
    # Get source document
    source_doc = db.session.get(Document, document_id)
    if not source_doc:
        return jsonify({'error': 'Document not found'}), 404
    
    if source_doc.is_deleted:
        return jsonify({'error': 'Document is deleted'}), 404
    
    # Read source document content
    source_content = ""
    if source_doc.file_type in ['txt', 'md']:
        try:
            upload_folder = current_app.config['UPLOAD_FOLDER']
            full_path = os.path.join(upload_folder, source_doc.file_path)
            with open(full_path, 'r', encoding='utf-8') as f:
                source_content = f.read()
        except Exception as e:
            current_app.logger.error(f"Error reading document {document_id}: {e}")
    
    # Get other documents in the same storage
    other_docs = Document.query.filter(
        Document.storage_id == source_doc.storage_id,
        Document.id != document_id,
        Document.is_deleted == False,
        Document.file_type.in_(['txt', 'md'])
    ).all()
    
    if not other_docs:
        return jsonify({
            'document_id': document_id,
            'document_name': source_doc.name,
            'similar_documents': []
        }), 200
    
    # Read other documents
    doc_contents = []
    for doc in other_docs:
        try:
            upload_folder = current_app.config['UPLOAD_FOLDER']
            full_path = os.path.join(upload_folder, doc.file_path)
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
            doc_contents.append({
                'id': doc.id,
                'name': doc.name,
                'content': content[:2000]
            })
        except Exception:
            continue
    
    if not doc_contents:
        return jsonify({
            'document_id': document_id,
            'document_name': source_doc.name,
            'similar_documents': []
        }), 200
    
    # Get Gemini model
    model = get_gemini_model()
    if not model:
        # Fallback to simple keyword matching
        similar = []
        source_words = set(source_content.lower().split())
        for doc in doc_contents:
            doc_words = set(doc['content'].lower().split())
            overlap = len(source_words & doc_words)
            if overlap > 0:
                score = min(overlap / max(len(source_words), 1) * 100, 100)
                similar.append({
                    'documentId': doc['id'],
                    'documentName': doc['name'],
                    'similarityScore': round(score, 2)
                })
        similar.sort(key=lambda x: x['similarityScore'], reverse=True)
        return jsonify({
            'document_id': document_id,
            'document_name': source_doc.name,
            'similar_documents': similar[:limit]
        }), 200
    
    # Use AI to find similar documents
    docs_text = "\n\n".join([
        f"Document ID: {d['id']}\nName: {d['name']}\nContent: {d['content']}"
        for d in doc_contents[:10]  # Limit to 10 for API
    ])
    
    prompt = f"""Given a source document and a list of other documents, identify which documents are most similar to the source.
Return a JSON array of objects with 'document_id' and 'similarity_score' (0-100).
Only include documents with similarity_score > 20.
Sort by similarity_score descending.

Source Document: {source_doc.name}
Source Content:
{source_content[:2000]}

Other Documents:
{docs_text}

Return only valid JSON array, no other text. Example format:
[{{"document_id": "uuid-here", "similarity_score": 75}}]"""

    try:
        import json
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Handle markdown code blocks
        if response_text.startswith('```'):
            lines = response_text.split('\n')
            response_text = '\n'.join(lines[1:-1])
        
        results = json.loads(response_text)
        
        # Map results to document info
        doc_map = {d['id']: d['name'] for d in doc_contents}
        similar = []
        for r in results[:limit]:
            doc_id = r.get('document_id')
            if doc_id in doc_map:
                similar.append({
                    'documentId': doc_id,
                    'documentName': doc_map[doc_id],
                    'similarityScore': r.get('similarity_score', 0)
                })
        
        return jsonify({
            'document_id': document_id,
            'document_name': source_doc.name,
            'similar_documents': similar
        }), 200
    except Exception as e:
        current_app.logger.error(f"Similar documents error: {e}")
        return jsonify({'error': f'Failed to find similar documents: {str(e)}'}), 500
