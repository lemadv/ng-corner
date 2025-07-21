-- Initialize PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable row-level security
-- This provides an additional layer of security for multi-tenant applications