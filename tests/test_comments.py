"""Tests for comments API."""
import pytest
import io


class TestComments:
    """Tests for comment functionality."""
    
    def test_create_comment(self, client, auth_headers):
        """Test creating a comment."""
        # Create storage and document
        storage_response = client.post('/api/storage',
            json={'name': 'Comment Storage'},
            headers=auth_headers
        )
        storage_id = storage_response.get_json()['id']
        
        upload_data = {
            'file': (io.BytesIO(b'Comment content'), 'comment_test.txt'),
            'storage_id': str(storage_id)
        }
        doc_response = client.post('/api/documents',
            data=upload_data,
            content_type='multipart/form-data',
            headers=auth_headers
        )
        doc_id = doc_response.get_json()['id']
        
        # Create comment
        response = client.post('/api/comments',
            json={'document_id': doc_id, 'content': 'This is a test comment'},
            headers=auth_headers
        )
        assert response.status_code == 201
        data = response.get_json()
        assert data['content'] == 'This is a test comment'
    
    def test_list_comments(self, client, auth_headers):
        """Test listing comments for a document."""
        # Create storage and document
        storage_response = client.post('/api/storage',
            json={'name': 'List Comment Storage'},
            headers=auth_headers
        )
        storage_id = storage_response.get_json()['id']
        
        upload_data = {
            'file': (io.BytesIO(b'List comments'), 'list_comments.txt'),
            'storage_id': str(storage_id)
        }
        doc_response = client.post('/api/documents',
            data=upload_data,
            content_type='multipart/form-data',
            headers=auth_headers
        )
        doc_id = doc_response.get_json()['id']
        
        # Create comments
        client.post('/api/comments',
            json={'document_id': doc_id, 'content': 'Comment 1'},
            headers=auth_headers
        )
        client.post('/api/comments',
            json={'document_id': doc_id, 'content': 'Comment 2'},
            headers=auth_headers
        )
        
        # List comments
        response = client.get(f'/api/comments/{doc_id}', headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert len(data) == 2
    
    def test_create_reply(self, client, auth_headers):
        """Test creating a reply to a comment."""
        # Create storage and document
        storage_response = client.post('/api/storage',
            json={'name': 'Reply Storage'},
            headers=auth_headers
        )
        storage_id = storage_response.get_json()['id']
        
        upload_data = {
            'file': (io.BytesIO(b'Reply content'), 'reply_test.txt'),
            'storage_id': str(storage_id)
        }
        doc_response = client.post('/api/documents',
            data=upload_data,
            content_type='multipart/form-data',
            headers=auth_headers
        )
        doc_id = doc_response.get_json()['id']
        
        # Create parent comment
        parent_response = client.post('/api/comments',
            json={'document_id': doc_id, 'content': 'Parent comment'},
            headers=auth_headers
        )
        parent_id = parent_response.get_json()['id']
        
        # Create reply
        response = client.post('/api/comments',
            json={
                'document_id': doc_id,
                'content': 'Reply comment',
                'parent_id': parent_id
            },
            headers=auth_headers
        )
        assert response.status_code == 201
        assert response.get_json()['parent_id'] == parent_id
    
    def test_delete_comment(self, client, auth_headers):
        """Test deleting a comment."""
        # Create storage and document
        storage_response = client.post('/api/storage',
            json={'name': 'Delete Comment Storage'},
            headers=auth_headers
        )
        storage_id = storage_response.get_json()['id']
        
        upload_data = {
            'file': (io.BytesIO(b'Delete comment'), 'delete_comment.txt'),
            'storage_id': str(storage_id)
        }
        doc_response = client.post('/api/documents',
            data=upload_data,
            content_type='multipart/form-data',
            headers=auth_headers
        )
        doc_id = doc_response.get_json()['id']
        
        # Create comment
        comment_response = client.post('/api/comments',
            json={'document_id': doc_id, 'content': 'To delete'},
            headers=auth_headers
        )
        comment_id = comment_response.get_json()['id']
        
        # Delete comment
        response = client.delete(f'/api/comments/{comment_id}', headers=auth_headers)
        assert response.status_code == 200
