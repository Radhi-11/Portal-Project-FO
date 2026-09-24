-- Database initialization script for production
-- This runs automatically when the PostgreSQL container starts

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- The schema will be loaded from schema.sql by the application on startup
-- This file is mounted into /docker-entrypoint-initdb.d/

-- Create the database (already created by POSTGRES_DB env var)
-- Schema loading happens via backend startup
