"""Tests for folders API."""
import pytest


class TestFolderCreate:
    """Tests for folder creation."""
    
    def test_create_folder_success(self, client, auth_headers):
        """Test successful folder creation."""
        # Create storage first
        storage_response = client.post('/api/storage',
            json={'name': 'Folder Test Storage'},
            headers=auth_headers
        )
        storage_id = storage_response.get_json()['id']
        
        response = client.post('/api/folders',
            json={'name': 'Test Folder', 'storage_id': storage_id},
            headers=auth_headers
        )
        assert response.status_code == 201
        data = response.get_json()
        assert data['name'] == 'Test Folder'
    
    def test_create_nested_folder(self, client, auth_headers):
        """Test creating nested folder."""
        # Create storage
        storage_response = client.post('/api/storage',
            json={'name': 'Nested Folder Storage'},
            headers=auth_headers
        )
        storage_id = storage_response.get_json()['id']
        
        # Create parent folder
        parent_response = client.post('/api/folders',
            json={'name': 'Parent', 'storage_id': storage_id},
            headers=auth_headers
        )
        parent_id = parent_response.get_json()['id']
        
        # Create child folder
        response = client.post('/api/folders',
            json={'name': 'Child', 'storage_id': storage_id, 'parent_id': parent_id},
            headers=auth_headers
        )
        assert response.status_code == 201
        assert response.get_json()['parent_id'] == parent_id


class TestFolderList:
    """Tests for listing folders."""
    
    def test_list_folders(self, client, auth_headers):
        """Test listing folders."""
        # Create storage
        storage_response = client.post('/api/storage',
            json={'name': 'List Folder Storage'},
            headers=auth_headers
        )
        storage_id = storage_response.get_json()['id']
        
        # Create folders
        client.post('/api/folders',
            json={'name': 'Folder 1', 'storage_id': storage_id},
            headers=auth_headers
        )
        client.post('/api/folders',
            json={'name': 'Folder 2', 'storage_id': storage_id},
            headers=auth_headers
        )
        
        response = client.get(f'/api/folders?storage_id={storage_id}',
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.get_json()
        assert len(data) == 2


class TestFolderUpdate:
    """Tests for folder update."""
    
    def test_update_folder_name(self, client, auth_headers):
        """Test updating folder name."""
        # Create storage and folder
        storage_response = client.post('/api/storage',
            json={'name': 'Update Folder Storage'},
            headers=auth_headers
        )
        storage_id = storage_response.get_json()['id']
        
        folder_response = client.post('/api/folders',
            json={'name': 'Original Name', 'storage_id': storage_id},
            headers=auth_headers
        )
        folder_id = folder_response.get_json()['id']
        
        # Update
        response = client.put(f'/api/folders/{folder_id}',
            json={'name': 'Updated Name'},
            headers=auth_headers
        )
        assert response.status_code == 200
        assert response.get_json()['name'] == 'Updated Name'


class TestFolderDelete:
    """Tests for folder deletion."""
    
    def test_delete_folder(self, client, auth_headers):
        """Test deleting folder."""
        # Create storage and folder
        storage_response = client.post('/api/storage',
            json={'name': 'Delete Folder Storage'},
            headers=auth_headers
        )
        storage_id = storage_response.get_json()['id']
        
        folder_response = client.post('/api/folders',
            json={'name': 'To Delete', 'storage_id': storage_id},
            headers=auth_headers
        )
        folder_id = folder_response.get_json()['id']
        
        # Delete
        response = client.delete(f'/api/folders/{folder_id}', headers=auth_headers)
        assert response.status_code == 200
        
        # Verify deleted
        get_response = client.get(f'/api/folders/{folder_id}', headers=auth_headers)
        assert get_response.status_code == 404
