"""Management script for Flask application."""
import os
import sys

# Add the project root to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask.cli import FlaskGroup
from backend.app import create_app
from backend.extensions import db

app = create_app()
cli = FlaskGroup(create_app=create_app)


@cli.command('init_db')
def init_db():
    """Initialize the database."""
    with app.app_context():
        db.create_all()
        print('Database initialized.')


@cli.command('drop_db')
def drop_db():
    """Drop all database tables."""
    with app.app_context():
        db.drop_all()
        print('Database dropped.')


if __name__ == '__main__':
    cli()
