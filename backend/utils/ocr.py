"""OCR utility for extracting text from images.

Uses OpenRouter API with vision-capable models to extract text from images.
Requirements: 10.1, 10.2, 10.3
"""
import os
import base64
import requests
from flask import current_app

# OpenRouter configuration
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_VISION_MODEL = "google/gemini-2.0-flash-exp:free"


def get_image_mime_type(file_path: str) -> str:
    """Get MIME type for an image file based on extension.
    
    Args:
        file_path: Path to the image file
    
    Returns:
        MIME type string
    """
    ext = os.path.splitext(file_path)[1].lower()
    mime_types = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.bmp': 'image/bmp'
    }
    return mime_types.get(ext, 'image/png')


def is_image_file(file_type: str) -> bool:
    """Check if file type is an image that can be processed with OCR.
    
    Args:
        file_type: File type string (e.g., 'image', 'png', 'jpg')
    
    Returns:
        True if file is an image
    """
    return file_type in ['image', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']


def extract_text_from_image(file_path: str) -> str:
    """Extract text from an image using OpenRouter Vision API.
    
    Uses OpenRouter's multimodal capabilities to perform OCR on images.
    
    Args:
        file_path: Full path to the image file
    
    Returns:
        Extracted text string, or empty string if extraction fails
    
    Requirements: 10.1
    """
    try:
        api_key = os.environ.get('OPENROUTER_API_KEY')
        if not api_key:
            current_app.logger.warning('OpenRouter API key not configured for OCR')
            return ""
        
        # Check if file exists
        if not os.path.exists(file_path):
            current_app.logger.error(f'OCR: File not found: {file_path}')
            return ""
        
        # Read and encode the image
        with open(file_path, 'rb') as f:
            image_data = f.read()
        
        # Get MIME type
        mime_type = get_image_mime_type(file_path)
        base64_image = base64.b64encode(image_data).decode('utf-8')
        
        # OCR prompt
        prompt = """Extract all text from this image. 
If the image contains text, return only the extracted text without any additional commentary.
If the image contains no readable text, return an empty string.
Preserve the original formatting and structure of the text as much as possible.
Do not add any explanations or descriptions - only return the extracted text."""

        # Build request for OpenRouter with vision
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://filesearch.odindindindun.ru",
            "X-Title": "File Search RAG OCR"
        }
        
        data = {
            "model": OPENROUTER_VISION_MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{base64_image}"
                            }
                        }
                    ]
                }
            ]
        }
        
        response = requests.post(OPENROUTER_API_URL, headers=headers, json=data, timeout=60)
        response.raise_for_status()
        
        result = response.json()
        extracted_text = result["choices"][0]["message"]["content"].strip()
        
        # Filter out common "no text" responses
        no_text_indicators = [
            'no text',
            'no readable text',
            'empty',
            'cannot extract',
            'no visible text',
            'image does not contain'
        ]
        
        for indicator in no_text_indicators:
            if indicator in extracted_text.lower():
                return ""
        
        current_app.logger.info(f'OCR: Extracted {len(extracted_text)} characters from {file_path}')
        return extracted_text
        
    except Exception as e:
        current_app.logger.error(f'OCR extraction error for {file_path}: {str(e)}')
        return ""


def process_document_ocr(document_id: str) -> bool:
    """Process OCR for a document and update its ocr_text field.
    
    Args:
        document_id: UUID of the document to process
    
    Returns:
        True if OCR was successful, False otherwise
    
    Requirements: 10.1, 10.2
    """
    from backend.extensions import db
    from backend.models.document import Document
    
    try:
        document = db.session.get(Document, document_id)
        if not document:
            current_app.logger.error(f'OCR: Document not found: {document_id}')
            return False
        
        # Only process image files
        if not is_image_file(document.file_type):
            current_app.logger.debug(f'OCR: Skipping non-image file: {document.name}')
            return False
        
        # Get full file path
        upload_folder = current_app.config['UPLOAD_FOLDER']
        full_path = os.path.join(upload_folder, document.file_path)
        
        # Extract text
        extracted_text = extract_text_from_image(full_path)
        
        # Update document with OCR text
        document.ocr_text = extracted_text if extracted_text else None
        db.session.commit()
        
        if extracted_text:
            current_app.logger.info(f'OCR: Successfully processed document {document_id}')
        else:
            current_app.logger.info(f'OCR: No text found in document {document_id}')
        
        return True
        
    except Exception as e:
        current_app.logger.error(f'OCR processing error for document {document_id}: {str(e)}')
        db.session.rollback()
        return False
