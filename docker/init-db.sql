-- Initial database setup script for ClientSphere PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Log confirmation
DO $$
BEGIN
   RAISE NOTICE 'ClientSphere database extensions initialized successfully.';
END $$;
