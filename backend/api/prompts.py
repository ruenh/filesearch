"""Custom Prompts API blueprint."""
from flask import Blueprint, jsonify, request
from backend.extensions import db
from backend.models.prompt import CustomPrompt
from backend.utils.auth import token_required
from backend.api.ai import call_gemini, get_gemini_model

prompts_bp = Blueprint('prompts', __name__)


@prompts_bp.route('', methods=['GET'])
@token_required
def list_prompts():
    """List all custom prompts for the current user."""
    user_id = request.current_user['user_id']
    prompt_type = request.args.get('type')
    
    query = CustomPrompt.query.filter_by(user_id=user_id)
    if prompt_type:
        query = query.filter_by(prompt_type=prompt_type)
    
    prompts = query.order_by(CustomPrompt.created_at.desc()).all()
    
    return jsonify({
        'prompts': [p.to_dict() for p in prompts],
        'defaults': CustomPrompt.DEFAULT_PROMPTS
    }), 200


@prompts_bp.route('', methods=['POST'])
@token_required
def create_prompt():
    """Create a new custom prompt."""
    data = request.get_json() or {}
    user_id = request.current_user['user_id']
    
    prompt_type = data.get('prompt_type', '').strip()
    if prompt_type not in CustomPrompt.DEFAULT_PROMPTS:
        return jsonify({'error': f'Invalid prompt_type. Must be one of: {list(CustomPrompt.DEFAULT_PROMPTS.keys())}'}), 400
    
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': 'Name is required'}), 400
    
    system_prompt = data.get('system_prompt', '').strip()
    if not system_prompt:
        return jsonify({'error': 'System prompt is required'}), 400
    
    is_active = data.get('is_active', True)
    
    # If setting as active, deactivate other prompts of same type
    if is_active:
        CustomPrompt.query.filter_by(
            user_id=user_id,
            prompt_type=prompt_type,
            is_active=True
        ).update({'is_active': False})
    
    prompt = CustomPrompt(
        user_id=user_id,
        prompt_type=prompt_type,
        name=name,
        system_prompt=system_prompt,
        is_active=is_active
    )
    
    db.session.add(prompt)
    db.session.commit()
    
    return jsonify(prompt.to_dict()), 201


@prompts_bp.route('/<prompt_id>', methods=['GET'])
@token_required
def get_prompt(prompt_id):
    """Get a specific prompt."""
    user_id = request.current_user['user_id']
    
    prompt = CustomPrompt.query.filter_by(id=prompt_id, user_id=user_id).first()
    if not prompt:
        return jsonify({'error': 'Prompt not found'}), 404
    
    return jsonify(prompt.to_dict()), 200


@prompts_bp.route('/<prompt_id>', methods=['PUT'])
@token_required
def update_prompt(prompt_id):
    """Update a custom prompt."""
    data = request.get_json() or {}
    user_id = request.current_user['user_id']
    
    prompt = CustomPrompt.query.filter_by(id=prompt_id, user_id=user_id).first()
    if not prompt:
        return jsonify({'error': 'Prompt not found'}), 404
    
    if 'name' in data:
        prompt.name = data['name'].strip()
    
    if 'system_prompt' in data:
        prompt.system_prompt = data['system_prompt'].strip()
    
    if 'is_active' in data:
        if data['is_active']:
            # Deactivate other prompts of same type
            CustomPrompt.query.filter(
                CustomPrompt.user_id == user_id,
                CustomPrompt.prompt_type == prompt.prompt_type,
                CustomPrompt.id != prompt_id,
                CustomPrompt.is_active == True
            ).update({'is_active': False})
        prompt.is_active = data['is_active']
    
    db.session.commit()
    
    return jsonify(prompt.to_dict()), 200


@prompts_bp.route('/<prompt_id>', methods=['DELETE'])
@token_required
def delete_prompt(prompt_id):
    """Delete a custom prompt."""
    user_id = request.current_user['user_id']
    
    prompt = CustomPrompt.query.filter_by(id=prompt_id, user_id=user_id).first()
    if not prompt:
        return jsonify({'error': 'Prompt not found'}), 404
    
    db.session.delete(prompt)
    db.session.commit()
    
    return jsonify({'message': 'Prompt deleted'}), 200


@prompts_bp.route('/discuss', methods=['POST'])
@token_required
def discuss_prompt():
    """Discuss and improve a prompt with AI."""
    data = request.get_json() or {}
    
    prompt_type = data.get('prompt_type', '').strip()
    current_prompt = data.get('current_prompt', '').strip()
    user_message = data.get('message', '').strip()
    
    if not prompt_type:
        return jsonify({'error': 'prompt_type is required'}), 400
    
    if not user_message:
        return jsonify({'error': 'message is required'}), 400
    
    if not get_gemini_model():
        return jsonify({'error': 'AI service not available'}), 503
    
    # Build context for prompt discussion
    default_prompt = CustomPrompt.DEFAULT_PROMPTS.get(prompt_type, '')
    
    system = """You are an expert prompt engineer helping users create better AI prompts.
Your task is to help improve prompts for a document search and analysis system.
Be specific, practical, and provide concrete suggestions.
When suggesting improvements, explain why they would help.
If the user asks for a new prompt, provide a complete, ready-to-use prompt.
Respond in the same language as the user's message."""

    context = f"""The user is working on a prompt for the "{prompt_type}" feature.

Default system prompt for this feature:
---
{default_prompt}
---

{"Current custom prompt:" if current_prompt else "No custom prompt set yet."}
{current_prompt if current_prompt else ""}
---

User's request: {user_message}

Please help the user improve their prompt or create a new one. Provide specific, actionable advice."""

    try:
        response = call_gemini(context, system)
        return jsonify({
            'response': response,
            'prompt_type': prompt_type
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to get AI response: {str(e)}'}), 500


@prompts_bp.route('/reset/<prompt_type>', methods=['POST'])
@token_required
def reset_to_default(prompt_type):
    """Reset a prompt type to default (deactivate all custom prompts)."""
    user_id = request.current_user['user_id']
    
    if prompt_type not in CustomPrompt.DEFAULT_PROMPTS:
        return jsonify({'error': 'Invalid prompt type'}), 400
    
    CustomPrompt.query.filter_by(
        user_id=user_id,
        prompt_type=prompt_type
    ).update({'is_active': False})
    
    db.session.commit()
    
    return jsonify({
        'message': f'Reset to default prompt for {prompt_type}',
        'default_prompt': CustomPrompt.DEFAULT_PROMPTS[prompt_type]
    }), 200
