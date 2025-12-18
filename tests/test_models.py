"""Tests for database models."""
import pytest
from datetime import datetime


class TestUserModel:
    """Tests for User model."""
    
    def test_create_user(self, db_session):
        """Test creating user."""
        from backend.models import User
        from backend.utils.auth import hash_password
        
        user = User(
            email='model@example.com',
            password_hash=hash_password('Password123'),
            name='Model Test',
            role='viewer'
        )
        db_session.add(user)
        db_session.commit()
        
        assert user.id is not None
        assert user.email == 'model@example.com'
        assert user.created_at is not None
    
    def test_user_to_dict(self, db_session):
        """Test user serialization."""
        from backend.models import User
        from backend.utils.auth import hash_password
        
        user = User(
            email='serialize@example.com',
            password_hash=hash_password('Password123'),
            name='Serialize Test',
            role='editor'
        )
        db_session.add(user)
        db_session.commit()
        
        data = user.to_dict()
        assert 'id' in data
        assert 'email' in data
        assert 'password_hash' not in data  # Should not expose password


class TestStorageModel:
    """Tests for Storage model."""
    
    def test_create_storage(self, db_session):
        """Test creating storage."""
        from backend.models import Storage, User
        from backend.utils.auth import hash_password
        
        user = User(
            email='storage_owner@example.com',
            password_hash=hash_password('Password123'),
            name='Storage Owner',
            role='viewer'
        )
        db_session.add(user)
        db_session.commit()
        
        storage = Storage(
            name='Test Storage',
            description='Test description',
            user_id=user.id
        )
        db_session.add(storage)
        db_session.commit()
        
        assert storage.id is not None
        assert storage.name == 'Test Storage'


class TestDocumentModel:
    """Tests for Document model."""
    
    def test_create_document(self, db_session):
        """Test creating document."""
        from backend.models import Document, Storage, User
        from backend.utils.auth import hash_password
        
        user = User(
            email='doc_owner@example.com',
            password_hash=hash_password('Password123'),
            name='Doc Owner',
            role='viewer'
        )
        db_session.add(user)
        db_session.commit()
        
        storage = Storage(
            name='Doc Storage',
            user_id=user.id
        )
        db_session.add(storage)
        db_session.commit()
        
        document = Document(
            name='test.txt',
            mime_type='text/plain',
            size=100,
            storage_id=storage.id,
            user_id=user.id
        )
        db_session.add(document)
        db_session.commit()
        
        assert document.id is not None
        assert document.name == 'test.txt'
    
    def test_document_soft_delete(self, db_session):
        """Test document soft delete."""
        from backend.models import Document, Storage, User
        from backend.utils.auth import hash_password
        
        user = User(
            email='soft_delete@example.com',
            password_hash=hash_password('Password123'),
            name='Soft Delete',
            role='viewer'
        )
        db_session.add(user)
        db_session.commit()
        
        storage = Storage(name='Soft Delete Storage', user_id=user.id)
        db_session.add(storage)
        db_session.commit()
        
        document = Document(
            name='soft_delete.txt',
            mime_type='text/plain',
            size=50,
            storage_id=storage.id,
            user_id=user.id
        )
        db_session.add(document)
        db_session.commit()
        
        # Soft delete
        document.deleted_at = datetime.utcnow()
        db_session.commit()
        
        assert document.deleted_at is not None


class TestTagModel:
    """Tests for Tag model."""
    
    def test_create_tag(self, db_session):
        """Test creating tag."""
        from backend.models import Tag, User
        from backend.utils.auth import hash_password
        
        user = User(
            email='tag_owner@example.com',
            password_hash=hash_password('Password123'),
            name='Tag Owner',
            role='viewer'
        )
        db_session.add(user)
        db_session.commit()
        
        tag = Tag(
            name='important',
            color='#ff0000',
            user_id=user.id
        )
        db_session.add(tag)
        db_session.commit()
        
        assert tag.id is not None
        assert tag.name == 'important'


class TestFolderModel:
    """Tests for Folder model."""
    
    def test_create_folder(self, db_session):
        """Test creating folder."""
        from backend.models import Folder, Storage, User
        from backend.utils.auth import hash_password
        
        user = User(
            email='folder_owner@example.com',
            password_hash=hash_password('Password123'),
            name='Folder Owner',
            role='viewer'
        )
        db_session.add(user)
        db_session.commit()
        
        storage = Storage(name='Folder Storage', user_id=user.id)
        db_session.add(storage)
        db_session.commit()
        
        folder = Folder(
            name='Test Folder',
            storage_id=storage.id,
            user_id=user.id
        )
        db_session.add(folder)
        db_session.commit()
        
        assert folder.id is not None
        assert folder.name == 'Test Folder'
    
    def test_nested_folders(self, db_session):
        """Test nested folder structure."""
        from backend.models import Folder, Storage, User
        from backend.utils.auth import hash_password
        
        user = User(
            email='nested_owner@example.com',
            password_hash=hash_password('Password123'),
            name='Nested Owner',
            role='viewer'
        )
        db_session.add(user)
        db_session.commit()
        
        storage = Storage(name='Nested Storage', user_id=user.id)
        db_session.add(storage)
        db_session.commit()
        
        parent = Folder(
            name='Parent',
            storage_id=storage.id,
            user_id=user.id
        )
        db_session.add(parent)
        db_session.commit()
        
        child = Folder(
            name='Child',
            storage_id=storage.id,
            user_id=user.id,
            parent_id=parent.id
        )
        db_session.add(child)
        db_session.commit()
        
        assert child.parent_id == parent.id
