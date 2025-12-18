"""Pytest configuration and fixtures."""
import pytest
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import create_app
from backend.extensions import db


@pytest.fixture
def app():
    """Create application for testing."""
    app = create_app('testing')
    
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def db_session(app):
    """Create database session for testing."""
    with app.app_context():
        yield db.session


@pytest.fixture
def auth_headers(client):
    """Create authenticated user and return headers with token."""
    # Register a test user
    response = client.post('/api/auth/register', json={
        'email': 'test@example.com',
        'password': 'TestPassword123',
        'name': 'Test User'
    })
    data = response.get_json()
    token = data.get('access_token')
    return {'Authorization': f'Bearer {token}'}


@pytest.fixture
def admin_headers(client, db_session):
    """Create admin user and return headers with token."""
    from backend.models import User
    from backend.utils.auth import hash_password, generate_access_token
    
    # Create admin user directly
    admin = User(
        email='admin@example.com',
        password_hash=hash_password('AdminPassword123'),
        name='Admin User',
        role='admin'
    )
    db_session.add(admin)
    db_session.commit()
    
    token = generate_access_token(admin.id, admin.email, admin.role)
    return {'Authorization': f'Bearer {token}'}
