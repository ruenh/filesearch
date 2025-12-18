"""Tests for activity API."""
import pytest


class TestActivity:
    """Tests for activity feed."""
    
    def test_list_activity(self, client, auth_headers):
        """Test listing activity."""
        response = client.get('/api/activity', headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert 'activities' in data
    
    def test_list_activity_with_filter(self, client, auth_headers):
        """Test listing activity with type filter."""
        response = client.get('/api/activity?type=document',
            headers=auth_headers
        )
        assert response.status_code == 200
    
    def test_list_activity_pagination(self, client, auth_headers):
        """Test activity pagination."""
        response = client.get('/api/activity?page=1&per_page=10',
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.get_json()
        assert 'total' in data
        assert 'page' in data
