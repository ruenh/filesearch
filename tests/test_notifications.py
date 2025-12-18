"""Tests for notifications API."""
import pytest


class TestNotifications:
    """Tests for notification functionality."""
    
    def test_list_notifications(self, client, auth_headers):
        """Test listing notifications."""
        response = client.get('/api/notifications', headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert 'notifications' in data
        assert 'unread_count' in data
    
    def test_mark_notification_read(self, client, auth_headers, db_session):
        """Test marking notification as read."""
        from backend.models import Notification, User
        
        # Get user ID from token
        me_response = client.get('/api/auth/me', headers=auth_headers)
        user_id = me_response.get_json()['user']['id']
        
        # Create notification directly
        notification = Notification(
            user_id=user_id,
            type='info',
            title='Test Notification',
            message='Test message'
        )
        db_session.add(notification)
        db_session.commit()
        
        # Mark as read
        response = client.put(f'/api/notifications/{notification.id}/read',
            headers=auth_headers
        )
        assert response.status_code == 200
    
    def test_mark_all_read(self, client, auth_headers, db_session):
        """Test marking all notifications as read."""
        from backend.models import Notification
        
        # Get user ID
        me_response = client.get('/api/auth/me', headers=auth_headers)
        user_id = me_response.get_json()['user']['id']
        
        # Create notifications
        for i in range(3):
            notification = Notification(
                user_id=user_id,
                type='info',
                title=f'Notification {i}',
                message=f'Message {i}'
            )
            db_session.add(notification)
        db_session.commit()
        
        # Mark all as read
        response = client.put('/api/notifications/read-all', headers=auth_headers)
        assert response.status_code == 200
    
    def test_delete_notification(self, client, auth_headers, db_session):
        """Test deleting notification."""
        from backend.models import Notification
        
        # Get user ID
        me_response = client.get('/api/auth/me', headers=auth_headers)
        user_id = me_response.get_json()['user']['id']
        
        # Create notification
        notification = Notification(
            user_id=user_id,
            type='info',
            title='To Delete',
            message='Delete me'
        )
        db_session.add(notification)
        db_session.commit()
        
        # Delete
        response = client.delete(f'/api/notifications/{notification.id}',
            headers=auth_headers
        )
        assert response.status_code == 200
