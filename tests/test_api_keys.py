"""Tests for API keys management."""
import pytest


class TestAPIKeyCreate:
    """Tests for API key creation."""
    
    def test_create_api_key(self, client, auth_headers):
        """Test creating API key."""
        response = client.post('/api/api-keys',
            json={'name': 'Test API Key'},
            headers=auth_headers
        )
        assert response.status_code == 201
        data = response.get_json()
        assert 'key' in data
        assert data['name'] == 'Test API Key'
    
    def test_create_api_key_with_scopes(self, client, auth_headers):
        """Test creating API key with specific scopes."""
        response = client.post('/api/api-keys',
            json={
                'name': 'Scoped Key',
                'scopes': ['read:documents', 'write:documents']
            },
            headers=auth_headers
        )
        assert response.status_code == 201
        data = response.get_json()
        assert 'read:documents' in data['scopes']


class TestAPIKeyList:
    """Tests for listing API keys."""
    
    def test_list_api_keys(self, client, auth_headers):
        """Test listing API keys."""
        # Create some keys
        client.post('/api/api-keys',
            json={'name': 'Key 1'},
            headers=auth_headers
        )
        client.post('/api/api-keys',
            json={'name': 'Key 2'},
            headers=auth_headers
        )
        
        response = client.get('/api/api-keys', headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert len(data) >= 2


class TestAPIKeyDelete:
    """Tests for API key deletion."""
    
    def test_delete_api_key(self, client, auth_headers):
        """Test deleting API key."""
        # Create key
        create_response = client.post('/api/api-keys',
            json={'name': 'To Delete'},
            headers=auth_headers
        )
        key_id = create_response.get_json()['id']
        
        # Delete
        response = client.delete(f'/api/api-keys/{key_id}', headers=auth_headers)
        assert response.status_code == 200


class TestAPIKeyUsage:
    """Tests for using API keys."""
    
    def test_use_api_key(self, client, auth_headers):
        """Test using API key for authentication."""
        # Create key
        create_response = client.post('/api/api-keys',
            json={'name': 'Usage Test Key'},
            headers=auth_headers
        )
        api_key = create_response.get_json()['key']
        
        # Use key to access API
        response = client.get('/api/storage',
            headers={'X-API-Key': api_key}
        )
        assert response.status_code == 200
