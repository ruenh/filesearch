"""Webhook utility functions for triggering webhooks.

Requirements: 45.2
"""
import hmac
import hashlib
import json
import time
import threading
from datetime import datetime
from typing import Optional, Dict, Any
import requests

from backend.extensions import db
from backend.models.webhook import Webhook, WebhookDelivery


def generate_signature(payload: str, secret: str) -> str:
    """Generate HMAC-SHA256 signature for webhook payload.
    
    Args:
        payload: JSON string payload
        secret: Webhook secret
    
    Returns:
        Hex-encoded signature
    """
    return hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()


def trigger_webhook(
    webhook: Webhook,
    event_type: str,
    payload: Dict[str, Any],
    timeout: int = 10
) -> WebhookDelivery:
    """Trigger a single webhook with the given payload.
    
    Args:
        webhook: The Webhook instance to trigger
        event_type: The event type (e.g., 'document.created')
        payload: The payload data to send
        timeout: Request timeout in seconds
    
    Returns:
        WebhookDelivery record
    """
    # Build the full payload
    full_payload = {
        'event': event_type,
        'timestamp': datetime.utcnow().isoformat(),
        'webhook_id': webhook.id,
        'data': payload
    }
    
    payload_json = json.dumps(full_payload, default=str)
    
    # Build headers
    headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'FileSearchRAG-Webhook/1.0',
        'X-Webhook-Event': event_type,
        'X-Webhook-Delivery': str(datetime.utcnow().timestamp()),
    }
    
    # Add signature if secret is configured
    if webhook.secret:
        signature = generate_signature(payload_json, webhook.secret)
        headers['X-Webhook-Signature'] = f'sha256={signature}'
    
    # Add custom headers
    if webhook.headers:
        headers.update(webhook.headers)
    
    # Create delivery record
    delivery = WebhookDelivery(
        webhook_id=webhook.id,
        event_type=event_type,
        payload=full_payload
    )
    
    start_time = time.time()
    
    try:
        response = requests.post(
            webhook.url,
            data=payload_json,
            headers=headers,
            timeout=timeout
        )
        
        duration_ms = int((time.time() - start_time) * 1000)
        
        delivery.status_code = response.status_code
        delivery.response_body = response.text[:2000] if response.text else None
        delivery.duration_ms = duration_ms
        delivery.success = 200 <= response.status_code < 300
        
        if delivery.success:
            webhook.record_success(response.status_code)
        else:
            webhook.record_failure(response.status_code, f'HTTP {response.status_code}')
            
    except requests.exceptions.Timeout:
        delivery.error = 'Request timed out'
        delivery.success = False
        webhook.record_failure(error='Request timed out')
        
    except requests.exceptions.ConnectionError as e:
        delivery.error = f'Connection error: {str(e)}'
        delivery.success = False
        webhook.record_failure(error=str(e))
        
    except Exception as e:
        delivery.error = f'Error: {str(e)}'
        delivery.success = False
        webhook.record_failure(error=str(e))
    
    db.session.add(delivery)
    db.session.commit()
    
    return delivery


def trigger_webhooks_for_event(
    event_type: str,
    payload: Dict[str, Any],
    user_id: Optional[str] = None
) -> list:
    """Trigger all webhooks subscribed to an event type.
    
    Args:
        event_type: The event type (e.g., 'document.created')
        payload: The payload data to send
        user_id: Optional user ID to filter webhooks
    
    Returns:
        List of WebhookDelivery records
    """
    # Query active webhooks subscribed to this event
    query = Webhook.query.filter(
        Webhook.is_active == True
    )
    
    if user_id:
        query = query.filter(Webhook.user_id == user_id)
    
    webhooks = query.all()
    
    deliveries = []
    for webhook in webhooks:
        if webhook.is_subscribed_to(event_type):
            delivery = trigger_webhook(webhook, event_type, payload)
            deliveries.append(delivery)
    
    return deliveries


def trigger_webhooks_async(
    event_type: str,
    payload: Dict[str, Any],
    user_id: Optional[str] = None
):
    """Trigger webhooks asynchronously in a background thread.
    
    Args:
        event_type: The event type (e.g., 'document.created')
        payload: The payload data to send
        user_id: Optional user ID to filter webhooks
    """
    from flask import current_app
    
    # Get app context for the thread
    app = current_app._get_current_object()
    
    def run_in_thread():
        with app.app_context():
            trigger_webhooks_for_event(event_type, payload, user_id)
    
    thread = threading.Thread(target=run_in_thread)
    thread.daemon = True
    thread.start()


def test_webhook(webhook: Webhook) -> WebhookDelivery:
    """Send a test event to a webhook.
    
    Args:
        webhook: The Webhook instance to test
    
    Returns:
        WebhookDelivery record
    """
    test_payload = {
        'message': 'This is a test webhook delivery',
        'webhook_name': webhook.name,
        'subscribed_events': webhook.events
    }
    
    return trigger_webhook(webhook, 'webhook.test', test_payload)


def cleanup_old_deliveries(days: int = 30):
    """Delete webhook deliveries older than specified days.
    
    Args:
        days: Number of days to keep deliveries
    """
    from datetime import timedelta
    
    cutoff = datetime.utcnow() - timedelta(days=days)
    
    WebhookDelivery.query.filter(
        WebhookDelivery.created_at < cutoff
    ).delete()
    
    db.session.commit()
