"""Tests for storage API."""
import pytest


class TestStorageCreate:
    """Tests for storage creation."""
    
    def test_create_storage_success(self, client, auth_headers):
        """Test successful storage creation."""
        response = client.post('/api/storage', 
            json={'name': 'Test Storage', 'description': 'Test description'},
            headers=auth_headers
        )
        assert response.status_code == 201
        data = response.get_json()
        assert data['name'] == 'Test Storage'
        assert 'id' in data
    
    def test_create_storage_missing_name(self, client, auth_headers):
        """Test storage creation without name."""
        response = client.post('/api/storage',
            json={'description': 'No name'},
            headers=auth_headers
        )
        assert response.status_code == 400
    
    def test_create_storage_unauthenticated(self, client):
        """Test storage creation without authentication."""
        response = client.post('/api/storage',
            json={'name': 'Test Storage'}
        )
        assert response.status_code == 401


class TestStorageList:
    """Tests for listing storages."""
    
    def test_list_storages_empty(self, client, auth_headers):
        """Test listing storages when empty."""
        response = client.get('/api/storage', headers=auth_headers)
        assert response.status_code == 200
        assert response.get_json() == []
    
    def test_list_storages_with_data(self, client, auth_headers):
        """Test listing storages with data."""
        # Create storages
        client.post('/api/storage',
            json={'name': 'Storage 1'},
            headers=auth_headers
        )
        client.post('/api/storage',
            json={'name': 'Storage 2'},
            headers=auth_headers
        )
        
        response = client.get('/api/storage', headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert len(data) == 2


class TestStorageGet:
    """Tests for getting single storage."""
    
    def test_get_storage_success(self, client, auth_headers):
        """Test getting existing storage."""
        # Create storage
        create_response = client.post('/api/storage',
            json={'name': 'Get Test'},
            headers=auth_headers
        )
        storage_id = create_response.get_json()['id']
        
        # Get storage
        response = client.get(f'/api/storage/{storage_id}', headers=auth_headers)
        assert response.status_code == 200
        assert response.get_json()['name'] == 'Get Test'
    
    def test_get_storage_not_found(self, client, auth_headers):
        """Test getting non-existent storage."""
        response = client.get('/api/storage/99999', headers=auth_headers)
        assert response.status_code == 404


class TestStorageDelete:
    """Tests for storage deletion."""
    
    def test_delete_storage_success(self, client, auth_headers):
        """Test successful storage deletion."""
        # Create storage
        create_response = client.post('/api/storage',
            json={'name': 'Delete Test'},
            headers=auth_headers
        )
        storage_id = create_response.get_json()['id']
        
        # Delete storage
        response = client.delete(f'/api/storage/{storage_id}', headers=auth_headers)
        assert response.status_code == 200
        
        # Verify deleted
        get_response = client.get(f'/api/storage/{storage_id}', headers=auth_headers)
        assert get_response.status_code == 404
    
    def test_delete_storage_not_found(self, client, auth_headers):
        """Test deleting non-existent storage."""
        response = client.delete('/api/storage/99999', headers=auth_headers)
        assert response.status_code == 404
