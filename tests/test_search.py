"""Tests for search API."""
import pytest
import io


class TestSearch:
    """Tests for search functionality."""
    
    def test_search_empty_query(self, client, auth_headers):
        """Test search with empty query."""
        response = client.post('/api/search',
            json={'query': ''},
            headers=auth_headers
        )
        assert response.status_code == 400
    
    def test_search_basic(self, client, auth_headers):
        """Test basic search."""
        # Create storage and document
        storage_response = client.post('/api/storage',
            json={'name': 'Search Storage'},
            headers=auth_headers
        )
        storage_id = storage_response.get_json()['id']
        
        upload_data = {
            'file': (io.BytesIO(b'Searchable content here'), 'search_test.txt'),
            'storage_id': str(storage_id)
        }
        client.post('/api/documents',
            data=upload_data,
            content_type='multipart/form-data',
            headers=auth_headers
        )
        
        # Search
        response = client.post('/api/search',
            json={'query': 'searchable', 'storage_id': storage_id},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.get_json()
        assert 'results' in data


class TestSearchHistory:
    """Tests for search history."""
    
    def test_get_search_history(self, client, auth_headers):
        """Test getting search history."""
        # Perform a search first
        client.post('/api/search',
            json={'query': 'test query'},
            headers=auth_headers
        )
        
        # Get history
        response = client.get('/api/search/history', headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)


class TestSearchSuggestions:
    """Tests for search suggestions."""
    
    def test_get_suggestions(self, client, auth_headers):
        """Test getting search suggestions."""
        response = client.get('/api/search/suggestions?q=test',
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)


class TestSavedSearches:
    """Tests for saved searches."""
    
    def test_save_search(self, client, auth_headers):
        """Test saving a search."""
        response = client.post('/api/search/save',
            json={'name': 'My Search', 'query': 'important documents'},
            headers=auth_headers
        )
        assert response.status_code == 201
        data = response.get_json()
        assert data['name'] == 'My Search'
    
    def test_list_saved_searches(self, client, auth_headers):
        """Test listing saved searches."""
        # Save a search first
        client.post('/api/search/save',
            json={'name': 'Saved Search', 'query': 'test'},
            headers=auth_headers
        )
        
        response = client.get('/api/search/saved', headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert len(data) >= 1
