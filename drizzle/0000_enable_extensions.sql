-- Extensions required by the schema (docs/03 §7: pgvector for RAG embeddings).
-- Supabase installs extensions into the `extensions` schema, which is on the
-- default search_path; plain Postgres falls back to `public`.
CREATE SCHEMA IF NOT EXISTS "extensions";
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
