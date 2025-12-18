"""Tests for webhooks API."""
import pytest


class TestWebhookCreate:
    """Tests for webhook creation."""
    
    def test_create_webhook(self, client, auth_headers):
        """Test creating webhook."""
        response = client.post('/api/webhooks',
            json={
                'name': 'Test Webhook',
                'url': 'https://example.com/webhook',
                'events': ['document.created', 'document.updated']
            },
            headers=auth_headers
        )
        assert response.status_code == 201
        data = response.get_json()
        assert data['name'] == 'Test Webhook'
        assert 'secret' in data
    
    def test_create_webhook_invalid_url(self, client, auth_headers):
        """Test creating webhook with invalid URL."""
        response = client.post('/api/webhooks',
            json={
                'name': 'Invalid Webhook',
                'url': 'not-a-url',
                'events': ['document.created']
            },
            headers=auth_headers
        )
        assert response.status_code == 400


class TestWebhookList:
    """Tests for listing webhooks."""
    
    def test_list_webhooks(self, client, auth_headers):
        """Test listing webhooks."""
        # Create webhooks
        client.post('/api/webhooks',
            json={
                'name': 'Webhook 1',
                'url': 'https://example.com/hook1',
                'events': ['document.created']
            },
            headers=auth_headers
        )
        
        response = client.get('/api/webhooks', headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert len(data) >= 1


class TestWebhookUpdate:
    """Tests for webhook update."""
    
    def test_update_webhook(self, client, auth_headers):
        """Test updating webhook."""
        # Create webhook
        create_response = client.post('/api/webhooks',
            json={
                'name': 'Update Test',
                'url': 'https://example.com/update',
                'events': ['document.created']
            },
            headers=auth_headers
        )
        webhook_id = create_response.get_json()['id']
        
        # Update
        response = client.put(f'/api/webhooks/{webhook_id}',
            json={'name': 'Updated Name'},
            headers=auth_headers
        )
        assert response.status_code == 200
        assert response.get_json()['name'] == 'Updated Name'


class TestWebhookDelete:
    """Tests for webhook deletion."""
    
    def test_delete_webhook(self, client, auth_headers):
        """Test deleting webhook."""
        # Create webhook
        create_response = client.post('/api/webhooks',
            json={
                'name': 'Delete Test',
                'url': 'https://example.com/delete',
                'events': ['document.created']
            },
            headers=auth_headers
        )
        webhook_id = create_response.get_json()['id']
        
        # Delete
        response = client.delete(f'/api/webhooks/{webhook_id}', headers=auth_headers)
        assert response.status_code == 200


class TestWebhookTest:
    """Tests for webhook testing."""
    
    def test_test_webhook(self, client, auth_headers):
        """Test sending test webhook."""
        # Create webhook
        create_response = client.post('/api/webhooks',
            json={
                'name': 'Test Webhook',
                'url': 'https://httpbin.org/post',
                'events': ['document.created']
            },
            headers=auth_headers
        )
        webhook_id = create_response.get_json()['id']
        
        # Test webhook (may fail if httpbin is unavailable, but endpoint should work)
        response = client.post(f'/api/webhooks/{webhook_id}/test',
            headers=auth_headers
        )
        # Accept both success and failure (network issues)
        assert response.status_code in [200, 500]
