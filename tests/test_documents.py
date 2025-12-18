"""Tests for documents API."""
import pytest
import io


class TestDocumentUpload:
    """Tests for document upload."""
    
    def test_upload_text_file(self, client, auth_headers):
        """Test uploading a text file."""
        # Create storage first
        storage_response = client.post('/api/storage',
            json={'name': 'Upload Test Storage'},
            headers=auth_headers
        )
        storage_id = storage_response.get_json()['id']
        
        # Upload file
        data = {
            'file': (io.BytesIO(b'Test content'), 'test.txt'),
            'storage_id': str(storage_id)
        }
        response = client.post('/api/documents',
            data=data,
            content_type='multipart/form-data',
            headers=auth_headers
        )
        assert response.status_code == 201
        result = response.get_json()
        assert result['name'] == 'test.txt'
        assert result['mime_type'] == 'text/plain'
    
    def test_upload_without_storage(self, client, auth_headers):
        """Test uploading without storage_id."""
        data = {
            'file': (io.BytesIO(b'Test content'), 'test.txt')
        }
        response = client.post('/api/documents',
            data=data,
            content_type='multipart/form-data',
            headers=auth_headers
        )
        assert response.status_code == 400
    
    def test_upload_without_file(self, client, auth_headers):
        """Test uploading without file."""
        # Create storage first
        storage_response = client.post('/api/storage',
            json={'name': 'No File Storage'},
            headers=auth_headers
        )
        storage_id = storage_response.get_json()['id']
        
        response = client.post('/api/documents',
            data={'storage_id': str(storage_id)},
            content_type='multipart/form-data',
            headers=auth_headers
        )
        assert response.status_code == 400


class TestDocumentList:
    """Tests for listing documents."""
    
    def test_list_documents_empty(self, client, auth_headers):
        """Test listing documents when empty."""
        response = client.get('/api/documents', headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert 'documents' in data
        assert data['documents'] == []
    
    def test_list_documents_with_storage_filter(self, client, auth_headers):
        """Test listing documents filtered by storage."""
        # Create storage
        storage_response = client.post('/api/storage',
            json={'name': 'Filter Test'},
            headers=auth_headers
        )
        storage_id = storage_response.get_json()['id']
        
        # Upload document
        data = {
            'file': (io.BytesIO(b'Test'), 'filter_test.txt'),
            'storage_id': str(storage_id)
        }
        client.post('/api/documents',
            data=data,
            content_type='multipart/form-data',
            headers=auth_headers
        )
        
        # List with filter
        response = client.get(f'/api/documents?storage_id={storage_id}',
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.get_json()
        assert len(data['documents']) == 1


class TestDocumentGet:
    """Tests for getting single document."""
    
    def test_get_document_success(self, client, auth_headers):
        """Test getting existing document."""
        # Create storage and upload document
        storage_response = client.post('/api/storage',
            json={'name': 'Get Doc Storage'},
            headers=auth_headers
        )
        storage_id = storage_response.get_json()['id']
        
        upload_data = {
            'file': (io.BytesIO(b'Get test content'), 'get_test.txt'),
            'storage_id': str(storage_id)
        }
        upload_response = client.post('/api/documents',
            data=upload_data,
            content_type='multipart/form-data',
            headers=auth_headers
        )
        doc_id = upload_response.get_json()['id']
        
        # Get document
        response = client.get(f'/api/documents/{doc_id}', headers=auth_headers)
        assert response.status_code == 200
        assert response.get_json()['name'] == 'get_test.txt'
    
    def test_get_document_not_found(self, client, auth_headers):
        """Test getting non-existent document."""
        response = client.get('/api/documents/99999', headers=auth_headers)
        assert response.status_code == 404


class TestDocumentDelete:
    """Tests for document deletion (soft delete)."""
    
    def test_delete_document_soft(self, client, auth_headers):
        """Test soft delete moves to trash."""
        # Create storage and upload document
        storage_response = client.post('/api/storage',
            json={'name': 'Delete Doc Storage'},
            headers=auth_headers
        )
        storage_id = storage_response.get_json()['id']
        
        upload_data = {
            'file': (io.BytesIO(b'Delete test'), 'delete_test.txt'),
            'storage_id': str(storage_id)
        }
        upload_response = client.post('/api/documents',
            data=upload_data,
            content_type='multipart/form-data',
            headers=auth_headers
        )
        doc_id = upload_response.get_json()['id']
        
        # Delete document
        response = client.delete(f'/api/documents/{doc_id}', headers=auth_headers)
        assert response.status_code == 200
        
        # Document should still exist but be in trash
        get_response = client.get(f'/api/documents/{doc_id}', headers=auth_headers)
        assert get_response.status_code == 200
        assert get_response.get_json()['deleted_at'] is not None


class TestDocumentRestore:
    """Tests for document restoration."""
    
    def test_restore_document(self, client, auth_headers):
        """Test restoring deleted document."""
        # Create storage and upload document
        storage_response = client.post('/api/storage',
            json={'name': 'Restore Doc Storage'},
            headers=auth_headers
        )
        storage_id = storage_response.get_json()['id']
        
        upload_data = {
            'file': (io.BytesIO(b'Restore test'), 'restore_test.txt'),
            'storage_id': str(storage_id)
        }
        upload_response = client.post('/api/documents',
            data=upload_data,
            content_type='multipart/form-data',
            headers=auth_headers
        )
        doc_id = upload_response.get_json()['id']
        
        # Delete then restore
        client.delete(f'/api/documents/{doc_id}', headers=auth_headers)
        response = client.post(f'/api/documents/{doc_id}/restore', headers=auth_headers)
        assert response.status_code == 200
        
        # Verify restored
        get_response = client.get(f'/api/documents/{doc_id}', headers=auth_headers)
        assert get_response.get_json()['deleted_at'] is None
