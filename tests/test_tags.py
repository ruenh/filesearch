"""Tests for tags API."""
import pytest
import io


class TestTagCreate:
    """Tests for tag creation."""
    
    def test_create_tag_success(self, client, auth_headers):
        """Test successful tag creation."""
        response = client.post('/api/tags',
            json={'name': 'important', 'color': '#ff0000'},
            headers=auth_headers
        )
        assert response.status_code == 201
        data = response.get_json()
        assert data['name'] == 'important'
        assert data['color'] == '#ff0000'
    
    def test_create_tag_default_color(self, client, auth_headers):
        """Test tag creation with default color."""
        response = client.post('/api/tags',
            json={'name': 'default-color'},
            headers=auth_headers
        )
        assert response.status_code == 201
        assert 'color' in response.get_json()


class TestTagList:
    """Tests for listing tags."""
    
    def test_list_tags(self, client, auth_headers):
        """Test listing all tags."""
        # Create tags
        client.post('/api/tags', json={'name': 'tag1'}, headers=auth_headers)
        client.post('/api/tags', json={'name': 'tag2'}, headers=auth_headers)
        
        response = client.get('/api/tags', headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert len(data) >= 2


class TestDocumentTags:
    """Tests for document tagging."""
    
    def test_add_tag_to_document(self, client, auth_headers):
        """Test adding tag to document."""
        # Create storage
        storage_response = client.post('/api/storage',
            json={'name': 'Tag Doc Storage'},
            headers=auth_headers
        )
        storage_id = storage_response.get_json()['id']
        
        # Upload document
        upload_data = {
            'file': (io.BytesIO(b'Tag test'), 'tag_test.txt'),
            'storage_id': str(storage_id)
        }
        doc_response = client.post('/api/documents',
            data=upload_data,
            content_type='multipart/form-data',
            headers=auth_headers
        )
        doc_id = doc_response.get_json()['id']
        
        # Create tag
        tag_response = client.post('/api/tags',
            json={'name': 'doc-tag'},
            headers=auth_headers
        )
        tag_id = tag_response.get_json()['id']
        
        # Add tag to document
        response = client.put(f'/api/documents/{doc_id}/tags',
            json={'tags': [tag_id]},
            headers=auth_headers
        )
        assert response.status_code == 200
    
    def test_filter_documents_by_tag(self, client, auth_headers):
        """Test filtering documents by tag."""
        # Create storage
        storage_response = client.post('/api/storage',
            json={'name': 'Filter Tag Storage'},
            headers=auth_headers
        )
        storage_id = storage_response.get_json()['id']
        
        # Upload document
        upload_data = {
            'file': (io.BytesIO(b'Filter tag test'), 'filter_tag.txt'),
            'storage_id': str(storage_id)
        }
        doc_response = client.post('/api/documents',
            data=upload_data,
            content_type='multipart/form-data',
            headers=auth_headers
        )
        doc_id = doc_response.get_json()['id']
        
        # Create and add tag
        tag_response = client.post('/api/tags',
            json={'name': 'filter-tag'},
            headers=auth_headers
        )
        tag_id = tag_response.get_json()['id']
        
        client.put(f'/api/documents/{doc_id}/tags',
            json={'tags': [tag_id]},
            headers=auth_headers
        )
        
        # Filter by tag
        response = client.get(f'/api/documents?tag={tag_id}',
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.get_json()
        assert len(data['documents']) >= 1
