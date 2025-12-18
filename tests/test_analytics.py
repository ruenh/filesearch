"""Tests for analytics API."""
import pytest


class TestAnalyticsDashboard:
    """Tests for analytics dashboard."""
    
    def test_get_dashboard(self, client, auth_headers):
        """Test getting analytics dashboard."""
        response = client.get('/api/analytics/dashboard', headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert 'total_documents' in data
        assert 'total_storage_used' in data


class TestAnalyticsTrends:
    """Tests for analytics trends."""
    
    def test_get_trends(self, client, auth_headers):
        """Test getting search trends."""
        response = client.get('/api/analytics/trends', headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)


class TestAnalyticsReport:
    """Tests for analytics reports."""
    
    def test_get_report(self, client, auth_headers):
        """Test getting analytics report."""
        response = client.get('/api/analytics/report', headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert 'period' in data
        assert 'data' in data
    
    def test_get_report_with_date_range(self, client, auth_headers):
        """Test getting report with date range."""
        response = client.get(
            '/api/analytics/report?start_date=2024-01-01&end_date=2024-12-31',
            headers=auth_headers
        )
        assert response.status_code == 200


class TestAnalyticsExport:
    """Tests for analytics export."""
    
    def test_export_csv(self, client, auth_headers):
        """Test exporting analytics as CSV."""
        response = client.get('/api/analytics/export?format=csv',
            headers=auth_headers
        )
        assert response.status_code == 200
        assert 'text/csv' in response.content_type
