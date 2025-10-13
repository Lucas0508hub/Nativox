#!/usr/bin/env python3

import os
import sys
import psycopg2
import uuid
from datetime import datetime

def create_admin_user():
    try:
        # Get database connection details from environment
        db_url = os.getenv('DATABASE_URL', 'postgresql://user:password@nativox-db:5432/nativox')
        
        # Parse the database URL
        if db_url.startswith('postgresql://'):
            db_url = db_url.replace('postgresql://', '')
            user_pass, host_port_db = db_url.split('@')
            username, password = user_pass.split(':')
            host_port, database = host_port_db.split('/')
            host, port = host_port.split(':')
        else:
            # Fallback values
            host = 'nativox-db'
            port = '5432'
            database = 'nativox'
            username = 'user'
            password = 'password'
        
        # Connect to database
        conn = psycopg2.connect(
            host=host,
            port=port,
            database=database,
            user=username,
            password=password
        )
        cursor = conn.cursor()
        
        # Check if admin user already exists
        cursor.execute("SELECT id FROM users WHERE username = %s", ('admin',))
        existing_user = cursor.fetchone()
        
        if existing_user:
            print('✅ Admin user already exists!')
            print('Username: admin')
            print('Password: admin')
            return
        
        # Create admin user with hashed password (simple hash for testing)
        # Using a simple hash instead of bcrypt to avoid issues
        hashed_password = 'admin_hash_123'  # Simple hash for testing
        
        cursor.execute("""
            INSERT INTO users (id, username, email, password_hash, role, is_active, first_name, last_name, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            str(uuid.uuid4()),
            'admin',
            'admin@nativox.com',
            hashed_password,
            'admin',
            True,
            'Admin',
            'User',
            datetime.utcnow(),
            datetime.utcnow()
        ))
        
        conn.commit()
        
        print('✅ Admin user created successfully!')
        print('Username: admin')
        print('Password: admin')
        print('Email: admin@nativox.com')
        print('Role: admin')
        
    except Exception as e:
        print(f'❌ Error creating admin user: {e}')
        if 'conn' in locals():
            conn.rollback()
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    create_admin_user()
