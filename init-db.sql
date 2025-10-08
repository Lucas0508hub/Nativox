-- Initialize the Nativox database with default languages
-- This script runs when the PostgreSQL container starts for the first time

-- Create the database if it doesn't exist (handled by POSTGRES_DB env var)
-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Insert default languages
INSERT INTO languages (code, name, is_active) VALUES 
('en', 'English', true),
('pt', 'Portuguese', true),
('es', 'Spanish', true),
('fr', 'French', true),
('de', 'German', true),
('it', 'Italian', true),
('ru', 'Russian', true),
('ja', 'Japanese', true),
('ko', 'Korean', true),
('zh', 'Chinese', true)
ON CONFLICT (code) DO NOTHING;

-- Create a default admin user for development
INSERT INTO users (id, email, first_name, last_name, role, is_active) VALUES 
('admin-001', 'admin@nativox.local', 'Admin', 'User', 'manager', true)
ON CONFLICT (id) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_segments_project_id ON segments(project_id);
CREATE INDEX IF NOT EXISTS idx_segments_folder_id ON segments(folder_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_project_id ON folders(project_id);
CREATE INDEX IF NOT EXISTS idx_user_projects_user_id ON user_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_user_projects_project_id ON user_projects(project_id);

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO nativox;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO nativox;
