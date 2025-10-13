#!/usr/bin/env python3

import os
import sys
import psycopg2

def create_default_languages():
    try:
        # Get database connection details from environment
        db_url = os.getenv('DATABASE_URL', 'postgresql://user:password@nativox-db:5432/nativox')
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()

        # Check if languages already exist
        cursor.execute("SELECT COUNT(*) FROM languages")
        count = cursor.fetchone()[0]
        
        if count > 0:
            print('✅ Languages already exist!')
            cursor.execute("SELECT id, name, code FROM languages")
            languages = cursor.fetchall()
            for lang in languages:
                print(f'  - {lang[1]} ({lang[2]}) - ID: {lang[0]}')
            return

        # Create default languages
        default_languages = [
            ('English', 'en'),
            ('Spanish', 'es'),
            ('Portuguese', 'pt'),
            ('French', 'fr'),
            ('German', 'de'),
            ('Italian', 'it'),
            ('Chinese', 'zh'),
            ('Japanese', 'ja'),
            ('Korean', 'ko'),
            ('Arabic', 'ar'),
            ('Russian', 'ru'),
            ('Hindi', 'hi'),
        ]

        for name, code in default_languages:
            cursor.execute("""
                INSERT INTO languages (name, code, is_active, created_at)
                VALUES (%s, %s, %s, NOW())
            """, (name, code, True))

        conn.commit()

        print('✅ Default languages created successfully!')
        for name, code in default_languages:
            print(f'  - {name} ({code})')

    except Exception as e:
        print(f'❌ Error creating default languages: {e}')
        if 'conn' in locals() and conn:
            conn.rollback()
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conn' in locals() and conn:
            conn.close()

if __name__ == "__main__":
    create_default_languages()
