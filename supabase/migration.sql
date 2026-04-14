-- AceTec Website v8 — Supabase Database Migration
-- Run this in Supabase SQL Editor to set up all tables

-- Enable pgvector extension for RAG embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- RAG: Document chunks for knowledge base
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,           -- 'product', 'company', 'history', 'partner'
  source_id TEXT NOT NULL,        -- e.g., 'military', 'about'
  title TEXT NOT NULL,
  content TEXT NOT NULL,          -- the actual text chunk
  metadata JSONB DEFAULT '{}',   -- category, partner, specs, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector embeddings for RAG retrieval
CREATE TABLE IF NOT EXISTS document_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  embedding VECTOR(1536),        -- OpenAI text-embedding-3-small dimension
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast similarity search
CREATE INDEX IF NOT EXISTS idx_document_embeddings_vector
  ON document_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================
-- Chat: Sessions and messages
-- ============================================
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id TEXT,               -- anonymous fingerprint or cookie
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  message_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  sources JSONB DEFAULT '[]',    -- RAG source references
  token_count INTEGER,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Contact form submissions
-- ============================================
CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  newsletter_opt_in BOOLEAN DEFAULT FALSE,
  source_page TEXT,              -- which page the form was on
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Chat feedback (thumbs up/down)
-- ============================================
CREATE TABLE IF NOT EXISTS chat_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  rating TEXT CHECK (rating IN ('positive', 'negative')),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Row Level Security (RLS)
-- ============================================
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_feedback ENABLE ROW LEVEL SECURITY;

-- Public read for documents (RAG retrieval via service role key)
CREATE POLICY "Documents readable by service role" ON documents
  FOR SELECT USING (true);
CREATE POLICY "Embeddings readable by service role" ON document_embeddings
  FOR SELECT USING (true);

-- Insert policies for anonymous visitors
CREATE POLICY "Anyone can create chat sessions" ON chat_sessions
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert chat messages" ON chat_messages
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can submit contact forms" ON contact_submissions
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can submit feedback" ON chat_feedback
  FOR INSERT WITH CHECK (true);

-- ============================================
-- RPC: Vector similarity search for RAG
-- ============================================
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.title,
    d.content,
    d.metadata,
    1 - (de.embedding <=> query_embedding) AS similarity
  FROM document_embeddings de
  JOIN documents d ON d.id = de.document_id
  WHERE 1 - (de.embedding <=> query_embedding) > match_threshold
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
