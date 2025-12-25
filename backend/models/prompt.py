"""Custom AI Prompts model."""
import uuid
from datetime import datetime
from backend.extensions import db


class CustomPrompt(db.Model):
    """Custom AI prompts for different features."""
    
    __tablename__ = 'custom_prompts'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False, index=True)
    prompt_type = db.Column(db.String(50), nullable=False, index=True)  # chat, summarize, translate, compare, tags
    name = db.Column(db.String(255), nullable=False)
    system_prompt = db.Column(db.Text, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_default = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('custom_prompts', lazy='dynamic'))
    
    # Default prompts for each type
    DEFAULT_PROMPTS = {
        'chat': """You are a helpful AI assistant that answers questions based on the provided document context.
Use the information from the documents to answer the user's question accurately.
If the documents don't contain relevant information, say so clearly.
Always cite which document(s) you used to form your answer.""",
        
        'summarize': """Summarize the following document clearly and concisely.
Focus on the main points and key information.
Preserve the original meaning and important details.""",
        
        'translate': """Translate the following text accurately.
Preserve the original formatting and structure.
Maintain the tone and style of the original text.
Only output the translated text, no explanations.""",
        
        'compare': """Compare the following documents and provide a detailed analysis.
Identify key similarities and differences.
Note any changes if these appear to be versions of the same document.
Provide a clear, structured comparison.""",
        
        'tags': """Analyze the document and suggest relevant tags for categorization.
Tags should be single words or short phrases (2-3 words max).
Focus on the main topics, themes, and key concepts.
Return only the tags as a comma-separated list."""
    }
    
    def __repr__(self):
        return f'<CustomPrompt {self.prompt_type}: {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'prompt_type': self.prompt_type,
            'name': self.name,
            'system_prompt': self.system_prompt,
            'is_active': self.is_active,
            'is_default': self.is_default,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    @classmethod
    def get_active_prompt(cls, user_id: str, prompt_type: str) -> str:
        """Get the active prompt for a user and type, or default if none set."""
        prompt = cls.query.filter_by(
            user_id=user_id,
            prompt_type=prompt_type,
            is_active=True
        ).first()
        
        if prompt:
            return prompt.system_prompt
        
        return cls.DEFAULT_PROMPTS.get(prompt_type, '')
