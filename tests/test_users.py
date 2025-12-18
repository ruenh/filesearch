"""Tests for users API."""
import pytest


class TestUserList:
    """Tests for listing users (admin only)."""
    
    def test_list_users_as_admin(self, client, admin_headers):
        """Test listing users as admin."""
        response = client.get('/api/users', headers=admin_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)
    
    def test_list_users_as_non_admin(self, client, auth_headers):
        """Test listing users as non-admin (should fail)."""
        response = client.get('/api/users', headers=auth_headers)
        assert response.status_code == 403


class TestUserUpdate:
    """Tests for updating users."""
    
    def test_update_user_role_as_admin(self, client, admin_headers, db_session):
        """Test updating user role as admin."""
        from backend.models import User
        from backend.utils.auth import hash_password
        
        # Create a user to update
        user = User(
            email='toupdate@example.com',
            password_hash=hash_password('Password123'),
            name='To Update',
            role='viewer'
        )
        db_session.add(user)
        db_session.commit()
        
        # Update role
        response = client.put(f'/api/users/{user.id}',
            json={'role': 'editor'},
            headers=admin_headers
        )
        assert response.status_code == 200
        assert response.get_json()['role'] == 'editor'


class TestUserDelete:
    """Tests for deleting users."""
    
    def test_delete_user_as_admin(self, client, admin_headers, db_session):
        """Test deleting user as admin."""
        from backend.models import User
        from backend.utils.auth import hash_password
        
        # Create a user to delete
        user = User(
            email='todelete@example.com',
            password_hash=hash_password('Password123'),
            name='To Delete',
            role='viewer'
        )
        db_session.add(user)
        db_session.commit()
        user_id = user.id
        
        # Delete
        response = client.delete(f'/api/users/{user_id}', headers=admin_headers)
        assert response.status_code == 200
