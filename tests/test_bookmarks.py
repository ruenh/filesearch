"""Tests for bookmarks API."""
import pytest
import io


class TestBookmarks:
    """Tests for bookmark functionality."""
    
    def test_create_bookmark(self, client, auth_headers):
        """Test creating bookmark."""
        # Create storage and document
        storage_response = client.post('/api/storage',
            json={'name': 'Bookmark Storage'},
            headers=auth_headers
        )
        storage_id = storage_response.get_json()['id']
        
        upload_data = {
            'file': (io.BytesIO(b'Bookmark content'), 'bookmark_test.txt'),
            'storage_id': str(storage_id)
        }
        doc_response = client.post('/api/documents',
            data=upload_data,
            content_type='multipart/form-data',
            headers=auth_headers
        )
        doc_id = doc_response.get_json()['id']
        
        # Create bookmark
        response = client.post('/api/bookmarks',
            json={
                'document_id': doc_id,
                'name': 'Important Section',
                'position': {'page': 1, 'offset': 100}
            },
            headers=auth_headers
        )
        assert response.status_code == 201
        data = response.get_json()
        assert data['name'] == 'Important Section'
    
    def test_list_bookmarks(self, client, auth_headers):
        """Test listing bookmarks for document."""
        # Create storage and document
        storage_response = client.post('/api/storage',
            json={'name': 'List Bookmark Storage'},
            headers=auth_headers
        )
        storage_id = storage_response.get_json()['id']
        
        upload_data = {
            'file': (io.BytesIO(b'List bookmarks'), 'list_bookmarks.txt'),
            'storage_id': str(storage_id)
        }
        doc_response = client.post('/api/documents',
            data=upload_data,
            content_type='multipart/form-data',
            headers=auth_headers
        )
        doc_id = doc_response.get_json()['id']
        
        # Create bookmarks
        client.post('/api/bookmarks',
            json={
                'document_id': doc_id,
                'name': 'Bookmark 1',
                'position': {'page': 1}
            },
            headers=auth_headers
        )
        client.post('/api/bookmarks',
            json={
                'document_id': doc_id,
                'name': 'Bookmark 2',
                'position': {'page': 2}
            },
            headers=auth_headers
        )
        
        # List
        response = client.get(f'/api/bookmarks?document_id={doc_id}',
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.get_json()
        assert len(data) == 2
    
    def test_delete_bookmark(self, client, auth_headers):
        """Test deleting bookmark."""
        # Create storage and document
        storage_response = client.post('/api/storage',
            json={'name': 'Delete Bookmark Storage'},
            headers=auth_headers
        )
        storage_id = storage_response.get_json()['id']
        
        upload_data = {
            'file': (io.BytesIO(b'Delete bookmark'), 'delete_bookmark.txt'),
            'storage_id': str(storage_id)
        }
        doc_response = client.post('/api/documents',
            data=upload_data,
            content_type='multipart/form-data',
            headers=auth_headers
        )
        doc_id = doc_response.get_json()['id']
        
        # Create bookmark
        create_response = client.post('/api/bookmarks',
            json={
                'document_id': doc_id,
                'name': 'To Delete',
                'position': {'page': 1}
            },
            headers=auth_headers
        )
        bookmark_id = create_response.get_json()['id']
        
        # Delete
        response = client.delete(f'/api/bookmarks/{bookmark_id}',
            headers=auth_headers
        )
        assert response.status_code == 200
