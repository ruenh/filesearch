"""Tests for share API."""
import pytest
import io


class TestShareLink:
    """Tests for share link functionality."""
    
    def test_create_share_link(self, client, auth_headers):
        """Test creating share link."""
        # Create storage and document
        storage_response = client.post('/api/storage',
            json={'name': 'Share Storage'},
            headers=auth_headers
        )
        storage_id = storage_response.get_json()['id']
        
        upload_data = {
            'file': (io.BytesIO(b'Share content'), 'share_test.txt'),
            'storage_id': str(storage_id)
        }
        doc_response = client.post('/api/documents',
            data=upload_data,
            content_type='multipart/form-data',
            headers=auth_headers
        )
        doc_id = doc_response.get_json()['id']
        
        # Create share link
        response = client.post('/api/share',
            json={'document_id': doc_id},
            headers=auth_headers
        )
        assert response.status_code == 201
        data = response.get_json()
        assert 'token' in data
        assert 'url' in data
    
    def test_create_share_link_with_password(self, client, auth_headers):
        """Test creating password-protected share link."""
        # Create storage and document
        storage_response = client.post('/api/storage',
            json={'name': 'Password Share Storage'},
            headers=auth_headers
        )
        storage_id = storage_response.get_json()['id']
        
        upload_data = {
            'file': (io.BytesIO(b'Protected content'), 'protected.txt'),
            'storage_id': str(storage_id)
        }
        doc_response = client.post('/api/documents',
            data=upload_data,
            content_type='multipart/form-data',
            headers=auth_headers
        )
        doc_id = doc_response.get_json()['id']
        
        # Create share link with password
        response = client.post('/api/share',
            json={'document_id': doc_id, 'password': 'secret123'},
            headers=auth_headers
        )
        assert response.status_code == 201
        assert response.get_json()['password_protected'] is True
    
    def test_access_share_link(self, client, auth_headers):
        """Test accessing shared document via link."""
        # Create storage and document
        storage_response = client.post('/api/storage',
            json={'name': 'Access Share Storage'},
            headers=auth_headers
        )
        storage_id = storage_response.get_json()['id']
        
        upload_data = {
            'file': (io.BytesIO(b'Accessible content'), 'accessible.txt'),
            'storage_id': str(storage_id)
        }
        doc_response = client.post('/api/documents',
            data=upload_data,
            content_type='multipart/form-data',
            headers=auth_headers
        )
        doc_id = doc_response.get_json()['id']
        
        # Create share link
        share_response = client.post('/api/share',
            json={'document_id': doc_id},
            headers=auth_headers
        )
        token = share_response.get_json()['token']
        
        # Access via token (no auth needed)
        response = client.get(f'/api/share/{token}')
        assert response.status_code == 200
    
    def test_delete_share_link(self, client, auth_headers):
        """Test deleting share link."""
        # Create storage and document
        storage_response = client.post('/api/storage',
            json={'name': 'Delete Share Storage'},
            headers=auth_headers
        )
        storage_id = storage_response.get_json()['id']
        
        upload_data = {
            'file': (io.BytesIO(b'Delete share content'), 'delete_share.txt'),
            'storage_id': str(storage_id)
        }
        doc_response = client.post('/api/documents',
            data=upload_data,
            content_type='multipart/form-data',
            headers=auth_headers
        )
        doc_id = doc_response.get_json()['id']
        
        # Create share link
        share_response = client.post('/api/share',
            json={'document_id': doc_id},
            headers=auth_headers
        )
        share_id = share_response.get_json()['id']
        
        # Delete share link
        response = client.delete(f'/api/share/{share_id}', headers=auth_headers)
        assert response.status_code == 200
