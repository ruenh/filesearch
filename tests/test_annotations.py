"""Tests for annotations API."""
import pytest
import io


class TestAnnotations:
    """Tests for annotation functionality."""
    
    def test_create_annotation(self, client, auth_headers):
        """Test creating annotation."""
        # Create storage and document
        storage_response = client.post('/api/storage',
            json={'name': 'Annotation Storage'},
            headers=auth_headers
        )
        storage_id = storage_response.get_json()['id']
        
        upload_data = {
            'file': (io.BytesIO(b'Annotation content'), 'annotation_test.txt'),
            'storage_id': str(storage_id)
        }
        doc_response = client.post('/api/documents',
            data=upload_data,
            content_type='multipart/form-data',
            headers=auth_headers
        )
        doc_id = doc_response.get_json()['id']
        
        # Create annotation
        response = client.post('/api/annotations',
            json={
                'document_id': doc_id,
                'type': 'highlight',
                'content': 'Important text',
                'position': {'start': 0, 'end': 10}
            },
            headers=auth_headers
        )
        assert response.status_code == 201
        data = response.get_json()
        assert data['type'] == 'highlight'
    
    def test_list_annotations(self, client, auth_headers):
        """Test listing annotations for document."""
        # Create storage and document
        storage_response = client.post('/api/storage',
            json={'name': 'List Annotation Storage'},
            headers=auth_headers
        )
        storage_id = storage_response.get_json()['id']
        
        upload_data = {
            'file': (io.BytesIO(b'List annotations'), 'list_annotations.txt'),
            'storage_id': str(storage_id)
        }
        doc_response = client.post('/api/documents',
            data=upload_data,
            content_type='multipart/form-data',
            headers=auth_headers
        )
        doc_id = doc_response.get_json()['id']
        
        # Create annotations
        client.post('/api/annotations',
            json={
                'document_id': doc_id,
                'type': 'highlight',
                'content': 'First',
                'position': {'start': 0, 'end': 5}
            },
            headers=auth_headers
        )
        
        # List
        response = client.get(f'/api/annotations?document_id={doc_id}',
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.get_json()
        assert len(data) >= 1
    
    def test_delete_annotation(self, client, auth_headers):
        """Test deleting annotation."""
        # Create storage and document
        storage_response = client.post('/api/storage',
            json={'name': 'Delete Annotation Storage'},
            headers=auth_headers
        )
        storage_id = storage_response.get_json()['id']
        
        upload_data = {
            'file': (io.BytesIO(b'Delete annotation'), 'delete_annotation.txt'),
            'storage_id': str(storage_id)
        }
        doc_response = client.post('/api/documents',
            data=upload_data,
            content_type='multipart/form-data',
            headers=auth_headers
        )
        doc_id = doc_response.get_json()['id']
        
        # Create annotation
        create_response = client.post('/api/annotations',
            json={
                'document_id': doc_id,
                'type': 'note',
                'content': 'To delete',
                'position': {'start': 0, 'end': 5}
            },
            headers=auth_headers
        )
        annotation_id = create_response.get_json()['id']
        
        # Delete
        response = client.delete(f'/api/annotations/{annotation_id}',
            headers=auth_headers
        )
        assert response.status_code == 200
