"""Tests for authentication API."""
import pytest


class TestRegister:
    """Tests for user registration."""
    
    def test_register_success(self, client):
        """Test successful registration."""
        response = client.post('/api/auth/register', json={
            'email': 'newuser@example.com',
            'password': 'SecurePass123',
            'name': 'New User'
        })
        assert response.status_code == 201
        data = response.get_json()
        assert 'access_token' in data
        assert 'refresh_token' in data
        assert data['user']['email'] == 'newuser@example.com'
    
    def test_register_missing_email(self, client):
        """Test registration without email."""
        response = client.post('/api/auth/register', json={
            'password': 'SecurePass123',
            'name': 'New User'
        })
        assert response.status_code == 400
    
    def test_register_short_password(self, client):
        """Test registration with short password."""
        response = client.post('/api/auth/register', json={
            'email': 'test@example.com',
            'password': 'short',
            'name': 'Test'
        })
        assert response.status_code == 400
    
    def test_register_duplicate_email(self, client):
        """Test registration with existing email."""
        # First registration
        client.post('/api/auth/register', json={
            'email': 'duplicate@example.com',
            'password': 'SecurePass123',
            'name': 'First User'
        })
        # Second registration with same email
        response = client.post('/api/auth/register', json={
            'email': 'duplicate@example.com',
            'password': 'SecurePass123',
            'name': 'Second User'
        })
        assert response.status_code == 409


class TestLogin:
    """Tests for user login."""
    
    def test_login_success(self, client):
        """Test successful login."""
        # Register first
        client.post('/api/auth/register', json={
            'email': 'login@example.com',
            'password': 'SecurePass123',
            'name': 'Login User'
        })
        # Login
        response = client.post('/api/auth/login', json={
            'email': 'login@example.com',
            'password': 'SecurePass123'
        })
        assert response.status_code == 200
        data = response.get_json()
        assert 'access_token' in data
    
    def test_login_wrong_password(self, client):
        """Test login with wrong password."""
        # Register first
        client.post('/api/auth/register', json={
            'email': 'wrongpass@example.com',
            'password': 'SecurePass123',
            'name': 'Test User'
        })
        # Login with wrong password
        response = client.post('/api/auth/login', json={
            'email': 'wrongpass@example.com',
            'password': 'WrongPassword'
        })
        assert response.status_code == 401
    
    def test_login_nonexistent_user(self, client):
        """Test login with non-existent user."""
        response = client.post('/api/auth/login', json={
            'email': 'nonexistent@example.com',
            'password': 'SomePassword123'
        })
        assert response.status_code == 401


class TestTokenRefresh:
    """Tests for token refresh."""
    
    def test_refresh_token_success(self, client):
        """Test successful token refresh."""
        # Register and get tokens
        response = client.post('/api/auth/register', json={
            'email': 'refresh@example.com',
            'password': 'SecurePass123',
            'name': 'Refresh User'
        })
        refresh_token = response.get_json()['refresh_token']
        
        # Refresh token
        response = client.post('/api/auth/refresh', json={
            'refresh_token': refresh_token
        })
        assert response.status_code == 200
        assert 'access_token' in response.get_json()
    
    def test_refresh_invalid_token(self, client):
        """Test refresh with invalid token."""
        response = client.post('/api/auth/refresh', json={
            'refresh_token': 'invalid_token'
        })
        assert response.status_code == 401


class TestGetCurrentUser:
    """Tests for getting current user."""
    
    def test_get_me_authenticated(self, client, auth_headers):
        """Test getting current user when authenticated."""
        response = client.get('/api/auth/me', headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert 'user' in data
        assert data['user']['email'] == 'test@example.com'
    
    def test_get_me_unauthenticated(self, client):
        """Test getting current user without authentication."""
        response = client.get('/api/auth/me')
        assert response.status_code == 401
