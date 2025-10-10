-- Initialize the Nativox database
-- This script runs when the PostgreSQL container starts for the first time

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Note: Tables will be created by Drizzle ORM when the application starts
-- The following commands will be executed by the application after schema creation

-- Grant necessary permissions (for future tables)
-- These will apply to tables created later
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO nativox;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO nativox;
