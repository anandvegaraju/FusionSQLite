-- SQL script to create the users and connections tables for the PWA backend

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Connections table
CREATE TABLE IF NOT EXISTS connections (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(2048) NOT NULL, -- Increased length for URLs
    fusion_username VARCHAR(255) NOT NULL,
    encrypted_fusion_password VARCHAR(512) NOT NULL, -- Increased length for encrypted data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Optional: Function to update 'updated_at' timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Optional: Triggers to automatically update 'updated_at' on users table update
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Optional: Triggers to automatically update 'updated_at' on connections table update
CREATE TRIGGER update_connections_updated_at
BEFORE UPDATE ON connections
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_connections_user_id ON connections(user_id);

COMMENT ON TABLE users IS 'Stores user accounts for the PWA.';
COMMENT ON COLUMN users.id IS 'Unique identifier for the user.';
COMMENT ON COLUMN users.username IS 'User-chosen unique username.';
COMMENT ON COLUMN users.email IS 'User-chosen unique email, used for login.';
COMMENT ON COLUMN users.password_hash IS 'Hashed password for the user.';

COMMENT ON TABLE connections IS 'Stores Oracle Fusion connection details for users.';
COMMENT ON COLUMN connections.id IS 'Unique identifier for the connection entry.';
COMMENT ON COLUMN connections.user_id IS 'Foreign key referencing the user who owns this connection.';
COMMENT ON COLUMN connections.name IS 'User-defined alias for the connection.';
COMMENT ON COLUMN connections.url IS 'URL of the Oracle Fusion instance.';
COMMENT ON COLUMN connections.fusion_username IS 'Username for the Oracle Fusion instance.';
COMMENT ON COLUMN connections.encrypted_fusion_password IS 'Encrypted password for the Oracle Fusion instance.';

-- Example of how to use the tables (for reference, not part of the schema itself)
/*
-- Register a new user (password hashing would happen in the app)
INSERT INTO users (username, email, password_hash) VALUES ('testuser', 'test@example.com', 'some_hashed_password');

-- Add a connection for that user (password encryption would happen in the app)
INSERT INTO connections (user_id, name, url, fusion_username, encrypted_fusion_password)
VALUES (1, 'My Fusion Test Instance', 'https://fusion.example.com', 'fusion_user', 'some_encrypted_password');
*/
