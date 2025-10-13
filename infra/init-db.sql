-- Initialize Nativox database
-- This script runs when the PostgreSQL container starts for the first time

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- The database and user are already created by the container environment variables
-- This file can be used for any additional initialization if needed
